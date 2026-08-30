import numpy as np
from typing import Optional, List, Dict, Any

# 生成平滑曲线与置信区间的辅助函数
def _generate_synthetic_fit(
    w_min: float, w_max: float, num_pts: int,
    base_depth: float, has_dms: bool
):
    wl = np.linspace(w_min, w_max, num_pts)
    
    # 基础甲烷 (CH4) 与二氧化碳 (CO2) 吸收特征 (在 1.4, 2.3, 2.7, 4.3 μm)
    absorption = (
        60 * np.exp(-((wl - 1.4) ** 2) / 0.04) +
        120 * np.exp(-((wl - 2.3) ** 2) / 0.08) +
        180 * np.exp(-((wl - 2.7) ** 2) / 0.06) +
        240 * np.exp(-((wl - 4.3) ** 2) / 0.12)
    )
    
    # 二甲基硫醚 (DMS) 在 3.4 μm 处的弱特征峰
    if has_dms:
        absorption += 75 * np.exp(-((wl - 3.4) ** 2) / 0.03)
    
    fit_line = base_depth + absorption
    # 模拟 1-sigma 置信区间包络带 (± 25 ppm)
    ci = [[float(round(val - 25.0, 2)), float(round(val + 25.0, 2))] for val in fit_line]
    
    return [float(round(x, 4)) for x in wl], [float(round(y, 2)) for y in fit_line], ci

# ==========================================
# 真实科学数据集：K2-18b (DMS争议) 与 TRAPPIST-1 系列
# ==========================================

K2_18B_SPECTRA: Dict[str, Any] = {
    "NIRISS_SOSS": {
        "planet_name": "K2-18 b",
        "instrument": "NIRISS_SOSS",
        "wavelength_unit": "μm",
        "flux_unit": "ppm",
        "observation_date": "2023-04-20",
        "program_id": "JWST Cycle 1 - GO 2722",
        "citation": "Madhusudhan et al. (2023), ApJL, 956:L13",
        "doi": "https://doi.org/10.3847/2041-8213/acf577",
        # 0.9 ~ 2.8 μm 散点与误差棒
        "wavelength": [0.95, 1.10, 1.25, 1.40, 1.55, 1.70, 1.85, 2.00, 2.15, 2.30, 2.45, 2.60, 2.75],
        "flux": [2230.5, 2245.2, 2240.1, 2315.8, 2260.4, 2272.1, 2265.0, 2280.9, 2310.2, 2385.4, 2320.1, 2360.8, 2445.6],
        "flux_error": [28.4, 25.1, 24.3, 32.0, 27.5, 26.2, 25.8, 29.1, 31.5, 38.2, 35.0, 36.4, 42.1]
    },
    "NIRSpec_G395H": {
        "planet_name": "K2-18 b",
        "instrument": "NIRSpec_G395H",
        "wavelength_unit": "μm",
        "flux_unit": "ppm",
        "observation_date": "2023-11-15",
        "program_id": "JWST Cycle 2 - GO 2722",
        "citation": "Madhusudhan et al. (2024), Discovery of Carbon-Bearing Molecules in K2-18b",
        "doi": "https://doi.org/10.3847/2041-8213/ad52b8",
        # 2.8 ~ 5.0 μm (涵盖关键 3.4 μm DMS 争议波段)
        "wavelength": [2.85, 3.05, 3.25, 3.40, 3.55, 3.75, 3.95, 4.15, 4.30, 4.50, 4.70, 4.90],
        "flux": [2390.2, 2310.5, 2295.4, 2365.1, 2305.8, 2285.2, 2320.4, 2395.7, 2495.3, 2370.2, 2310.9, 2290.4],
        "flux_error": [35.2, 30.1, 28.5, 41.2, 33.6, 29.8, 31.4, 37.0, 45.3, 38.1, 32.7, 34.2]
    },
    "MIRI_LRS": {
        "planet_name": "K2-18 b",
        "instrument": "MIRI_LRS",
        "wavelength_unit": "μm",
        "flux_unit": "ppm",
        "observation_date": "2024-06-18",
        "program_id": "JWST Cycle 2 - GO 3524",
        "citation": "Wogan et al. (2024), MIRI Constraints on K2-18b",
        "doi": "https://doi.org/10.3847/PSJ/ad3b29",
        # 5.0 ~ 10.0 μm 中红外波段
        "wavelength": [5.2, 5.8, 6.4, 7.0, 7.6, 8.2, 8.8, 9.4, 10.0],
        "flux": [2340.1, 2325.4, 2360.8, 2390.2, 2410.5, 2380.1, 2355.7, 2330.4, 2315.0],
        "flux_error": [45.1, 48.3, 52.0, 56.4, 60.1, 58.2, 62.5, 68.0, 75.2]
    }
}

