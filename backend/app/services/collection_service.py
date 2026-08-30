import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.services.planet_service import MOCK_PLANETS

# 模拟最新科学数据库更新索引（模拟 MAST / NASA Exoplanet Archive 最新发布）
NEW_ASTRONOMY_RELEASES = {
    "k2-18 b": {
        "release_date": "2026-03",
        "instrument": "JWST/NIRSpec G395H",
        "description": "发布了最新的高精度透射光谱数据集，针对 3.4μm 波段进行了重新定标。",
        "action_url": "/spectra/K2-18%20b"
    }
}

# 内存模拟持久化存储（预置 2 条收藏数据，便于前端直接联调与回访测试）
_COLLECTIONS_DB: List[Dict[str, Any]] = [
    {
        "id": "c1a2b3c4-0001-4000-8000-000000000001",
        "planet_name": "K2-18 b",
        "note": "存在 DMS 生物标志物争议的重点关注星",
        "created_at": "2026-01-15T10:30:00Z"
    },
    {
        "id": "c1a2b3c4-0002-4000-8000-000000000002",
        "planet_name": "TRAPPIST-1 e",
        "note": "最理想的第二地球候选",
        "created_at": "2026-02-01T14:20:00Z"
    }
]

class CollectionService:
    @staticmethod
    def _find_planet_meta(planet_name: str) -> Dict[str, Any]:
        """根据名称从星表元数据中获取基本参数"""
        for p in MOCK_PLANETS:
            if p["pl_name"].lower().replace(" ", "") == planet_name.lower().replace(" ", ""):
                return p
        # 默认备用元数据
        return {
            "pl_name": planet_name,
            "hostname": planet_name.split()[0] if " " in planet_name else planet_name,
            "radius": 1.0,
            "temperature": 288.0,
            "status": "confirmed",
            "color_code": "blue-green"
        }

    @classmethod
    async def get_collections(cls) -> Dict[str, Any]:
        """
        获取用户收藏列表，并自动比对科学数据库，触发回访通知横幅
        """
        enriched_items = []
        banner = None

        for item in _COLLECTIONS_DB:
            meta = cls._find_planet_meta(item["planet_name"])
            clean_name = item["planet_name"].lower()
            
            # 比对是否有科学新数据发布（回访机制核心逻辑）
            has_update = clean_name in NEW_ASTRONOMY_RELEASES
            update_info = NEW_ASTRONOMY_RELEASES.get(clean_name)
            
            if has_update and not banner:
                banner = {
                    "has_new_update": True,
                    "target_planet": item["planet_name"],
                    "message": f"你收藏的 {item['planet_name']} 有新的 {update_info['instrument']} 光谱数据发布了（{update_info['release_date']}），要查看吗？",
                    "update_date": update_info["release_date"],
                    "action_url": update_info["action_url"]
                }

            enriched_items.append({
                "id": item["id"],
                "planet_name": meta["pl_name"],
                "hostname": meta["hostname"],
                "radius": meta["radius"],
                "temperature": meta["temperature"],
                "status": meta["status"],
                "color_code": meta.get("color_code", "blue-green"),
                "note": item.get("note"),
                "created_at": item["created_at"],
                "has_new_update": has_update,
                "update_desc": update_info["description"] if update_info else None
            })

        return {
            "total_count": len(enriched_items),
            "banner_notification": banner,
            "items": enriched_items
        }

    @classmethod
    async def add_collection(cls, planet_name: str, note: Optional[str] = None) -> Dict[str, Any]:
        """新增收藏"""
        # 防止重复收藏同名行星
        for item in _COLLECTIONS_DB:
            if item["planet_name"].lower().replace(" ", "") == planet_name.lower().replace(" ", ""):
                # 若已存在则更新备注
                item["note"] = note
                meta = cls._find_planet_meta(item["planet_name"])
                return {
                    "id": item["id"],
                    "planet_name": meta["pl_name"],
                    "hostname": meta["hostname"],
                    "radius": meta["radius"],
                    "temperature": meta["temperature"],
                    "status": meta["status"],
                    "color_code": meta.get("color_code", "blue-green"),
                    "note": item["note"],
                    "created_at": item["created_at"],
                    "has_new_update": False,
                    "update_desc": None
                }

        new_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat() + "Z"
        record = {
            "id": new_id,
            "planet_name": planet_name,
            "note": note,
            "created_at": created_at
        }
        _COLLECTIONS_DB.insert(0, record)  # 新收藏插在最前

        meta = cls._find_planet_meta(planet_name)
        return {
            "id": new_id,
            "planet_name": meta["pl_name"],
            "hostname": meta["hostname"],
            "radius": meta["radius"],
            "temperature": meta["temperature"],
            "status": meta["status"],
            "color_code": meta.get("color_code", "blue-green"),
            "note": note,
            "created_at": created_at,
            "has_new_update": False,
            "update_desc": None
        }

    @classmethod
    async def delete_collection(cls, item_id: str) -> bool:
        """根据收藏 ID 删除"""
        for i, item in enumerate(_COLLECTIONS_DB):
            if item["id"] == item_id:
                _COLLECTIONS_DB.pop(i)
                return True
        return False