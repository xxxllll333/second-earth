from fastapi import APIRouter, HTTPException, status
from app.services.collection_service import CollectionService
from app.schemas.collection import CollectionCreate, CollectionItem, CollectionListResponse

router = APIRouter()

@router.get("", response_model=CollectionListResponse, summary="获取个人收藏星表与新科学数据回访通知")
async def get_collections():
    """
    提供给前端收藏夹抽屉与首页回访横幅：
    - 返回已收藏的行星卡片列表（包含探索时间线与笔记）。
    - **回访机制加分项**：自动检测收藏目标是否有最新 JWST 光谱发布，返回 `banner_notification` 提示。
    """
    return await CollectionService.get_collections()

@router.post("", response_model=CollectionItem, status_code=status.HTTP_201_CREATED, summary="添加行星到个人星表")
async def add_to_collection(payload: CollectionCreate):
    """
    在星系视图或光谱视图中点击“收藏此星”时调用。
    """
    return await CollectionService.add_collection(
        planet_name=payload.planet_name,
        note=payload.note
    )

@router.delete("/{id}", summary="从个人星表中移除")
async def remove_from_collection(id: str):
    """
    根据收藏唯一 ID 移除该行星记录。
    """
    success = await CollectionService.delete_collection(item_id=id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到 ID 为 '{id}' 的收藏记录。"
        )
    return {"status": "success", "message": "已从个人星表中移除"}