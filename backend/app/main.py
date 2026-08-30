# 文件路径：app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.endpoints import planets,systems, spectra, evolution, collection

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
app.include_router(systems.router, prefix=f"{settings.API_V1_PREFIX}/systems", tags=["Systems (星系与轨道)"])
app.include_router(spectra.router, prefix=f"{settings.API_V1_PREFIX}/spectra", tags=["Spectra (光谱画廊与争议)"])
app.include_router(evolution.router, prefix=f"{settings.API_V1_PREFIX}/evolution", tags=["4. 恒星生命卷轴 (时间穿透)"])
app.include_router(collection.router, prefix=f"{settings.API_V1_PREFIX}/collection", tags=["5. 个人星表与回访 (收藏)"])

@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }