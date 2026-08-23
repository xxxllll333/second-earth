# 文件路径：app/config.py
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Second Earth API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # 数据库连接 (本地默认 SQLite 异步引擎)
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/app.db"
    
    # 跨域白名单 (本地开发阶段允许前端常见端口)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()