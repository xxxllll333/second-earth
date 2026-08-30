from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class StarHostInfo(BaseModel):
    """母恒星物理参数"""
    name: str = Field(..., description="恒星名称，如 'TRAPPIST-1'")
    spectral_type: str = Field(..., description="光谱类型，如 'M8V (超低温红矮星)'")
    mass: float = Field(..., description="质量 (太阳质量 M☉)")
    radius: float = Field(..., description="半径 (太阳半径 R☉)")
    temperature: float = Field(..., description="有效表面温度 (K)")
    luminosity: float = Field(..., description="光度 (太阳光度 L☉)")
    distance: float = Field(..., description="距地球距离 (光年 ly)")
    age: Optional[float] = Field(None, description="恒星年龄 (亿年 / Gyr)")
    ra: Optional[float] = Field(None, description="赤经 Right Ascension (deg)")
    dec: Optional[float] = Field(None, description="赤纬 Declination (deg)")

class PlanetOrbitInfo(BaseModel):
    """行星物理与轨道详细参数（用于轨道渲染与雷达图）"""
    pl_name: str = Field(..., description="行星名称，如 'TRAPPIST-1 e'")
    letter: str = Field(..., description="行星代号，如 'b', 'c', 'd', 'e'...")
    radius: float = Field(..., description="行星半径 (地球半径 R⊕)")
    mass: Optional[float] = Field(None, description="行星质量 (地球质量 M⊕)")
    density: Optional[float] = Field(None, description="密度 (g/cm³)")
    
    # 核心轨道渲染参数
    semi_major_axis: float = Field(..., description="轨道半长轴 (天文单位 AU)")
    orbital_period: float = Field(..., description="公转周期 (地球日 days)")
    eccentricity: float = Field(default=0.0, description="轨道偏心率 (0=正圆)")
    inclination: Optional[float] = Field(None, description="轨道倾角 (deg)")
    
    # 宜居性与辐射参数
    insolation_flux: float = Field(..., description="辐射通量 (地球通量 S⊕)")
    temperature: float = Field(..., description="平衡温度 (开尔文 K)")
    status: str = Field(..., description="状态: habitable(潜在宜居) | confirmed(已确认) | rejected(已否决)")
    rejection_reason: Optional[str] = Field(None, description="否决原因（若已否决）")
    rejection_paper_url: Optional[str] = Field(None, description="否决论证论文 DOI / 链接")
    
    # 视觉表现与前端雷达图
    color_code: str = Field(..., description="伪色分类: blue-green, gray, ice-blue 等")
    has_spectrum: bool = Field(False, description="是否有 JWST/高精度光谱数据")
    
    # 六维参数雷达图 (0~100 归一化数据，方便 D3.js 快速重叠渲染)
    radar_metrics: Dict[str, float] = Field(
        ...,
        description="六维雷达指标: radius, mass, temperature, insolation_flux, orbital_period, habitability_index"
    )

class SystemDetailResponse(BaseModel):
    """星系视图完整响应体"""
    star: StarHostInfo
    planets_count: int
    habitable_zone_inner_au: float = Field(..., description="恒星宜居带内界 (AU)")
    habitable_zone_outer_au: float = Field(..., description="恒星宜居带外界 (AU)")
    planets: List[PlanetOrbitInfo]