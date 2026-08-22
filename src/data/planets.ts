// 重点行星硬编码数据（后续替换为后端 API）
// 字段：name, radius(地球=1), temp(K), distance(光年), color, isHabitable, hasSpectrum, isRejected

export interface PlanetData {
  name: string
  radius: number
  temp: number
  distance: number
  color: string       // 伪色
  isHabitable: boolean
  hasSpectrum: boolean
  isRejected: boolean
  category: '主角' | '候选宜居' | '已否决' | '一般'
}

export const keyPlanets: PlanetData[] = [
  // ── 主角行星 ──
  { name: 'K2-18b',     radius: 2.37, temp: 272, distance: 124, color: '#4488cc', isHabitable: true,  hasSpectrum: true,  isRejected: false, category: '主角' },
  { name: 'TRAPPIST-1e', radius: 0.92, temp: 251, distance: 39,  color: '#44cc88', isHabitable: true,  hasSpectrum: true,  isRejected: false, category: '候选宜居' },
  { name: 'TRAPPIST-1f', radius: 1.04, temp: 219, distance: 39,  color: '#66ccaa', isHabitable: true,  hasSpectrum: true,  isRejected: false, category: '候选宜居' },
  { name: 'TRAPPIST-1g', radius: 1.13, temp: 199, distance: 39,  color: '#88ddcc', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'WD 1856b',   radius: 10.0, temp: 163, distance: 80,  color: '#cc8844', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '主角' },

  // ── 已否决 ──
  { name: 'TRAPPIST-1d', radius: 0.77, temp: 286, distance: 39,  color: '#666666', isHabitable: false, hasSpectrum: true,  isRejected: true,  category: '已否决' },
  { name: 'TRAPPIST-1b', radius: 1.09, temp: 400, distance: 39,  color: '#555555', isHabitable: false, hasSpectrum: true,  isRejected: true,  category: '已否决' },
  { name: 'TRAPPIST-1c', radius: 1.06, temp: 342, distance: 39,  color: '#555555', isHabitable: false, hasSpectrum: true,  isRejected: true,  category: '已否决' },

  // ── 候选宜居 ──
  { name: 'LHS 1140b',   radius: 1.64, temp: 226, distance: 49,  color: '#5599bb', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Proxima b',   radius: 1.07, temp: 234, distance: 4.2, color: '#66aacc', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'TOI-700d',    radius: 1.14, temp: 269, distance: 101, color: '#77bbdd', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'GJ 1061d',    radius: 1.13, temp: 258, distance: 12,  color: '#88ccdd', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Kepler-452b', radius: 1.63, temp: 265, distance: 1400, color: '#559988', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },

  // ── 有光谱数据 ──
  { name: 'WASP-96b',   radius: 12.0, temp: 1285, distance: 1150, color: '#ff8844', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: 'WASP-39b',   radius: 12.7, temp: 1173, distance: 700,  color: '#ff9944', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: 'HD 189733b', radius: 11.4, temp: 1200, distance: 63,   color: '#ff6633', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: 'GJ 1214b',   radius:  2.68, temp: 393,  distance: 48,  color: '#cc7744', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: 'LTT 9779b',  radius:  4.72, temp: 2000, distance: 263, color: '#ff4422', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: '55 Cnc e',   radius:  1.88, temp: 2000, distance: 41,  color: '#ff3311', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },

  // ── 更多候选 ──
  { name: 'GJ 667Cc',   radius: 1.54, temp: 277, distance: 22,   color: '#88aacc', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Kepler-186f', radius: 1.11, temp: 188, distance: 582,  color: '#7799bb', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Ross 128b',   radius: 1.10, temp: 280, distance: 11,   color: '#99bbdd', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'Teegarden b', radius: 1.02, temp: 301, distance: 12,   color: '#aaccee', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },
  { name: 'GJ 1002b',   radius: 1.05, temp: 258, distance: 16,   color: '#88ccdd', isHabitable: true,  hasSpectrum: false, isRejected: false, category: '候选宜居' },

  // ── 热木星（对比用） ──
  { name: 'WASP-12b',   radius: 18.3, temp: 2500, distance: 1400, color: '#ff2200', isHabitable: false, hasSpectrum: false, isRejected: false, category: '一般' },
  { name: 'WASP-17b',   radius: 19.9, temp: 1550, distance: 1300, color: '#ff5533', isHabitable: false, hasSpectrum: false, isRejected: false, category: '一般' },
  { name: 'HD 209458b', radius: 13.8, temp: 1130, distance: 153,  color: '#ff7744', isHabitable: false, hasSpectrum: true,  isRejected: false, category: '一般' },
  { name: 'Kepler-7b',  radius: 16.6, temp: 1630, distance: 3160, color: '#ff6633', isHabitable: false, hasSpectrum: false, isRejected: false, category: '一般' },
]
