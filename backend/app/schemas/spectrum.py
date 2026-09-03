from pydantic import BaseModel, Field
from typing import Optional, List

class SpectrumData(BaseModel):
    """单仪器/单次观测光谱散点数据"""
    planet_name: str = Field(..., description="行星名称，如 'K2-18 b'")
    instrument: str = Field(..., description="观测仪器，如 'NIRISS_SOSS', 'NIRSpec_G395H', 'MIRI_LRS'")
    wavelength_unit: str = Field(default="μm", description="波长单位")
    flux_unit: str = Field(default="ppm", description="凌星深度单位 (ppm, 即 (Rp/R*)^2)")
    
    wavelength: List[float] = Field(..., description="波长数组 (x轴)")
    flux: List[float] = Field(..., description="观测通量/凌星深度 (y轴散点)")
    flux_error: List[float] = Field(..., description="观测误差 (用于渲染上下误差棒)")
    
    observation_date: str = Field(..., description="观测日期，如 '2024-01-26'")
    program_id: str = Field(..., description="JWST 观测程序 ID，如 'GO 2722'")
    citation: str = Field(..., description="数据来源/论文引用")
    doi: Optional[str] = Field(None, description="论文 DOI 链接")

class SpectrumCompareResponse(BaseModel):
    """多仪器光谱横向对比响应体"""
    planet_name: str
    spectra_count: int
    instruments: List[str]
    items: List[SpectrumData]

class FitCurveModel(BaseModel):
    """科研团队的理论拟合模型"""
    team_name: str = Field(..., description="团队名称，如 'Team A (Madhusudhan et al.)'")
    model_type: str = Field(..., description="模型属性: 'biosignature' (有生命/DMS富集) | 'abiotic' (无生命/非生物纯甲烷) | 'flat' (无特征/无大气)")
    model_label: str = Field(..., description="展示标题")
    confidence_level: float = Field(..., description="拟合置信度 (0.0 ~ 1.0, 对应置信度阈值滑块)")
    is_biosignature: bool = Field(..., description="是否包含生物标志物分子")
    
    wavelength: List[float] = Field(..., description="拟合波长密集采样网格")
    fit_line: List[float] = Field(..., description="理论拟合曲线 (平滑线)")
    confidence_interval: List[List[float]] = Field(
        ...,
        description="置信区间带 [[lower_bound, upper_bound], ...] (用于绘制半透明误差包络)"
    )
    
    key_molecules: List[str] = Field(..., description="检测/假设包含的关键分子，如 ['CH4', 'CO2', 'DMS']")
    description: str = Field(..., description="科学解释")
    citation: str = Field(..., description="对应论文")
    doi: Optional[str] = Field(None, description="DOI 链接")

class SpectrumFitsResponse(BaseModel):
    """拟合曲线与争议模型对比响应体"""
    planet_name: str
    dispute_topic: str = Field(..., description="科学争议焦点简述")
    models: List[FitCurveModel]