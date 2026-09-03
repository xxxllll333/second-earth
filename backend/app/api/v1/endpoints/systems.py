from fastapi import APIRouter, HTTPException, status
from app.services.system_service import SystemService
from app.schemas.system import SystemDetailResponse

router = APIRouter()

@router.get("/{star_name}", response_model=SystemDetailResponse, summary="获取指定恒星系统及旗下所有行星轨道参数")
async def get_system_detail(star_name: str):
    """
    提供给前端层级二（星系视图）的核心接口。
    
    - **star**: 母恒星质量、光度、有效温度、距离等
    - **habitable_zone**: 恒星系统宜居带内外边缘范围 (AU)
    - **planets**: 旗下所有行星的半长轴、偏心率、周期、通量以及六维雷达图指标 (radar_metrics)
    """
    system_data = await SystemService.get_system_by_star(star_name)
    if not system_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到恒星系统: '{star_name}'。支持检索的代表系统有: TRAPPIST-1, K2-18"
        )
    return system_data