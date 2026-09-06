// ═══════════════════════════════════════════════════════════════
// 后端 API 客户端（真·全栈数据层）
//
// 设计原则：网页永不崩。
//   · 配置了 VITE_API_BASE 且后端在线 → 返回 live=true，用实时数据
//   · 未配置 / 请求失败 / 超时 → 返回 data=null，由调用方回退静态兜底
//
// 对齐后端 backend/app/schemas/spectrum.py 的响应结构（snake_case）。
// ═══════════════════════════════════════════════════════════════

const RAW_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

/** 后端根地址（去掉尾部斜杠）。空串表示未配置 → 走静态兜底。 */
export const API_BASE = RAW_BASE.replace(/\/+$/, '')

/**
 * 是否尝试实时 API：
 *   · 显式配了 VITE_API_BASE（生产指向已部署后端）→ 直连该地址
 *   · 开发环境（import.meta.env.DEV）→ 走 Vite 代理的相对路径 /api，规避 CORS
 *   · 生产且未配置 → 关闭，直接用静态兜底（不发无谓请求）
 */
export const API_ENABLED = API_BASE.length > 0 || import.meta.env.DEV

// ── 后端数据结构（镜像 backend/app/schemas/spectrum.py） ──

/** 单仪器 / 单次观测光谱散点（真实 ppm 凌星深度 + 误差棒 + 文献引用） */
export interface BackendSpectrum {
  planet_name: string
  instrument: string
  wavelength_unit: string
  flux_unit: string
  observation_date: string
  program_id: string
  citation: string
  doi: string | null
  wavelength: number[]
  flux: number[]
  flux_error: number[]
}

/** 多仪器横向对比响应体 */
export interface BackendCompare {
  planet_name: string
  spectra_count: number
  instruments: string[]
  items: BackendSpectrum[]
}

/** 科研团队的理论拟合模型（争议模拟器核心） */
export interface BackendFitModel {
  team_name: string
  /** 'biosignature' | 'abiotic' | 'flat' */
  model_type: string
  model_label: string
  /** 拟合置信度 0–1，对应"置信度阈值"滑块 */
  confidence_level: number
  is_biosignature: boolean
  wavelength: number[]
  fit_line: number[]
  /** 置信区间带 [[lower, upper], ...] */
  confidence_interval: number[][]
  key_molecules: string[]
  description: string
  citation: string
  doi: string | null
}

/** 拟合曲线与争议模型对比响应体 */
export interface BackendFits {
  planet_name: string
  dispute_topic: string
  models: BackendFitModel[]
}

/** 统一返回：数据 + 是否来自实时后端 */
export interface ApiResult<T> {
  data: T | null
  live: boolean
}

// ── 底层 GET（带超时中断，失败静默返回 null） ──
async function getJSON<T>(path: string, timeoutMs = 4500): Promise<T | null> {
  if (!API_ENABLED) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    // 网络错误 / 超时 / CORS / 后端未部署 —— 一律静默回退
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** 获取某行星的多仪器真实光谱（K2-18b → NIRISS/NIRSpec/MIRI 三仪器） */
export async function fetchSpectrumCompare(planet: string): Promise<ApiResult<BackendCompare>> {
  const data = await getJSON<BackendCompare>(`/api/spectra/${encodeURIComponent(planet)}/compare`)
  return { data, live: data != null }
}

/** 获取某行星的三团队争议拟合模型（置信度滑块数据源） */
export async function fetchSpectrumFits(planet: string): Promise<ApiResult<BackendFits>> {
  const data = await getJSON<BackendFits>(`/api/spectra/${encodeURIComponent(planet)}/fits`)
  return { data, live: data != null }
}
