"""
exoplanet-spectra-fetcher · MCP 技能包核心逻辑（最小闭环）

管道：行星名 → 数据源 → 标准化 JSON → 预览图（PNG + base64）

数据源策略（沿用项目「JSON 缓存优先」架构，见 docs 8.3）：
  · 默认走本地预解析缓存 backend/app/services/spectrum_service.py，
    该缓存是 MAST / JWST 真实观测数据的离线镜像（含文献 DOI），保证离线可复现。
  · 在线 MAST 路径（astroquery 查询 + astropy 解析 FITS）为完整管道的在线分支，
    需联网且安装 astroquery / astropy 后启用；最小闭环演示走缓存分支。
"""
import base64
import importlib.util
import io
import os
from datetime import datetime, timezone

import matplotlib

matplotlib.use("Agg")  # 无显示环境渲染
import matplotlib.pyplot as plt
import numpy as np

SKILL_NAME = "exoplanet-spectra-fetcher"

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

# 以文件路径方式加载 spectrum_service（绕过包结构，保证技能独立可运行）
_spec = importlib.util.spec_from_file_location(
    "spectrum_service",
    os.path.join(_BACKEND_ROOT, "app", "services", "spectrum_service.py"),
)
_spectrum_service = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_spectrum_service)
SpectrumService = _spectrum_service.SpectrumService

# 与前端保持一致的配色（仪器 / 争议模型）
_INSTRUMENT_COLOR = {"NIRISS_SOSS": "#9fd8ef", "NIRSpec_G395H": "#d8b483", "MIRI_LRS": "#c3a6d8"}
_MODEL_COLOR = {"biosignature": "#FC3D21", "abiotic": "#66d9ff", "flat": "#8a8a9c"}


def _render_preview(compare: dict, fits: dict, out_png: str) -> str:
    """生成预览图：上=三仪器观测散点+误差棒，下=三团队争议拟合+置信带；返回 base64"""
    fig, (ax_obs, ax_fit) = plt.subplots(2, 1, figsize=(9, 8), dpi=110)

    for item in compare["items"]:
        color = _INSTRUMENT_COLOR.get(item["instrument"], "#888888")
        ax_obs.errorbar(
            item["wavelength"], item["flux"], yerr=item["flux_error"],
            fmt="o", ms=3, lw=1, capsize=2, color=color, label=item["instrument"],
        )
    ax_obs.set_xlabel("Wavelength (um)")
    ax_obs.set_ylabel("Transit depth (ppm)")
    ax_obs.set_title(f"{compare['planet_name']} - JWST observed spectra (3 instruments)")
    ax_obs.legend(fontsize=8)
    ax_obs.grid(alpha=0.2)

    for model in fits["models"]:
        color = _MODEL_COLOR.get(model["model_type"], "#888888")
        ax_fit.plot(model["wavelength"], model["fit_line"], lw=1.4, color=color, label=model["model_type"])
        ci = np.array(model["confidence_interval"])
        ax_fit.fill_between(model["wavelength"], ci[:, 0], ci[:, 1], color=color, alpha=0.15)
    ax_fit.set_xlabel("Wavelength (um)")
    ax_fit.set_ylabel("Model fit (ppm)")
    ax_fit.set_title("DMS dispute - 3 team fits (biosignature / abiotic / flat)")
    ax_fit.legend(fontsize=8)
    ax_fit.grid(alpha=0.2)

    fig.tight_layout()
    fig.savefig(out_png)
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("ascii")


async def fetch_exoplanet_spectra(planet_name: str, source: str = "cache") -> dict:
    """
    MCP tool 主入口：输入行星名，输出标准化光谱 JSON + 争议模型 + 预览图。

    source="cache" 走本地预解析缓存（离线可复现）；
    source="mast" 为在线分支占位（需 astroquery + 联网，最小闭环未启用）。
    """
    if source == "mast":
        return {
            "skill": SKILL_NAME,
            "planet_name": planet_name,
            "error": "Online MAST branch requires astroquery + astropy + network; not enabled in minimal loop.",
        }

    compare = await SpectrumService.compare_spectra(planet_name)
    fits = await SpectrumService.get_fit_models(planet_name)
    if compare is None or fits is None:
        return {
            "skill": SKILL_NAME,
            "planet_name": planet_name,
            "error": f"No cached JWST spectra for '{planet_name}'. Cached planets: K2-18b.",
        }

    os.makedirs(_OUTPUT_DIR, exist_ok=True)
    safe = planet_name.lower().replace(" ", "").replace("-", "")
    png_path = os.path.join(_OUTPUT_DIR, f"{safe}_preview.png")
    png_base64 = _render_preview(compare, fits, png_path)

    return {
        "skill": SKILL_NAME,
        "planet_name": compare["planet_name"],
        "source": "MAST/JWST pre-parsed cache (offline mirror; literature DOIs included)",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "pipeline": [
            "resolve_planet",
            "load_spectra_cache",
            "load_dispute_models",
            "standardize_json",
            "render_preview_png",
        ],
        "spectra_count": compare["spectra_count"],
        "instruments": compare["instruments"],
        "spectra": compare["items"],
        "dispute": fits,
        "preview": {"path": png_path, "png_base64": png_base64},
    }
