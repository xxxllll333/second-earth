# 文件路径：app/schemas/planet.py
from pydantic import BaseModel, Field
from typing import Optional, List

class PlanetBase(BaseModel):
    pl_name: str = Field(..., description="行星标准名称，如 'K2-18 b'")
    hostname: str = Field(..., description="宿主恒星名称")
    radius: float = Field(..., description="行星半径 (以地球半径 R⊕ 为单位)")
    mass: Optional[float] = Field(None, description="行星质量 (以地球质量 M⊕ 为单位)")
    temperature: Optional[float] = Field(None, description="平衡温度 (开尔文 K)")
    orbital_period: Optional[float] = Field(None, description="公转周期 (天)")
    distance: Optional[float] = Field(None, description="距地球距离 (光年 ly)")
    discovery_year: int = Field(..., description="发现年份")
    has_spectrum: bool = Field(False, description="是否有 JWST/高精度光谱数据")
    status: str = Field(..., description="状态: habitable(潜在宜居) | confirmed(已确认) | rejected(已否决)")
    color_code: Optional[str] = Field(None, description="伪色分类标识")
    description: Optional[str] = Field(None, description="科学背景简述")

class PlanetListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[PlanetBase]