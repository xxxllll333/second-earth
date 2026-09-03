from pydantic import BaseModel, Field
from typing import List, Optional

class TimelineEvent(BaseModel):
    """时间轴关键天体历史事件锚点"""
    time_gyr: float = Field(..., description="事件发生时间 (亿年 / Gyr)")
    title: str = Field(..., description="事件名称")
    description: str = Field(..., description="科学事件详情")
    event_type: str = Field(..., description="类型: 'habitable_start' | 'habitable_end' | 'red_giant' | 'white_dwarf'")
    icon_type: str = Field(..., description="UI 图标类型: 'life' | 'warning' | 'danger' | 'relic'")

class HabitableWindow(BaseModel):
    """行星表面允许液态水存在的宜居窗口期"""
    start_time_gyr: float = Field(..., description="宜居期起始 (Gyr)")
    end_time_gyr: float = Field(..., description="宜居期终结 (Gyr)")
    peak_habitability_time_gyr: float = Field(..., description="最优宜居时刻 (Gyr)")
    description: str = Field(..., description="宜居窗口描述")

class StarEvolutionState(BaseModel):
    """母恒星演化序列（供 Three.js 粒子着色器平滑插值）"""
    time_gyr: List[float] = Field(..., description="时间点数组 (Gyr)")
    radius_solar: List[float] = Field(..., description="恒星半径序列 (R☉, 表现红巨星膨胀与白矮星坍缩)")
    temperature_k: List[float] = Field(..., description="恒星表面有效温度 (K)")
    phase_label: List[str] = Field(..., description="恒星当前阶段: '主序星' | '红巨星' | '行星状星云' | '白矮星'")
    color_hex: List[str] = Field(..., description="恒星核心渲染颜色 (Hex, 从亮黄 #FFE082 -> 猩红 #FF3D00 -> 蓝白 #E0F7FA)")

class PlanetEvolutionState(BaseModel):
    """行星演化追踪序列（供 D3.js 绘制参数折线）"""
    time_gyr: List[float] = Field(..., description="时间点数组 (Gyr)")
    temperature_k: List[float] = Field(..., description="行星表面平衡温度 (K)")
    atmosphere_state: List[str] = Field(..., description="大气状态描述，如 '温和富水' | '失控温室' | '大气被剥离' | '冻结冰壳'")
    habitability_index: List[float] = Field(..., description="宜居度得分 (0.0 ~ 1.0)")
    orbital_radius_au: List[float] = Field(..., description="轨道半径演化 (AU)")

class EvolutionResponse(BaseModel):
    """层级四完整响应体"""
    planet_name: str = Field(..., description="行星名称")
    host_star_name: str = Field(..., description="母恒星名称")
    total_timespan_gyr: float = Field(..., description="时间轴总跨度 (亿年)")
    habitable_window: HabitableWindow
    events: List[TimelineEvent]
    star_evolution: StarEvolutionState
    planet_evolution: PlanetEvolutionState