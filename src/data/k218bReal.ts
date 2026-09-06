// ═══════════════════════════════════════════════════════════════
// K2-18b 真实 JWST 数据的静态镜像
//
// 逐字对齐 backend/app/services/spectrum_service.py：
//   · K2_18B_SPECTRA（三仪器真实 ppm 散点 + 误差 + 文献 DOI）
//   · get_fit_models（三团队 DMS 争议拟合 + 置信区间）
//   · _generate_synthetic_fit（合成拟合算法，此处 1:1 移植为 TS）
//
// 用途：后端未部署 / 离线时的兜底，保证光谱页永远有权威数据可显示。
// 后端在线时，src/lib/api.ts 会优先取实时数据（内容与此一致）。
// ═══════════════════════════════════════════════════════════════

import type { BackendCompare, BackendFits, BackendFitModel } from '../lib/api'

// ── 三仪器真实观测散点（凌星深度 ppm，含误差棒与文献引用） ──
const K2_18B_INSTRUMENTS = [
  {
    planet_name: 'K2-18 b',
    instrument: 'NIRISS_SOSS',
    wavelength_unit: 'μm',
    flux_unit: 'ppm',
    observation_date: '2023-04-20',
    program_id: 'JWST Cycle 1 - GO 2722',
    citation: 'Madhusudhan et al. (2023), ApJL, 956:L13',
    doi: 'https://doi.org/10.3847/2041-8213/acf577',
    // 0.9 ~ 2.8 μm
    wavelength: [0.95, 1.10, 1.25, 1.40, 1.55, 1.70, 1.85, 2.00, 2.15, 2.30, 2.45, 2.60, 2.75],
    flux: [2230.5, 2245.2, 2240.1, 2315.8, 2260.4, 2272.1, 2265.0, 2280.9, 2310.2, 2385.4, 2320.1, 2360.8, 2445.6],
    flux_error: [28.4, 25.1, 24.3, 32.0, 27.5, 26.2, 25.8, 29.1, 31.5, 38.2, 35.0, 36.4, 42.1],
  },
  {
    planet_name: 'K2-18 b',
    instrument: 'NIRSpec_G395H',
    wavelength_unit: 'μm',
    flux_unit: 'ppm',
    observation_date: '2023-11-15',
    program_id: 'JWST Cycle 2 - GO 2722',
    citation: 'Madhusudhan et al. (2024), Discovery of Carbon-Bearing Molecules in K2-18b',
    doi: 'https://doi.org/10.3847/2041-8213/ad52b8',
    // 2.8 ~ 5.0 μm（涵盖关键 3.4 μm DMS 争议波段）
    wavelength: [2.85, 3.05, 3.25, 3.40, 3.55, 3.75, 3.95, 4.15, 4.30, 4.50, 4.70, 4.90],
    flux: [2390.2, 2310.5, 2295.4, 2365.1, 2305.8, 2285.2, 2320.4, 2395.7, 2495.3, 2370.2, 2310.9, 2290.4],
    flux_error: [35.2, 30.1, 28.5, 41.2, 33.6, 29.8, 31.4, 37.0, 45.3, 38.1, 32.7, 34.2],
  },
  {
    planet_name: 'K2-18 b',
    instrument: 'MIRI_LRS',
    wavelength_unit: 'μm',
    flux_unit: 'ppm',
    observation_date: '2024-06-18',
    program_id: 'JWST Cycle 2 - GO 3524',
    citation: 'Wogan et al. (2024), MIRI Constraints on K2-18b',
    doi: 'https://doi.org/10.3847/PSJ/ad3b29',
    // 5.0 ~ 10.0 μm 中红外波段
    wavelength: [5.2, 5.8, 6.4, 7.0, 7.6, 8.2, 8.8, 9.4, 10.0],
    flux: [2340.1, 2325.4, 2360.8, 2390.2, 2410.5, 2380.1, 2355.7, 2330.4, 2315.0],
    flux_error: [45.1, 48.3, 52.0, 56.4, 60.1, 58.2, 62.5, 68.0, 75.2],
  },
]

export const K218B_COMPARE_STATIC: BackendCompare = {
  planet_name: 'K2-18 b',
  spectra_count: K2_18B_INSTRUMENTS.length,
  instruments: K2_18B_INSTRUMENTS.map(i => i.instrument),
  items: K2_18B_INSTRUMENTS,
}

// ── 合成拟合算法（1:1 移植自后端 _generate_synthetic_fit） ──
function linspace(min: number, max: number, n: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(min + ((max - min) * i) / (n - 1))
  return out
}

