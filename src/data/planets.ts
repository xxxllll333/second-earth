// 重点行星硬编码数据
// 字段设计已对齐后端对接协议（planets.json），后端真实数据到达后可直接整体替换：
//   name          → 协议 name
//   mass          → 协议 mass_earth（地球质量倍数）
//   period        → 协议 period_days（轨道周期，天）
//   esi           → 协议 esi（地球相似指数 0~1）
//   discoveryYear → 协议 discovery_year
//   discoveryMethod → 协议 discovery_method

export interface PlanetData {
  name: string
  radius: number        // 地球半径倍数
  mass: number          // 地球质量倍数
  temp: number          // 平衡温度 K
  distance: number      // 光年
  period: number        // 轨道周期（天）
  esi: number           // 地球相似指数 0~1
  discoveryYear: number
  discoveryMethod: string
  color: string         // 伪色
  isHabitable: boolean
  hasSpectrum: boolean
  isRejected: boolean
  category: '主角' | '候选宜居' | '已否决' | '一般'
  // ── 叙事状态（旅程页状态徽章 + 我的星表回访共用）──
  status?: 'stable' | 'disputed' | 'rejected'  // 稳健 / 争议中 / 已否决
  statusNote?: string   // 状态说明，如 "2025 JWST 证实无大气层"
  lastUpdated?: string  // 数据更新至，如 "2026.08"
}

