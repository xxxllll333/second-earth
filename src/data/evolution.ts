// 恒星演化阶段数据（类太阳恒星的一生）
// 用于"时间卷轴"页面：拖动时间轴，恒星从主序星 → 红巨星 → 白矮星
// 每个阶段记录：恒星颜色(RGB)、相对半径、宜居带内/外边界(AU)、科普文案

export interface EvolutionStage {
  name: string
  ageLabel: string
  color: [number, number, number] // RGB
  radius: number                  // 相对当前太阳的倍数
  tempK: number                   // 表面温度
  habInner: number                // 宜居带内边界（AU）
  habOuter: number                // 宜居带外边界（AU）
  description: string
}

export const evolutionStages: EvolutionStage[] = [
  {
    name: '幼年主序星',
    ageLabel: '诞生后 1 亿年',
    color: [255, 244, 214],
    radius: 0.9,
    tempK: 5600,
    habInner: 0.85,
    habOuter: 1.2,
    description: '恒星刚点亮，比现在暗一点。宜居带紧贴着恒星，行星想待在"舒适区"里，得离得更近。',
  },
  {
    name: '主序星 · 壮年',
    ageLabel: '46 亿年 · 此刻的太阳',
    color: [255, 215, 110],
    radius: 1.0,
    tempK: 5778,
    habInner: 0.95,
    habOuter: 1.67,
    description: '恒星一生最稳定的时期，持续约百亿年。地球正落在宜居带中央——这是生命从容演化的窗口期。',
  },
  {
    name: '红巨星',
    ageLabel: '100 亿年',
    color: [255, 140, 66],
    radius: 2.2,
    tempK: 3500,
    habInner: 1.8,
    habOuter: 3.5,
    description: '氢燃料耗尽，恒星急剧膨胀、表面变冷变红。宜居带被推向外侧——曾经宜居的行星将被烤干。',
  },
  {
    name: '白矮星',
    ageLabel: '120 亿年',
    color: [207, 232, 255],
    radius: 0.12,
    tempK: 12000,
    habInner: 0.25,
    habOuter: 0.55,
    description: '外层气体散尽，只剩一颗地球大小的炽热内核，用余温缓慢冷却。WD 1856b 就绕着一颗这样的恒星。',
  },
]

// ── RGB 颜色线性插值（滑块在两个阶段之间过渡用） ──
export function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

// ── 根据滑块进度（0~1）插值当前演化状态 ──
export function interpolateStage(progress: number): {
  color: [number, number, number]
  radius: number
  habInner: number
  habOuter: number
  stageIndex: number
  stageName: string
  ageLabel: string
  description: string
} {
  const n = evolutionStages.length
  const scaled = Math.min(progress, 0.999) * (n - 1)
  const idx = Math.floor(scaled)
  const t = scaled - idx
  const a = evolutionStages[idx]
  const b = evolutionStages[Math.min(idx + 1, n - 1)]

  return {
    color: lerpColor(a.color, b.color, t),
    radius: a.radius + (b.radius - a.radius) * t,
    habInner: a.habInner + (b.habInner - a.habInner) * t,
    habOuter: a.habOuter + (b.habOuter - a.habOuter) * t,
    stageIndex: idx,
    stageName: t < 0.5 ? a.name : b.name,
    ageLabel: t < 0.5 ? a.ageLabel : b.ageLabel,
    description: t < 0.5 ? a.description : b.description,
  }
}