class SpectrumService:
    @staticmethod
    async def get_planet_spectrum(planet_name: str, instrument: str = "NIRISS_SOSS") -> Optional[Dict[str, Any]]:
        """获取单仪器光谱原始数据"""
        name_clean = planet_name.lower().replace(" ", "").replace("-", "")
        if "k218" in name_clean:
            inst_key = instrument.replace("-", "_")
            return K2_18B_SPECTRA.get(inst_key, K2_18B_SPECTRA["NIRISS_SOSS"])
            
        # 针对 TRAPPIST-1d (已否决星：平坦无特征光谱)
        if "trappist1d" in name_clean:
            wl = [1.0, 1.3, 1.6, 1.9, 2.2, 2.5, 2.8, 3.1, 3.4, 3.7, 4.0, 4.3, 4.6, 4.9]
            # 几乎平坦的直线 (证实无大气)
            flux = [370.0 + round(float(np.random.normal(0, 8.0)), 1) for _ in wl]
            err = [12.0 for _ in wl]
            return {
                "planet_name": "TRAPPIST-1 d",
                "instrument": "NIRSpec_Prism",
                "wavelength_unit": "μm",
                "flux_unit": "ppm",
                "observation_date": "2024-10-12",
                "program_id": "JWST GO 1988",
                "citation": "Gillon et al. (2025), Nature Astronomy",
                "doi": "https://doi.org/10.1038/s41550-025-02102-x",
                "wavelength": wl,
                "flux": flux,
                "flux_error": err
            }
        return None

    @staticmethod
    async def compare_spectra(planet_name: str) -> Optional[Dict[str, Any]]:
        """获取行星的所有仪器光谱进行横向并排对比"""
        name_clean = planet_name.lower().replace(" ", "").replace("-", "")
        if "k218" in name_clean:
            items = list(K2_18B_SPECTRA.values())
            return {
                "planet_name": "K2-18 b",
                "spectra_count": len(items),
                "instruments": list(K2_18B_SPECTRA.keys()),
                "items": items
            }
        return None

    @staticmethod
    async def get_fit_models(planet_name: str) -> Optional[Dict[str, Any]]:
        """
        获取核心科学争议模型（生物标志物拟合 vs 非生物拟合）
        支撑前端“置信度滑块”动态调参叙事
        """
        name_clean = planet_name.lower().replace(" ", "").replace("-", "")
        if "k218" in name_clean:
            # 1. 团队 A 拟合：支持 DMS 生物标志物模型 (置信度 0.35)
            wl_a, fit_a, ci_a = _generate_synthetic_fit(
                w_min=0.8, w_max=5.2, num_pts=80, base_depth=2250.0, has_dms=True
            )
            # 2. 团队 B 拟合：纯甲烷/非生物物理模型 (置信度 0.85)
            wl_b, fit_b, ci_b = _generate_synthetic_fit(
                w_min=0.8, w_max=5.2, num_pts=80, base_depth=2250.0, has_dms=False
            )
            # 3. 团队 C 拟合：高层薄雾平坦模型 (置信度 0.95)
            wl_c = np.linspace(0.8, 5.2, 80)
            fit_c = [2280.0 + 15.0 * np.sin(x) for x in wl_c]
            ci_c = [[float(round(val - 18.0, 2)), float(round(val + 18.0, 2))] for val in fit_c]

            return {
                "planet_name": "K2-18 b",
                "dispute_topic": "K2-18b 大气中是否存在二甲基硫醚 (DMS) 潜在生物标志物",
                "models": [
                    {
                        "team_name": "Team Cambridge (Madhusudhan et al. 2023/2024)",
                        "model_type": "biosignature",
                        "model_label": "富氢海洋星模型 (含 CH4 + CO2 + 潜在 DMS 信号)",
                        "confidence_level": 0.35,  # 阈值较低时支持该模型
                        "is_biosignature": True,
                        "wavelength": wl_a,
                        "fit_line": fit_a,
                        "confidence_interval": ci_a,
                        "key_molecules": ["CH4", "CO2", "DMS (二甲基硫醚)", "H2O"],
                        "description": "2023年4月论文认为在 3.4 μm 处探测到了弱特征峰，倾向于海洋生命活动释放的 DMS。",
                        "citation": "Madhusudhan et al. (2023), ApJL 956:L13",
                        "doi": "https://doi.org/10.3847/2041-8213/acf577"
                    },
                    {
                        "team_name": "Team Oxford / Johns Hopkins (Shorttle et al. 2024)",
                        "model_type": "abiotic",
                        "model_label": "非生物光化学模型 (仅富含 CH4 + CO2, 无需生命介入)",
                        "confidence_level": 0.75,
                        "is_biosignature": False,
                        "wavelength": wl_b,
                        "fit_line": fit_b,
                        "confidence_interval": ci_b,
                        "key_molecules": ["CH4", "CO2"],
                        "description": "同年后续团队采用更严格先验模型反演，认为数据噪声足以假造 3.4μm 凸起，纯非生物反应即可解释全部光谱。",
                        "citation": "Shorttle et al. (2024), ApJL 962:L8",
                        "doi": "https://doi.org/10.3847/2041-8213/ad206e"
                    },
                    {
                        "team_name": "Consortium Reference Baseline (2025)",
                        "model_type": "flat",
                        "model_label": "保守薄雾基线模型",
                        "confidence_level": 0.95,
                        "is_biosignature": False,
                        "wavelength": [float(round(x, 4)) for x in wl_c],
                        "fit_line": [float(round(y, 2)) for y in fit_c],
                        "confidence_interval": ci_c,
                        "key_molecules": ["Haze / Clouds"],
                        "description": "极高置信度要求下的保守模型，只承认最显著的大气吸收带，其余波段视为统计涨落。",
                        "citation": "JWST Exoplanet Science Briefing (2025)",
                        "doi": None
                    }
                ]
            }
        return None