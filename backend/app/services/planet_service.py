# 文件路径：app/services/planet_service.py
from typing import Optional, List, Dict, Any

# 基于提案文档重点目标的 Mock 科学数据集
MOCK_PLANETS: List[Dict[str, Any]] = [
    {
        "pl_name": "TRAPPIST-1 e",
        "hostname": "TRAPPIST-1",
        "radius": 0.92,
        "mass": 0.69,
        "temperature": 251.0,
        "orbital_period": 6.1,
        "distance": 39.5,
        "discovery_year": 2017,
        "has_spectrum": True,
        "status": "habitable",
        "color_code": "blue-green",
        "description": "当前最被看好的候选宜居星，处于恒星宜居带中心。"
    },
    {
        "pl_name": "TRAPPIST-1 d",
        "hostname": "TRAPPIST-1",
        "radius": 0.77,
        "mass": 0.38,
        "temperature": 286.0,
        "orbital_period": 4.05,
        "distance": 39.5,
        "discovery_year": 2017,
        "has_spectrum": True,
        "status": "rejected",
        "color_code": "gray",
        "description": "2025年 JWST 观测数据证实其缺乏浓厚大气层，已被排除。"
    },
    {
        "pl_name": "TRAPPIST-1 f",
        "hostname": "TRAPPIST-1",
        "radius": 1.04,
        "mass": 1.04,
        "temperature": 219.0,
        "orbital_period": 9.2,
        "distance": 39.5,
        "discovery_year": 2017,
        "has_spectrum": True,
        "status": "habitable",
        "color_code": "ice-blue",
        "description": "潜在的富水或海洋世界。"
    },
    {
        "pl_name": "K2-18 b",
        "hostname": "K2-18",
        "radius": 2.37,
        "mass": 8.63,
        "temperature": 272.0,
        "orbital_period": 32.9,
        "distance": 124.0,
        "discovery_year": 2015,
        "has_spectrum": True,
        "status": "habitable",
        "color_code": "deep-blue",
        "description": "JWST 观测检测到含碳分子及疑似二甲基硫醚(DMS)信号，存在科学争议。"
    },
    {
        "pl_name": "WD 1856+534 b",
        "hostname": "WD 1856+534",
        "radius": 10.4,
        "mass": 13.8,
        "temperature": 163.0,
        "orbital_period": 1.4,
        "distance": 132.0,
        "discovery_year": 2020,
        "has_spectrum": True,
        "status": "confirmed",
        "color_code": "dark-orange",
        "description": "围绕白矮星运行的木星级幸存行星，代表了恒星晚期演化后的幸存系统。"
    }
]

class PlanetService:
    @staticmethod
    async def get_planets(
        filter_type: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """按筛选条件返回行星列表"""
        filtered = MOCK_PLANETS
        
        if filter_type == "habitable":
            filtered = [p for p in filtered if p["status"] == "habitable"]
        elif filter_type == "rejected":
            filtered = [p for p in filtered if p["status"] == "rejected"]
        elif filter_type == "spectrum":
            filtered = [p for p in filtered if p["has_spectrum"]]

        # 分页切片
        start = (page - 1) * limit
        end = start + limit
        paginated_items = filtered[start:end]

        return {
            "total": len(filtered),
            "page": page,
            "limit": limit,
            "items": paginated_items
        }

    @staticmethod
    async def get_planet_by_name(name: str) -> Optional[Dict[str, Any]]:
        """按名称查找单颗行星详情"""
        for planet in MOCK_PLANETS:
            # 兼容大小写与无空格格式比较（如 "k2-18b" 与 "K2-18 b"）
            if planet["pl_name"].lower().replace(" ", "") == name.lower().replace(" ", ""):
                return planet
        return None