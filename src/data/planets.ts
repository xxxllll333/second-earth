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
}

export const keyPlanets: PlanetData[] = [
  // ── 主角行星 ──
  { name: 'K2-18b',     radius: 2.37, mass: 8.92,   temp: 272,  distance: 124,  period: 32.94,  esi: 0.73, discoveryYear: 2015, discoveryMethod: '凌星法',   color: '#4488cc', isHabitable: true,  hasSpectrum: true,  isRejected: false, category: '主角' },
  { name: 'TRAPPIST-1e', radius: 0.92, mass: 0.69,  temp: 251,  distance: 39,   period: 6.10,   esi: 0.85, discoveryYear: 2017, discoveryMethod: '凌星法',   color: '#44cc88', isHabitable: true,  hasSpectrum: true,  isRejected: false, category: '候选宜居' },
  { name: 'TRAPPIST-1f', radius: 1.04, mass: 0.68,  temp: 219,  distance: 39,   period: 9.21,   esi: 0.68, discoveryYear: 2017, discoveryMethod: '凌星法',   color: '#66ccaa', isHabitable: true,  hasSpectrum: true,  isRejected: false, category: '候选宜居' },
  { name: 'TRAPPIST-1g', radius: 1.13, mass: 1.34,  temp: 199,  distance: 39,   period: 12.35,  esi: 0.58, discoveryYear: 2017, discoveryMethod: '凌星法',   color: '#88ddcc', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'WD 1856b',   radius: 10.0, mass: 4387,  temp: 163,  distance: 80,   period: 1.41,   esi: 0.00, discoveryYear: 2020, discoveryMethod: '凌星法',   color: '#cc8844', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '主角' },

  // ── 已否决 ──
  { name: 'TRAPPIST-1d', radius: 0.77, mass: 0.39,  temp: 286,  distance: 39,   period: 4.05,   esi: 0.90, discoveryYear: 2016, discoveryMethod: '凌星法',   color: '#666666', isHabitable: false, hasSpectrum: true,  isRejected: true,  category: '已否决' },
  { name: 'TRAPPIST-1b', radius: 1.09, mass: 1.37,  temp: 400,  distance: 39,   period: 1.51,   esi: 0.50, discoveryYear: 2016, discoveryMethod: '凌星法',   color: '#555555', isHabitable: false, hasSpectrum: true,  isRejected: true,  category: '已否决' },
  { name: 'TRAPPIST-1c', radius: 1.06, mass: 1.31,  temp: 342,  distance: 39,   period: 2.42,   esi: 0.60, discoveryYear: 2016, discoveryMethod: '凌星法',   color: '#555555', isHabitable: false, hasSpectrum: true,  isRejected: true,  category: '已否决' },

  // ── 候选宜居 ──
  { name: 'LHS 1140b',   radius: 1.64, mass: 5.60,  temp: 226,  distance: 49,   period: 24.74,  esi: 0.66, discoveryYear: 2017, discoveryMethod: '凌星法',   color: '#5599bb', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Proxima b',   radius: 1.07, mass: 1.07,  temp: 234,  distance: 4.2,  period: 11.19,  esi: 0.87, discoveryYear: 2016, discoveryMethod: '视向速度法', color: '#66aacc', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'TOI-700d',    radius: 1.14, mass: 1.16,  temp: 269,  distance: 101,  period: 37.43,  esi: 0.80, discoveryYear: 2020, discoveryMethod: '凌星法',   color: '#77bbdd', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'GJ 1061d',    radius: 1.13, mass: 1.64,  temp: 258,  distance: 12,   period: 12.43,  esi: 0.76, discoveryYear: 2020, discoveryMethod: '视向速度法', color: '#88ccdd', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Kepler-452b', radius: 1.63, mass: 5.00,  temp: 265,  distance: 1400, period: 384.84, esi: 0.83, discoveryYear: 2015, discoveryMethod: '凌星法',   color: '#559988', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },

  // ── 有光谱数据 ──
  { name: 'WASP-96b',   radius: 12.0, mass: 153,   temp: 1285, distance: 1150, period: 3.43,   esi: 0.00, discoveryYear: 2013, discoveryMethod: '凌星法',   color: '#ff8844', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
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
