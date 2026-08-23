// 模拟 JWST 透射光谱数据
// 数据结构与后端对接协议 spectra.json 完全一致：
//   planet / instrument / wavelength_um / flux / error / molecules
// 后端真实光谱 JSON 到达后，删除本文件、改为读取 public/data/spectra.json 即可。
// 模拟曲线 = 平缓基线 + 分子吸收谷（高斯凹陷）+ 观测噪声，用于演示交互与视觉。

export interface SpectrumData {
  planet: string
  instrument: string
  wavelengthUm: number[]
  flux: number[]
  error: number[]
  molecules: string[]
}

// ── 确定性伪随机（保证每次加载曲线一致） ──
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// ── 生成一条模拟光谱 ──
function generateSpectrum(
  planet: string,
  instrument: string,
  seed: number,
  absorptionBands: { center: number; depth: number; width: number }[],
  molecules: string[],
): SpectrumData {
  const rand = seededRandom(seed)
  const n = 90
  const wMin = 0.6
  const wMax = 5.2
  const wavelengths: number[] = []
  const flux: number[] = []
  const error: number[] = []

  for (let i = 0; i < n; i++) {
    const w = wMin + (i / (n - 1)) * (wMax - wMin)
    // 基线：随波长平缓下降
    const base = 1 - 0.18 * Math.log(w / wMin) / Math.log(wMax / wMin)
    // 分子吸收谷
    let f = base
    for (const band of absorptionBands) {
      const d = (w - band.center) / band.width
      f -= band.depth * Math.exp(-(d * d) / 2)
    }
    // 噪声
    const noise = (rand() - 0.5) * 0.03
    wavelengths.push(Number(w.toFixed(3)))
    flux.push(Number(Math.max(0.05, f + noise).toFixed(4)))
    error.push(Number((0.02 + rand() * 0.02).toFixed(4)))
  }

  return { planet, instrument, wavelengthUm: wavelengths, flux, error, molecules }
}

export const spectra: SpectrumData[] = [
  generateSpectrum(
    'K2-18b',
    'JWST NIRSpec G395H',
    20260822,
    [
      { center: 2.3, depth: 0.16, width: 0.18 },
      { center: 3.3, depth: 0.20, width: 0.22 },
      { center: 4.3, depth: 0.12, width: 0.25 },
      { center: 2.8, depth: 0.05, width: 0.15 },
    ],
    ['CH₄', 'CO₂', 'DMS?'],
  ),
  generateSpectrum(
    'WASP-96b',
    'JWST NIRISS SOSS',
    20260801,
    [
      { center: 1.4, depth: 0.22, width: 0.16 },
      { center: 1.9, depth: 0.10, width: 0.18 },
    ],
    ['H₂O'],
  ),
  generateSpectrum(
    'HD 189733b',
    'JWST NIRCam Grism',
    20260715,
    [
      { center: 1.4, depth: 0.12, width: 0.15 },
      { center: 1.9, depth: 0.14, width: 0.17 },
      { center: 2.3, depth: 0.10, width: 0.16 },
      { center: 4.3, depth: 0.15, width: 0.22 },
    ],
    ['H₂O', 'CH₄', 'CO₂'],
  ),
]

// ── 无大气模型基线：与观测曲线同波长的平滑曲线（用于滑块对比） ──
export function generateNoAtmosphereBaseline(spectrum: SpectrumData): number[] {
  const { wavelengthUm } = spectrum
  return wavelengthUm.map(w => {
    const base = 1 - 0.18 * Math.log(w / 0.6) / Math.log(5.2 / 0.6)
    return Number(base.toFixed(4))
  })
}
