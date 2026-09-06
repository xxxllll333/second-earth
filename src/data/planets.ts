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

// ── 卡片一句话描述（我的星表/星表卡片用）：事实与全站科学口径一致，≤两行 ──
export const PLANET_BLURB: Record<string, string> = {
  'K2-18b': '红矮星宜居带里的亚海王星；JWST 读到甲烷与 CO₂，DMS 信号待复测。',
  'TRAPPIST-1e': '超冷红矮星宜居带的岩石行星；七星系统之一，JWST 大气观测进行中。',
  'TRAPPIST-1f': '七星系统中段的岩石行星，可能被全球性海洋覆盖。',
  'TRAPPIST-1g': '七星中最大的一颗，居宜居带外缘，或为冰洋世界。',
  'WD 1856b': '幸存于宿主星死亡之后的木星级行星，今绕白矮星运行；形成机制未解。',
  'TRAPPIST-1d': '曾是宜居带头号候选；2025 年 JWST 证实无大气层而被否决。',
  'TRAPPIST-1b': '七星中最内侧的岩石行星，表面约 400 K，无大气迹象。',
  'TRAPPIST-1c': '金星式条件的岩石行星，观测暗示大气极薄或不存在。',
  'LHS 1140b': '绕安静 M 矮星的超级地球，海洋世界的有力候选。',
  'Proxima b': '距地球最近的系外行星（4.2 ly），宜居带内但饱受恒星耀斑轰击。',
  'TOI-700d': 'TESS 发现的 M 矮星宜居带地球尺寸行星。',
  'GJ 1061d': '近邻红矮星三行星系统的最外侧一颗，落在宜居带内。',
  'Kepler-452b': '绕一颗比太阳更年长的类日恒星，人称“地球的表哥”。',
  'WASP-96b': '热土星；JWST 首张系外行星光谱的主角，读到水汽。',
  'WASP-39b': '蓬松的热土星；JWST 在其大气中首次检测到 CO₂。',
  'HD 189733b': '著名的“钴蓝”热木星，下着硅酸盐雨、刮着公里级风暴。',
  'GJ 1214b': '迷你海王星“水世界”原型，终年裹着厚霾。',
  'LTT 9779b': '超热海王星，大气含金属云，表面反亮如镜。',
  '55 Cnc e': '熔岩超级地球，一年仅 18 小时，表面是岩浆洋。',
  'GJ 667Cc': '三合星系统中 M 矮星宜居带内的超级地球。',
  'Kepler-186f': '首颗在宜居带里发现的地球尺寸行星（2014），绕 M 矮星。',
  'Ross 128b': '11 光年外的温和岩石行星，宿主是出了名安静的红矮星。',
  'Teegarden b': '绕已知最冷恒星系统之一运行，ESI 高达 0.95。',
  'GJ 1002b': '近邻 M 矮星宜居带里两颗类地行星之一。',
  'WASP-12b': '正被宿主星撕裂吞噬的超热木星。',
  'WASP-17b': '已知最大最蓬松的行星之一；JWST 读到二氧化硅尘埃。',
  'HD 209458b': '“奥西里斯”：首颗被观测到凌星的系外行星，大气正被恒星风剥离。',
  'Kepler-7b': '开普勒早期发现：低密度膨胀行星，云层反照率极高。',
}

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

// ── 寄主恒星真实天球坐标（J2000 赤道坐标，单位：度）──
// 键同 starParams（systemOf 去尾字母后的系统名）。用于星表“探索模式”把 28 颗
// 行星按真实朝向散布在太阳周围，构成真实 3D 星图。数值取自公开发布的恒星 J2000 位置。
export const starCoords: Record<string, { ra: number; dec: number }> = {
  'TRAPPIST-1': { ra: 346.622, dec: -5.041 },   // 与后端 system_service 一致
  'K2-18':      { ra: 172.560, dec: 7.591 },    // 与后端 system_service 一致
  'Proxima':    { ra: 217.429, dec: -62.679 },
  'WD 1856':    { ra: 284.481, dec: 53.902 },
  'LHS 1140':   { ra: 11.247,  dec: -15.270 },
  'TOI-700':    { ra: 93.350,  dec: -65.532 },
  'GJ 1061':    { ra: 53.986,  dec: -44.513 },
  'Kepler-452': { ra: 295.985, dec: 44.273 },
  'WASP-96':    { ra: 355.928, dec: -47.523 },
  'WASP-39':    { ra: 217.327, dec: -3.444 },
  'HD 189733':  { ra: 300.182, dec: 22.711 },
  'GJ 1214':    { ra: 258.829, dec: 4.964 },
  'LTT 9779':   { ra: 346.604, dec: -39.018 },
  '55 Cnc':     { ra: 133.149, dec: 28.331 },
  'GJ 667C':    { ra: 214.715, dec: -34.989 },
  'Kepler-186': { ra: 298.653, dec: 43.960 },
  'Ross 128':   { ra: 176.935, dec: 0.804 },
  'Teegarden':  { ra: 43.254,  dec: 16.881 },
  'GJ 1002':    { ra: 9.792,   dec: -7.542 },
  'WASP-12':    { ra: 97.637,  dec: 29.672 },
  'WASP-17':    { ra: 239.933, dec: -28.062 },
  'HD 209458':  { ra: 330.795, dec: 18.884 },
  'Kepler-7':   { ra: 288.582, dec: 41.090 },
}

// ── 赤道坐标(J2000) → 银道坐标(l, b)：标准旋转矩阵解析式 ──
// 北银极 (RA 192.85948°, Dec 27.12825°)，北天极银经 l_NCP = 122.93192°。
// 用银道坐标可让邻近恒星自然贴近银河盘面（|b| 多为小值），与银河背景对齐。
export function equatorialToGalactic(raDeg: number, decDeg: number): { l: number; b: number } {
  const D2R = Math.PI / 180
  const raGP = 192.85948 * D2R
  const decGP = 27.12825 * D2R
  const lNCP = 122.93192 * D2R
  const ra = raDeg * D2R
  const dec = decDeg * D2R
  const sinB = Math.sin(decGP) * Math.sin(dec) + Math.cos(decGP) * Math.cos(dec) * Math.cos(ra - raGP)
  const b = Math.asin(Math.max(-1, Math.min(1, sinB)))
  const y = Math.cos(dec) * Math.sin(ra - raGP)
  const x = Math.sin(dec) * Math.cos(decGP) - Math.cos(dec) * Math.sin(decGP) * Math.cos(ra - raGP)
  const l = lNCP - Math.atan2(y, x)
  return { l: (((l / D2R) % 360) + 360) % 360, b: b / D2R }
}

// ── 宜居带内外边界（AU）：Kopparapu 2013 保守边界近似，内外边界 ∝ √光度 ──
export function habitableZone(luminosity: number): { inner: number; outer: number } {
  return { inner: 0.9 * Math.sqrt(luminosity), outer: 1.7 * Math.sqrt(luminosity) }
}

// ── 轨道半长轴（AU）：开普勒第三定律 a = (P/年)^(2/3) × M^(1/3)，M 为恒星质量（太阳质量）──
export function orbitAU(period: number, mass = 1): number {
  return Math.pow(period / 365.25, 2 / 3) * Math.pow(mass, 1 / 3)
}
