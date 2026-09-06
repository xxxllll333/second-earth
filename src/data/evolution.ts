// 恒星演化阶段数据（类太阳恒星的一生）—— 真实物理量 + 星表呼应
// 用于「时间卷轴」页：拖动时间轴，恒星从幼年主序星 → 壮年 → 红巨星 → 白矮星。
// 数值口径：
//   radiusRSun  真实半径（太阳半径倍数）——红巨星 ~180、白矮星 ~0.009（地球大小），跨越约 2 万倍
//   luminosity  真实光度（太阳光度倍数）——宜居带由 habitableZone(L) 推导，与星系页同一套 Kopparapu 模型
//   tempK       真实表面温度（决定光球颜色）
// 因为真实大小跨 2 万倍无法线性同框，页面主视图用 sceneR() 对数压缩显示，真实值以数字标注 + 对比条给出。

import { habitableZone } from './planets'

// ── 星表呼应：每个演化阶段对应星表里真实存在（或最接近）的行星系统 ──
export interface StageEcho {
  systemName?: string   // starParams 键（用于跳转星系页时定位系统）
  planets: string[]     // 星表中对应此阶段的行星名（可跳转 /galaxy/:name）
  note: string          // 为什么对应；或为何暂无（选择效应）
}

export interface EvolutionStage {
  name: string
  ageLabel: string
  color: [number, number, number]     // 光球基色（RGB，按温度）
  hotColor: [number, number, number]  // 米粒组织亮部（RGB）
  radiusRSun: number                  // 真实半径（R☉）
  tempK: number                       // 真实表面温度
  luminosity: number                  // 真实光度（L☉）
  turb: number                        // 对流湍流强度（shader 参数）
  granFreq: number                    // 米粒组织尺度（shader 频率：红巨星大胞、白矮星细密）
  description: string
  echo: StageEcho
}

export const evolutionStages: EvolutionStage[] = [
  {
    name: '幼年主序星',
    ageLabel: '诞生后 ~1 亿年',
    color: [255, 235, 190],
    hotColor: [255, 247, 214],
    radiusRSun: 0.9,
    tempK: 5600,
    luminosity: 0.7,
    turb: 0.62,
    granFreq: 6.0,
    description: '恒星刚点亮，比现在更暗、更活跃（"暗淡年轻太阳"）。宜居带紧贴恒星——早期地球要靠更强的温室气体才没被冻住。',
    echo: {
      planets: [],
      note: '星表中暂无明确的幼年恒星行星系统：年轻恒星太暗、太活跃，行星信号易被恒星活动淹没——这正是探测的选择效应。我们的太阳也曾如此。',
    },
  },
  {
    name: '主序星 · 壮年',
    ageLabel: '46 亿年 · 此刻的太阳',
    color: [255, 186, 58],
    hotColor: [255, 238, 182],
    radiusRSun: 1.0,
    tempK: 5778,
    luminosity: 1.0,
    turb: 0.5,
    granFreq: 8.0,
    description: '一生最稳定的时期，可持续约百亿年。地球正落在宜居带中央——这是生命从容演化的窗口期。',
    echo: {
      systemName: 'Kepler-452',
      planets: ['Kepler-452b'],
      note: 'Kepler-452b 绕一颗与太阳同为 G2V 型、几乎同温同质量的恒星，被称为"地球表哥"——正是主序壮年恒星旁的行星。',
    },
  },
  {
    name: '红巨星',
    ageLabel: '~120 亿年',
    color: [252, 74, 32],
    hotColor: [255, 150, 74],
    radiusRSun: 180,
    tempK: 3300,
    luminosity: 2000,
    turb: 1.0,
    granFreq: 2.6,
    description: '氢燃料耗尽，核心收缩、外层急剧膨胀变冷变红。光球将抵达约 0.9 AU——水星、金星被吞没，地球被烤成焦土；宜居带被推到几十 AU 之外。',
    echo: {
      systemName: '55 Cnc',
      planets: ['55 Cnc e'],
      note: '星表中尚无确认绕红巨星的行星；55 Cnc 是正在离开主序、开始膨胀的亚巨星（K0IV），55 Cnc e 就绕着它——红巨星阶段的前奏。',
    },
  },
  {
    name: '白矮星',
    ageLabel: '~130 亿年',
    color: [170, 205, 255],
    hotColor: [226, 240, 255],
    radiusRSun: 0.009,
    tempK: 12000,
    luminosity: 0.0015,
    turb: 0.22,
    granFreq: 14.0,
    description: '外层气体散尽，只剩一颗地球大小的炽热内核，用余温缓慢冷却。宜居带缩到 ~0.01 AU——在那里公转一圈只要几小时。',
    echo: {
      systemName: 'WD 1856',
      planets: ['WD 1856b'],
      note: 'WD 1856b 就绕着一颗白矮星，轨道仅 ~0.02 AU——星表中唯一的白矮星行星，是恒星"死后"仍存活的行星。',
    },
  },
]

