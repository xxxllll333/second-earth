# 文件路径：app/api/v1/endpoints/planets.py
from fastapi import APIRouter, Query, HTTPException, status
from typing import Optional
from app.services.planet_service import PlanetService
from app.schemas.planet import PlanetListResponse, PlanetBase

router = APIRouter()

@router.get("", response_model=PlanetListResponse, summary="获取行星列表（支持筛选与分页）")
async def get_planets(
    filter_type: Optional[str] = Query(
        None, 
        alias="filter",
        description="筛选类型: habitable (潜在宜居), rejected (已否决), spectrum (有光谱数据)"
    ),
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页条数")
):
    """
    提供给前端星表总览（全景层）与筛选器的数据接口。
    """
    return await PlanetService.get_planets(filter_type=filter_type, page=page, limit=limit)

@router.get("/{name}", response_model=PlanetBase, summary="根据名称获取单颗行星详情")
async def get_planet_detail(name: str):
    """
    根据行星名称（例如 'K2-18 b' 或 'TRAPPIST-1 e'）获取详细参数。
    """
    planet = await PlanetService.get_planet_by_name(name)
    if not planet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到行星：'{name}'"
        )
    return planet