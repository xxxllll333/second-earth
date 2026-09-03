from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CollectionCreate(BaseModel):
    """添加收藏请求体"""
    planet_name: str = Field(..., description="要收藏的行星名称，如 'K2-18 b' 或 'TRAPPIST-1 e'")
    note: Optional[str] = Field(None, max_length=200, description="用户自定义探索笔记/备注")

class NotificationBanner(BaseModel):
    """顶部静默回访通知横幅数据（回访机制加分项）"""
    has_new_update: bool = Field(..., description="是否存在新数据更新")
    target_planet: Optional[str] = Field(None, description="触发更新提醒的目标行星")
    message: Optional[str] = Field(None, description="横幅通知文本")
    update_date: Optional[str] = Field(None, description="新数据发布日期")
    action_url: Optional[str] = Field(None, description="点击直接跳转的光谱视图 URL")

class CollectionItem(BaseModel):
    """收藏记录条目"""
    id: str = Field(..., description="唯一收藏 ID (UUID)")
    planet_name: str = Field(..., description="行星名称")
    hostname: str = Field(..., description="母恒星")
    radius: float = Field(..., description="行星半径 (R⊕)")
    temperature: Optional[float] = Field(None, description="平衡温度 (K)")
    status: str = Field(..., description="状态: habitable | confirmed | rejected")
    color_code: str = Field(..., description="伪色分类")
    note: Optional[str] = Field(None, description="用户笔记")
    created_at: str = Field(..., description="收藏创建时间 (ISO格式)")
    
    # 科学更新提醒
    has_new_update: bool = Field(False, description="该行星近期是否有新数据发布")
    update_desc: Optional[str] = Field(None, description="最新发布的科学数据简述")

class CollectionListResponse(BaseModel):
    """收藏列表与回访通知响应体"""
    total_count: int = Field(..., description="已收藏行星总数")
    banner_notification: Optional[NotificationBanner] = Field(
        None, 
        description="若有收藏行星更新，返回顶部静默提示横幅；无更新则为 None"
    )
    items: List[CollectionItem]