// ── RGB 颜色线性插值 ──
export function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
// 对数插值：跨数量级的量（半径 / 光度）用它在两阶段间平滑过渡，避免线性插值的突兀跳变
const logLerp = (a: number, b: number, t: number) => Math.pow(10, lerp(Math.log10(a), Math.log10(b), t))

export interface EvolutionState {
  color: [number, number, number]
  hotColor: [number, number, number]
  radiusRSun: number
  tempK: number
  luminosity: number
  habInnerAU: number
  habOuterAU: number
  turb: number
  granFreq: number
  stageIndex: number
  stageName: string
  ageLabel: string
  description: string
  echo: StageEcho
}

// ── 根据滑块进度（0~1）插值当前演化状态 ──
export function interpolateStage(progress: number): EvolutionState {
  const n = evolutionStages.length
  const raw = Math.min(Math.max(progress, 0), 1) * (n - 1)
  // 落在阶段刻度点附近时吸附到整数：点击对比条读数精确，其余位置保持连续插值
  const scaled = Math.abs(raw - Math.round(raw)) < 1e-6 ? Math.round(raw) : raw
  const idx = Math.floor(scaled)
  const t = scaled - idx
  const a = evolutionStages[idx]!
  const b = evolutionStages[Math.min(idx + 1, n - 1)]!
  const luminosity = logLerp(a.luminosity, b.luminosity, t)
  const hz = habitableZone(luminosity)
  return {
    color: lerpColor(a.color, b.color, t),
    hotColor: lerpColor(a.hotColor, b.hotColor, t),
    radiusRSun: logLerp(a.radiusRSun, b.radiusRSun, t),
    tempK: lerp(a.tempK, b.tempK, t),
    luminosity,
    habInnerAU: hz.inner,
    habOuterAU: hz.outer,
    turb: lerp(a.turb, b.turb, t),
    granFreq: lerp(a.granFreq, b.granFreq, t),
    stageIndex: idx,
    stageName: t < 0.5 ? a.name : b.name,
    ageLabel: t < 0.5 ? a.ageLabel : b.ageLabel,
    description: t < 0.5 ? a.description : b.description,
    echo: t < 0.5 ? a.echo : b.echo,
  }
}

// ══════════════════ 场景对数压缩：真实 AU → 世界单位 ══════════════════
// 恒星半径（0.009~180 R☉）与宜居带（0.01~76 AU）跨越 6+ 数量级，线性无法同框。
// 用对数刻度把所有径向距离压进 [SCENE_MIN, SCENE_MAX]，保证四阶段都清晰、次序正确；
// 真实比例由页面的数字标注 + 对比条给出。
export const RSUN_IN_AU = 0.00465047
const AU_MIN = 1e-5
const AU_MAX = 1e2
const SCENE_MIN = 0.45
const SCENE_MAX = 7.0
const LOG_MIN = Math.log10(AU_MIN)
const LOG_SPAN = Math.log10(AU_MAX) - LOG_MIN

export function sceneR(au: number): number {
  const clamped = Math.min(Math.max(au, AU_MIN), AU_MAX)
  return SCENE_MIN + ((Math.log10(clamped) - LOG_MIN) / LOG_SPAN) * (SCENE_MAX - SCENE_MIN)
}
