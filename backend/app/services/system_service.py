from typing import Optional, Dict, Any

# 内置真实科学数据集：TRAPPIST-1 完整 7 颗行星及 K2-18
SYSTEMS_DATA: Dict[str, Any] = {
    "trappist-1": {
        "star": {
            "name": "TRAPPIST-1",
            "spectral_type": "M8V (超低温红矮星)",
            "mass": 0.0898,          # 太阳质量
            "radius": 0.1192,        # 太阳半径 (约等于木星大小)
            "temperature": 2566.0,   # K
            "luminosity": 0.000553,  # 太阳光度
            "distance": 39.46,       # 光年
            "age": 7.6,              # 76 亿年
            "ra": 346.622,
            "dec": -5.041
        },
        "habitable_zone_inner_au": 0.021,  # 宜居带内边缘 (AU)
        "habitable_zone_outer_au": 0.048,  # 宜居带外边缘 (AU)
        "planets": [
            {
                "pl_name": "TRAPPIST-1 b",
                "letter": "b",
                "radius": 1.116,
                "mass": 1.374,
                "density": 5.42,
                "semi_major_axis": 0.01154,
                "orbital_period": 1.5108,
                "eccentricity": 0.0062,
                "inclination": 89.72,
                "insolation_flux": 4.15,
                "temperature": 391.8,
                "status": "confirmed",
                "rejection_reason": "过于靠近母星，处于极高辐射区",
                "rejection_paper_url": None,
                "color_code": "molten-orange",
                "has_spectrum": True,
                "radar_metrics": {"radius": 60, "mass": 65, "temperature": 85, "insolation_flux": 90, "orbital_period": 10, "habitability_index": 10}
            },
            {
                "pl_name": "TRAPPIST-1 c",
                "letter": "c",
                "radius": 1.097,
                "mass": 1.308,
                "density": 5.48,
                "semi_major_axis": 0.01580,
                "orbital_period": 2.4218,
                "eccentricity": 0.0065,
                "inclination": 89.77,
                "insolation_flux": 2.21,
                "temperature": 334.8,
                "status": "confirmed",
                "rejection_reason": "JWST MIRI 观测证实大气极度稀薄或无明显厚大气",
                "rejection_paper_url": "https://doi.org/10.1038/s41586-023-06232-z",
                "color_code": "rocky-brown",
                "has_spectrum": True,
                "radar_metrics": {"radius": 58, "mass": 62, "temperature": 70, "insolation_flux": 75, "orbital_period": 18, "habitability_index": 20}
            },
            {
                "pl_name": "TRAPPIST-1 d",
                "letter": "d",
                "radius": 0.788,
                "mass": 0.388,
                "density": 4.35,
                "semi_major_axis": 0.02227,
                "orbital_period": 4.0496,
                "eccentricity": 0.0083,
                "inclination": 89.89,
                "insolation_flux": 1.11,
                "temperature": 282.1,
                "status": "rejected",  # 提案重点：灰色已否决星
                "rejection_reason": "2025 年 JWST NIRSpec 凌星光谱证实无浓厚大气层，已被排除候选",
                "rejection_paper_url": "https://doi.org/10.1038/s41550-025-02102-x",
                "color_code": "gray",
                "has_spectrum": True,
                "radar_metrics": {"radius": 40, "mass": 25, "temperature": 55, "insolation_flux": 50, "orbital_period": 30, "habitability_index": 5}
            },
            {
                "pl_name": "TRAPPIST-1 e",
                "letter": "e",
                "radius": 0.920,
                "mass": 0.692,
                "density": 4.89,
                "semi_major_axis": 0.02925,
                "orbital_period": 6.0996,
                "eccentricity": 0.0051,
                "inclination": 89.73,
                "insolation_flux": 0.646,
                "temperature": 246.1,
                "status": "habitable", # 提案重点：当前最优候选星
                "rejection_reason": None,
                "rejection_paper_url": None,
                "color_code": "blue-green",
                "has_spectrum": True,
                "radar_metrics": {"radius": 50, "mass": 48, "temperature": 45, "insolation_flux": 40, "orbital_period": 42, "habitability_index": 95}
            },
            {
                "pl_name": "TRAPPIST-1 f",
                "letter": "f",
                "radius": 1.045,
                "mass": 1.039,
                "density": 4.96,
                "semi_major_axis": 0.03849,
                "orbital_period": 9.2067,
                "eccentricity": 0.0100,
                "inclination": 89.71,
                "insolation_flux": 0.373,
                "temperature": 214.5,
                "status": "habitable", # 潜在海洋世界
                "rejection_reason": None,
                "rejection_paper_url": None,
                "color_code": "ice-blue",
                "has_spectrum": True,
                "radar_metrics": {"radius": 55, "mass": 55, "temperature": 35, "insolation_flux": 28, "orbital_period": 60, "habitability_index": 80}
            },
            {
                "pl_name": "TRAPPIST-1 g",
                "letter": "g",
                "radius": 1.129,
                "mass": 1.321,
                "density": 5.06,
                "semi_major_axis": 0.04683,
                "orbital_period": 12.3529,
                "eccentricity": 0.0020,
                "inclination": 89.72,
                "insolation_flux": 0.252,
                "temperature": 194.3,
                "status": "habitable",
                "rejection_reason": None,
                "rejection_paper_url": None,
                "color_code": "frost-cyan",
                "has_spectrum": True,
                "radar_metrics": {"radius": 60, "mass": 63, "temperature": 28, "insolation_flux": 20, "orbital_period": 75, "habitability_index": 65}
            },
            {
                "pl_name": "TRAPPIST-1 h",
                "letter": "h",
                "radius": 0.755,
                "mass": 0.326,
                "density": 4.19,
                "semi_major_axis": 0.06189,
                "orbital_period": 18.7679,
                "eccentricity": 0.0056,
                "inclination": 89.79,
                "insolation_flux": 0.144,
                "temperature": 169.2,
                "status": "confirmed",
                "rejection_reason": "处于冰冻线以外的极寒行星",
                "rejection_paper_url": None,
                "color_code": "deep-ice",
                "has_spectrum": False,
                "radar_metrics": {"radius": 38, "mass": 22, "temperature": 18, "insolation_flux": 12, "orbital_period": 95, "habitability_index": 30}
            }
        ]
    },
    "k2-18": {
        "star": {
            "name": "K2-18",
            "spectral_type": "M2.5V (红矮星)",
            "mass": 0.495,
            "radius": 0.469,
            "temperature": 3457.0,
            "luminosity": 0.0245,
            "distance": 124.3,
            "age": 2.5,
            "ra": 172.560,
            "dec": 7.588
        },
        "habitable_zone_inner_au": 0.12,
        "habitable_zone_outer_au": 0.25,
        "planets": [
            {
                "pl_name": "K2-18 b",
                "letter": "b",
                "radius": 2.37,
                "mass": 8.63,
                "density": 3.63,
                "semi_major_axis": 0.1429,
                "orbital_period": 32.9396,
                "eccentricity": 0.09,
                "inclination": 89.58,
                "insolation_flux": 1.22,
                "temperature": 272.0,
                "status": "habitable",
                "rejection_reason": None,
                "rejection_paper_url": "https://doi.org/10.3847/2041-8213/acf577",
                "color_code": "deep-blue",
                "has_spectrum": True,
                "radar_metrics": {"radius": 85, "mass": 90, "temperature": 52, "insolation_flux": 55, "orbital_period": 88, "habitability_index": 78}
            }
        ]
    }
}

class SystemService:
    @staticmethod
    async def get_system_by_star(star_name: str) -> Optional[Dict[str, Any]]:
        """按恒星名称模糊匹配并返回星系详情"""
        normalized_key = star_name.lower().replace(" ", "").replace("_", "").replace("-", "")
        
        for key, data in SYSTEMS_DATA.items():
            if key.replace("-", "") in normalized_key or normalized_key in key.replace("-", ""):
                result = data.copy()
                result["planets_count"] = len(result["planets"])
                return result
        return None