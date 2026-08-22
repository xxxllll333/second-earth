# 文件路径：app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.endpoints import planets

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="第二地球 · 系外行星可交互数据可视化系统后端 API"
)

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载路由，统一前缀 /api/planets
app.include_router(planets.router, prefix=f"{settings.API_V1_PREFIX}/planets", tags=["Planets (系外行星)"])

@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }