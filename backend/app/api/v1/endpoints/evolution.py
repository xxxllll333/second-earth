from fastapi import APIRouter, Query, HTTPException, status
from app.services.evolution_service import EvolutionService
from app.schemas.evolution import EvolutionResponse

router = APIRouter()

@router.get("/{planet}", response_model=EvolutionResponse, summary="获取行星与母恒星 0~100 亿年演化全景数据")
async def get_evolution_timeline(
    planet: str,
    time_points: int = Query(
        100,
        ge=20,
        le=500,
        description="时间采样点数 (建议 100 点，提供顺滑的 60fps 时间轴拖动表现)"
    )
):
    """
    提供给前端层级四（恒星生命卷轴）的核心数据接口：
    
    - **star_evolution**: 恒星在各时间点的半径膨胀比例、有效温度、演化阶段与着色器颜色代码 (`color_hex`)。
    - **planet_evolution**: 行星表面温度、大气变迁描述及宜居得分变化曲线。
    - **habitable_window**: 高亮标注的宜居窗口期起止时刻。
    - **events**: 锚定在时间轴上的关键重大天体事件（包含 WD 1856b 幸存白矮星状态）。
    """
    data = await EvolutionService.generate_evolution_data(planet_name=planet, time_points=time_points)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到行星 '{planet}' 的演化数据。"
        )
    return data