from fastapi import APIRouter, Query, HTTPException, status
from typing import Optional
from app.services.spectrum_service import SpectrumService
from app.schemas.spectrum import SpectrumData, SpectrumCompareResponse, SpectrumFitsResponse

router = APIRouter()

@router.get("/{planet}/compare", response_model=SpectrumCompareResponse, summary="多仪器/多波段光谱横向对比")
async def compare_planet_spectra(planet: str):
    """
    提供给前端层级三（光谱画廊）的多图滑动并排浏览：
    - 同时返回 NIRISS SOSS (0.8~2.8μm)、NIRSpec G395H (2.8~5.2μm)、MIRI LRS (5~12μm) 真实观测数据。
    """
    data = await SpectrumService.compare_spectra(planet)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到目标 '{planet}' 的多仪器光谱对比数据（推荐测试：K2-18 b）"
        )
    return data

@router.get("/{planet}/fits", response_model=SpectrumFitsResponse, summary="科学争议拟合模型与置信区间")
async def get_spectrum_fits(planet: str):
    """
    提供给前端争议模拟器的核心接口（置信度滑块）：
    - 返回不同团队的拟合曲线 (`fit_line`) 与置信区间 (`confidence_interval`)
    - 涵盖生物标志物 (DMS) 假设 vs 非生物 (Abiotic) 假设。
    """
    data = await SpectrumService.get_fit_models(planet)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到目标 '{planet}' 的理论拟合模型（推荐测试：K2-18 b）"
        )
    return data

@router.get("/{planet}", response_model=SpectrumData, summary="获取单仪器高精度光谱散点与误差")
async def get_single_spectrum(
    planet: str,
    instrument: str = Query(
        "NIRISS_SOSS",
        description="仪器名称: NIRISS_SOSS, NIRSpec_G395H, MIRI_LRS"
    )
):
    """
    获取指定仪器的光谱原始数据点与误差棒，支持前端开启/关闭误差棒显示。
    """
    data = await SpectrumService.get_planet_spectrum(planet, instrument)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到目标 '{planet}' 使用仪器 '{instrument}' 的观测数据。"
        )
    return data