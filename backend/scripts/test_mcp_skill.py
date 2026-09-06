r"""
MCP 技能包最小闭环验证脚本（真实 MCP stdio 协议）

流程：以 stdio 拉起 mcp_skill/server.py → initialize → list_tools →
      call_tool(fetch_exoplanet_spectra, K2-18b) → 落盘标准化 JSON + 预览图 PNG。

运行：backend\venv\Scripts\python.exe backend\scripts\test_mcp_skill.py
"""
import asyncio
import base64
import json
import os
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SERVER_PY = os.path.join(_BACKEND_ROOT, "mcp_skill", "server.py")
_OUTPUT_DIR = os.path.join(_BACKEND_ROOT, "mcp_skill", "output")


async def main() -> None:
    params = StdioServerParameters(command=sys.executable, args=[_SERVER_PY])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            print("[mcp] tools:", [t.name for t in tools.tools])

            result = await session.call_tool("fetch_exoplanet_spectra", {"planet_name": "K2-18b"})
            data = json.loads(result.content[0].text)

            if "error" in data:
                print("[mcp] ERROR:", data["error"])
                sys.exit(1)

            os.makedirs(_OUTPUT_DIR, exist_ok=True)
            json_path = os.path.join(_OUTPUT_DIR, "k218b_standardized.json")
            with open(json_path, "w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)

            png_bytes = base64.b64decode(data["preview"]["png_base64"])
            png_path = os.path.join(_OUTPUT_DIR, "k218b_preview.png")
            with open(png_path, "wb") as fh:
                fh.write(png_bytes)

            print("[mcp] planet        :", data["planet_name"])
            print("[mcp] instruments   :", data["instruments"])
            print("[mcp] spectra_count :", data["spectra_count"])
            print("[mcp] dispute models:", len(data["dispute"]["models"]))
            print("[mcp] pipeline      :", " -> ".join(data["pipeline"]))
            print("[mcp] json saved    :", json_path)
            print("[mcp] png  saved    :", png_path, f"({len(png_bytes)} bytes)")
            print("[mcp] LOOP OK")


if __name__ == "__main__":
    asyncio.run(main())