export const keyPlanets: PlanetData[] = [
  // ── 主角行星 ──
  { name: 'K2-18b',     radius: 2.37, mass: 8.92,   temp: 272,  distance: 124,  period: 32.94,  esi: 0.73, discoveryYear: 2015, discoveryMethod: '凌星法',   color: '#4488cc', isHabitable: true,  hasSpectrum: true,  isRejected: false, category: '主角', status: 'disputed', statusNote: 'DMS 信号待复测', lastUpdated: '2026.08' },
  { name: 'TRAPPIST-1e', radius: 0.92, mass: 0.69,  temp: 251,  distance: 39,   period: 6.10,   esi: 0.85, discoveryYear: 2017, discoveryMethod: '凌星法',   color: '#44cc88', isHabitable: true,  hasSpectrum: true,  isRejected: false, category: '候选宜居', status: 'stable', statusNote: 'JWST 大气观测进行中', lastUpdated: '2026.07' },
  { name: 'TRAPPIST-1f', radius: 1.04, mass: 0.68,  temp: 219,  distance: 39,   period: 9.21,   esi: 0.68, discoveryYear: 2017, discoveryMethod: '凌星法',   color: '#66ccaa', isHabitable: true,  hasSpectrum: true,  isRejected: false, category: '候选宜居' },
  { name: 'TRAPPIST-1g', radius: 1.13, mass: 1.34,  temp: 199,  distance: 39,   period: 12.35,  esi: 0.58, discoveryYear: 2017, discoveryMethod: '凌星法',   color: '#88ddcc', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'WD 1856b',   radius: 10.0, mass: 4387,  temp: 163,  distance: 80,   period: 1.41,   esi: 0.00, discoveryYear: 2020, discoveryMethod: '凌星法',   color: '#cc8844', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '主角', status: 'disputed', statusNote: '形成机制未解', lastUpdated: '2026.05' },

  // ── 已否决 ──
  { name: 'TRAPPIST-1d', radius: 0.77, mass: 0.39,  temp: 286,  distance: 39,   period: 4.05,   esi: 0.90, discoveryYear: 2016, discoveryMethod: '凌星法',   color: '#666666', isHabitable: false, hasSpectrum: true,  isRejected: true,  category: '已否决', status: 'rejected', statusNote: '2025 JWST 证实无大气层', lastUpdated: '2025.12' },
  { name: 'TRAPPIST-1b', radius: 1.09, mass: 1.37,  temp: 400,  distance: 39,   period: 1.51,   esi: 0.50, discoveryYear: 2016, discoveryMethod: '凌星法',   color: '#555555', isHabitable: false, hasSpectrum: true,  isRejected: true,  category: '已否决' },
  { name: 'TRAPPIST-1c', radius: 1.06, mass: 1.31,  temp: 342,  distance: 39,   period: 2.42,   esi: 0.60, discoveryYear: 2016, discoveryMethod: '凌星法',   color: '#555555', isHabitable: false, hasSpectrum: true,  isRejected: true,  category: '已否决' },

  // ── 候选宜居 ──
  { name: 'LHS 1140b',   radius: 1.64, mass: 5.60,  temp: 226,  distance: 49,   period: 24.74,  esi: 0.66, discoveryYear: 2017, discoveryMethod: '凌星法',   color: '#5599bb', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Proxima b',   radius: 1.07, mass: 1.07,  temp: 234,  distance: 4.2,  period: 11.19,  esi: 0.87, discoveryYear: 2016, discoveryMethod: '视向速度法', color: '#66aacc', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'TOI-700d',    radius: 1.14, mass: 1.16,  temp: 269,  distance: 101,  period: 37.43,  esi: 0.80, discoveryYear: 2020, discoveryMethod: '凌星法',   color: '#77bbdd', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'GJ 1061d',    radius: 1.13, mass: 1.64,  temp: 258,  distance: 12,   period: 12.43,  esi: 0.76, discoveryYear: 2020, discoveryMethod: '视向速度法', color: '#88ccdd', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Kepler-452b', radius: 1.63, mass: 5.00,  temp: 265,  distance: 1400, period: 384.84, esi: 0.83, discoveryYear: 2015, discoveryMethod: '凌星法',   color: '#559988', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },

  // ── 有光谱数据 ──
  { name: 'WASP-96b',   radius: 12.0, mass: 153,   temp: 1285, distance: 1150, period: 3.43,   esi: 0.00, discoveryYear: 2013, discoveryMethod: '凌星法',   color: '#ff8844', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般', status: 'stable', statusNote: '韦伯首张系外行星光谱 · 2022', lastUpdated: '2026.06' },
  { name: 'WASP-39b',   radius: 12.7, mass: 89,    temp: 1173, distance: 700,  period: 4.06,   esi: 0.00, discoveryYear: 2011, discoveryMethod: '凌星法',   color: '#ff9944', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: 'HD 189733b', radius: 11.4, mass: 363,   temp: 1200, distance: 63,   period: 2.22,   esi: 0.00, discoveryYear: 2005, discoveryMethod: '凌星法',   color: '#ff6633', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: 'GJ 1214b',   radius:  2.68, mass: 8.17, temp: 393,  distance: 48,   period: 1.58,   esi: 0.40, discoveryYear: 2009, discoveryMethod: '凌星法',   color: '#cc7744', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: 'LTT 9779b',  radius:  4.72, mass: 29.3, temp: 2000, distance: 263,  period: 0.79,   esi: 0.00, discoveryYear: 2020, discoveryMethod: '凌星法',   color: '#ff4422', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: '55 Cnc e',   radius:  1.88, mass: 8.08, temp: 2000, distance: 41,   period: 0.74,   esi: 0.00, discoveryYear: 2004, discoveryMethod: '视向速度法', color: '#ff3311', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },

  // ── 更多候选 ──
  { name: 'GJ 667Cc',   radius: 1.54, mass: 3.80,  temp: 277,  distance: 22,   period: 28.14,  esi: 0.84, discoveryYear: 2011, discoveryMethod: '视向速度法', color: '#88aacc', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Kepler-186f', radius: 1.11, mass: 1.40, temp: 188,  distance: 582,  period: 129.94, esi: 0.61, discoveryYear: 2014, discoveryMethod: '凌星法',   color: '#7799bb', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Ross 128b',   radius: 1.10, mass: 1.40, temp: 280,  distance: 11,   period: 9.87,   esi: 0.86, discoveryYear: 2017, discoveryMethod: '视向速度法', color: '#99bbdd', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Teegarden b', radius: 1.02, mass: 1.05, temp: 301,  distance: 12,   period: 4.91,   esi: 0.95, discoveryYear: 2019, discoveryMethod: '视向速度法', color: '#aaccee', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'GJ 1002b',   radius: 1.05, mass: 1.08, temp: 258,  distance: 16,   period: 10.35,  esi: 0.90, discoveryYear: 2022, discoveryMethod: '视向速度法', color: '#88ccdd', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },

  // ── 热木星（对比用） ──
  { name: 'WASP-12b',   radius: 18.3, mass: 467,   temp: 2500, distance: 1400, period: 1.09,   esi: 0.00, discoveryYear: 2008, discoveryMethod: '凌星法',   color: '#ff2200', isHabitable: false, hasSpectrum: false, isRejected: false, category: '一般' },
  { name: 'WASP-17b',   radius: 19.9, mass: 156,   temp: 1550, distance: 1300, period: 3.74,   esi: 0.00, discoveryYear: 2009, discoveryMethod: '凌星法',   color: '#ff5533', isHabitable: false, hasSpectrum: false, isRejected: false, category: '一般' },
  { name: 'HD 209458b', radius: 13.8, mass: 219,   temp: 1130, distance: 153,  period: 3.52,   esi: 0.00, discoveryYear: 1999, discoveryMethod: '凌星法',   color: '#ff7744', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: 'Kepler-7b',  radius: 16.6, mass: 137,   temp: 1630, distance: 3160, period: 4.89,   esi: 0.00, discoveryYear: 2010, discoveryMethod: '凌星法',   color: '#ff6633', isHabitable: false, hasSpectrum: false, isRejected: false, category: '一般' },
]

// ── 地球基准：不进入 keyPlanets（地球是参照系而非系外行星），供“与地球对比”可视化使用 ──
export const EARTH: PlanetData = {
  name: '地球', radius: 1, mass: 1, temp: 288, distance: 0, period: 365.25, esi: 1,
  discoveryYear: 0, discoveryMethod: '—', color: '#4a9ad8',
  isHabitable: true, hasSpectrum: true, isRejected: false, category: '一般',
}

// ── 寄主恒星参数（键为 systemOf 后的系统名；光度/温度/质量为近似值，用于科普级宜居带计算）──
export const starParams: Record<string, { luminosity: number; temp: number; mass: number; spectral: string }> = {
  'TRAPPIST-1': { luminosity: 0.00052, temp: 2566, mass: 0.09,   spectral: 'M8V' },
  'K2-18':      { luminosity: 0.0234,  temp: 3457, mass: 0.495,  spectral: 'M2.5V' },
  'WD 1856':    { luminosity: 0.0005,  temp: 6200, mass: 0.518,  spectral: '白矮星' },
  'LHS 1140':   { luminosity: 0.0039,  temp: 3131, mass: 0.184,  spectral: 'M4.5V' },
  'Proxima':    { luminosity: 0.0017,  temp: 2992, mass: 0.12,   spectral: 'M5.5V' },
  'TOI-700':    { luminosity: 0.0233,  temp: 3480, mass: 0.416,  spectral: 'M2.5V' },
  'GJ 1061':    { luminosity: 0.0017,  temp: 2953, mass: 0.113,  spectral: 'M5.5V' },
  'Kepler-452': { luminosity: 1.11,    temp: 5757, mass: 1.04,   spectral: 'G2V' },
  'WASP-96':    { luminosity: 0.9,     temp: 5540, mass: 1.06,   spectral: 'G8V' },
  'WASP-39':    { luminosity: 1.0,     temp: 5400, mass: 0.93,   spectral: 'G8V' },
  'HD 189733':  { luminosity: 0.328,   temp: 5052, mass: 0.8,    spectral: 'K1.5V' },
  'GJ 1214':    { luminosity: 0.0033,  temp: 3026, mass: 0.15,   spectral: 'M4.5V' },
  'LTT 9779':   { luminosity: 1.1,     temp: 5445, mass: 1.02,   spectral: 'G7V' },
  '55 Cnc':     { luminosity: 0.58,    temp: 5196, mass: 0.96,   spectral: 'K0IV' },
  'GJ 667C':    { luminosity: 0.0137,  temp: 3350, mass: 0.33,   spectral: 'M1.5V' },
  'Kepler-186': { luminosity: 0.0412,  temp: 3755, mass: 0.544,  spectral: 'M1V' },
  'Ross 128':   { luminosity: 0.0036,  temp: 3192, mass: 0.168,  spectral: 'M4V' },
  'Teegarden':  { luminosity: 0.00073, temp: 2904, mass: 0.097,  spectral: 'M7V' },
  'GJ 1002':    { luminosity: 0.0012,  temp: 3024, mass: 0.12,   spectral: 'M5.5V' },
  'WASP-12':    { luminosity: 3.4,     temp: 6360, mass: 1.43,   spectral: 'G0V' },
  'WASP-17':    { luminosity: 2.7,     temp: 6550, mass: 1.2,    spectral: 'F6V' },
  'HD 209458':  { luminosity: 1.79,    temp: 6091, mass: 1.15,   spectral: 'G0V' },
  'Kepler-7':   { luminosity: 2.2,     temp: 5933, mass: 1.36,   spectral: 'G0V' },
}

// ── 宜居带内外边界（AU）：Kopparapu 2013 保守边界近似，内外边界 ∝ √光度 ──
export function habitableZone(luminosity: number): { inner: number; outer: number } {
  return { inner: 0.9 * Math.sqrt(luminosity), outer: 1.7 * Math.sqrt(luminosity) }
}

// ── 轨道半长轴（AU）：开普勒第三定律 a = (P/年)^(2/3) × M^(1/3)，M 为恒星质量（太阳质量）──
export function orbitAU(period: number, mass = 1): number {
  return Math.pow(period / 365.25, 2 / 3) * Math.pow(mass, 1 / 3)
}
