"""
exoplanet-spectra-fetcher · MCP server（stdio 传输）

将光谱数据管道封装为标准 MCP 技能，对外暴露 tool：fetch_exoplanet_spectra。
运行：python backend/mcp_skill/server.py   （由 MCP client 以 stdio 方式拉起）
"""
from mcp.server.mcpserver import MCPServer  # mcp 2.x: FastMCP 已改名 MCPServer

from spectra_fetcher import fetch_exoplanet_spectra as _fetch

mcp = MCPServer("exoplanet-spectra-fetcher")


@mcp.tool()
async def fetch_exoplanet_spectra(planet_name: str) -> dict:
    """Fetch standardized JWST transmission spectra + dispute models + a preview image for an exoplanet.

    Input: planet_name, e.g. "K2-18b".
    Output: standardized JSON containing per-instrument spectra (with error bars and
    literature DOIs), the DMS-dispute fit models, and a rendered preview PNG (base64 + path).
    """
    return await _fetch(planet_name)


if __name__ == "__main__":
    mcp.run()  # 默认 stdio 传输