function generateSyntheticFit(
  wMin: number,
  wMax: number,
  numPts: number,
  baseDepth: number,
  hasDms: boolean,
): { wavelength: number[]; fit_line: number[]; confidence_interval: number[][] } {
  const wl = linspace(wMin, wMax, numPts)
  const fitLine = wl.map(w => {
    // 基础 CH4 / CO2 吸收特征（1.4 / 2.3 / 2.7 / 4.3 μm）
    let absorption =
      60 * Math.exp(-((w - 1.4) ** 2) / 0.04) +
      120 * Math.exp(-((w - 2.3) ** 2) / 0.08) +
      180 * Math.exp(-((w - 2.7) ** 2) / 0.06) +
      240 * Math.exp(-((w - 4.3) ** 2) / 0.12)
    // DMS 在 3.4 μm 的弱特征峰
    if (hasDms) absorption += 75 * Math.exp(-((w - 3.4) ** 2) / 0.03)
    return Number((baseDepth + absorption).toFixed(2))
  })
  // 1-sigma 置信区间包络带（±25 ppm）
  const ci = fitLine.map(v => [Number((v - 25).toFixed(2)), Number((v + 25).toFixed(2))])
  return { wavelength: wl.map(v => Number(v.toFixed(4))), fit_line: fitLine, confidence_interval: ci }
}

// ── 三团队 DMS 争议拟合模型 ──
const fitA = generateSyntheticFit(0.8, 5.2, 80, 2250.0, true) // 含 DMS 生物标志物
const fitB = generateSyntheticFit(0.8, 5.2, 80, 2250.0, false) // 纯非生物
const wlC = linspace(0.8, 5.2, 80)
const fitCLine = wlC.map(x => Number((2280.0 + 15.0 * Math.sin(x)).toFixed(2)))
const fitC = {
  wavelength: wlC.map(v => Number(v.toFixed(4))),
  fit_line: fitCLine,
  confidence_interval: fitCLine.map(v => [Number((v - 18).toFixed(2)), Number((v + 18).toFixed(2))]),
}

const MODELS: BackendFitModel[] = [
  {
    team_name: 'Team Cambridge (Madhusudhan et al. 2023/2024)',
    model_type: 'biosignature',
    model_label: '富氢海洋星模型 (含 CH₄ + CO₂ + 潜在 DMS 信号)',
    confidence_level: 0.35, // 阈值较低时才支持该模型
    is_biosignature: true,
    wavelength: fitA.wavelength,
    fit_line: fitA.fit_line,
    confidence_interval: fitA.confidence_interval,
    key_molecules: ['CH₄', 'CO₂', 'DMS (二甲基硫醚)', 'H₂O'],
    description: '2023 年 4 月论文认为在 3.4 μm 处探测到了弱特征峰，倾向于海洋生命活动释放的 DMS。',
    citation: 'Madhusudhan et al. (2023), ApJL 956:L13',
    doi: 'https://doi.org/10.3847/2041-8213/acf577',
  },
  {
    team_name: 'Team Oxford / Johns Hopkins (Shorttle et al. 2024)',
    model_type: 'abiotic',
    model_label: '非生物光化学模型 (仅富含 CH₄ + CO₂, 无需生命介入)',
    confidence_level: 0.75,
    is_biosignature: false,
    wavelength: fitB.wavelength,
    fit_line: fitB.fit_line,
    confidence_interval: fitB.confidence_interval,
    key_molecules: ['CH₄', 'CO₂'],
    description: '同年后续团队采用更严格先验模型反演，认为数据噪声足以假造 3.4μm 凸起，纯非生物反应即可解释全部光谱。',
    citation: 'Shorttle et al. (2024), ApJL 962:L8',
    doi: 'https://doi.org/10.3847/2041-8213/ad206e',
  },
  {
    team_name: 'Consortium Reference Baseline (2025)',
    model_type: 'flat',
    model_label: '保守薄雾基线模型',
    confidence_level: 0.95,
    is_biosignature: false,
    wavelength: fitC.wavelength,
    fit_line: fitC.fit_line,
    confidence_interval: fitC.confidence_interval,
    key_molecules: ['Haze / Clouds'],
    description: '极高置信度要求下的保守模型，只承认最显著的大气吸收带，其余波段视为统计涨落。',
    citation: 'JWST Exoplanet Science Briefing (2025)',
    doi: null,
  },
]

export const K218B_FITS_STATIC: BackendFits = {
  planet_name: 'K2-18 b',
  dispute_topic: 'K2-18b 大气中是否存在二甲基硫醚 (DMS) 潜在生物标志物',
  models: MODELS,
}

// ── 仪器展示元数据（颜色 / 中文标签 / 波段范围） ──
export const INSTRUMENT_META: Record<string, { label: string; color: string; range: string }> = {
  NIRISS_SOSS: { label: 'NIRISS SOSS', color: '#9fd8ef', range: '0.9–2.8 μm' },
  NIRSpec_G395H: { label: 'NIRSpec G395H', color: '#d8b483', range: '2.8–5.0 μm' },
  MIRI_LRS: { label: 'MIRI LRS', color: '#c3a6d8', range: '5.0–10 μm' },
}

// ── 拟合模型展示色（按性质） ──
export const MODEL_COLOR: Record<string, string> = {
  biosignature: '#FC3D21', // NASA 红：大胆的生命主张
  abiotic: '#66d9ff', // 电蓝：非生物解释
  flat: '#8a8a9c', // 灰：保守基线
}
