// 星场组件：Canvas 深空背景（随机星点） + 重点行星光点交互层
// 改造后接收筛选条件与点击回调，供星表页（CatalogPage）使用：
//   filter      — 宜居带/类别筛选
//   searchQuery — 名称搜索关键词
//   onSelect    — 点击行星回调（打开详情卡）
//   selectedName — 当前选中的行星（画高亮圈）

import { useRef, useEffect, useState } from 'react'
import { keyPlanets, PlanetData } from '../data/planets'
import { VISUALS, THEME } from '../config/visuals'

// ── 背景随机星点 ──
interface BgStar {
  x: number
  y: number
  r: number
  opacity: number
  twinkleSpeed: number
  twinkleOffset: number
  bright: boolean   // 亮星：带十字衍射芒
}

// ── 画布上的行星位置 ──
interface PlanetPos {
  planet: PlanetData
  x: number
  y: number
  radius: number  // 屏幕像素
}

// ── 筛选条件 ──
export interface CatalogFilter {
  habitableOnly: boolean
  category: string | null   // null = 全部
}

// ── 确定性伪随机（按名字播种，保证每次刷新抖动一致） ──
function seededRandom(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    return h / 0x7fffffff
  }
}

// 颜色 alpha 追加：'#44cc88' + '55' → '#44cc8855'
const alphaHex = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0')

// 颜色明暗调节：factor > 0 变亮，< 0 变暗，返回 [r, g, b]（用于描边亮化）
function shadeRgb(hex: string, factor: number): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  if (factor >= 0) {
    r += (255 - r) * factor
    g += (255 - g) * factor
    b += (255 - b) * factor
  } else {
    r *= 1 + factor
    g *= 1 + factor
    b *= 1 + factor
  }
  return [r | 0, g | 0, b | 0]
}

// ── 十字衍射芒（韦伯望远镜风格：亮星的四向光芒） ──
function drawSpikes(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, coreR: number, outerR: number,
  color: string, alpha: number,
) {
  ctx.lineWidth = 1
  for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
    const grad = ctx.createLinearGradient(x - dx * outerR, y - dy * outerR, x + dx * outerR, y + dy * outerR)
    grad.addColorStop(0, color + alphaHex(0))
    grad.addColorStop(0.32, color + alphaHex(0))
    grad.addColorStop(0.5, color + alphaHex(alpha))
    grad.addColorStop(0.68, color + alphaHex(0))
    grad.addColorStop(1, color + alphaHex(0))
    ctx.strokeStyle = grad
    ctx.beginPath()
    ctx.moveTo(x - dx * outerR, y - dy * outerR)
    ctx.lineTo(x + dx * outerR, y + dy * outerR)
    ctx.stroke()
  }
  void coreR
}

function generateBgStars(w: number, h: number): BgStar[] {
  const stars: BgStar[] = []
  for (let i = 0; i < VISUALS.starCount; i++) {
    const bright = i < 14   // 前 14 颗是"亮星"
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: bright
        ? 1.2 + Math.random() * 1.2
        : Math.random() * (VISUALS.starMaxRadius - VISUALS.starMinRadius) + VISUALS.starMinRadius,
      opacity: bright
        ? 0.75 + Math.random() * 0.25
        : Math.random() * (VISUALS.starMaxOpacity - VISUALS.starMinOpacity) + VISUALS.starMinOpacity,
      twinkleSpeed: Math.random() * (VISUALS.twinkleSpeedMax - VISUALS.twinkleSpeedMin) + VISUALS.twinkleSpeedMin,
      twinkleOffset: Math.random() * Math.PI * 2,
      bright,
    })
  }
  return stars
}

// 行星标签颜色：宜居绿 / 否决红 / 一般灰白
function labelColor(planet: PlanetData): string {
  if (planet.isRejected) return 'rgba(252,80,60,0.85)'
  if (planet.isHabitable) return 'rgba(110,225,160,0.9)'
  if (planet.category === '主角') return 'rgba(240,240,248,0.92)'
  return 'rgba(160,160,180,0.65)'
}

function layoutPlanets(w: number, h: number): PlanetPos[] {
  const gapX = VISUALS.planetGapX
  const cols = Math.min(VISUALS.maxCols, Math.floor((w - VISUALS.padding * 2) / gapX) + 1)
  const positions: PlanetPos[] = []

  keyPlanets.forEach((planet, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const rand = seededRandom(planet.name)
    // 网格骨架 + 有机抖动 → 自然星图感
    const x = VISUALS.padding
      + col * ((w - VISUALS.padding * 2) / Math.max(cols - 1, 1))
      + (rand() - 0.5) * VISUALS.jitterStrength * 2
    const y = VISUALS.padding + row * VISUALS.planetGapY + VISUALS.planetsOffsetY + 24
      + (rand() - 0.5) * VISUALS.jitterStrength * 1.6

    // 半径映射：太大或太小的行星在屏幕上要限制范围
    const rawRadius = (planet.radius * 3 + 4) * VISUALS.planetSizeScale
    // 重点类别加成，一般行星收敛 → 视觉层次
    const emphasis = planet.category === '主角' || planet.isHabitable ? 1.3 : 0.82
    const radius = Math.max(VISUALS.planetMinRadius, Math.min(rawRadius * emphasis, VISUALS.planetMaxRadius))

    positions.push({ planet, x, y, radius })
  })

  return positions
}

// ── 判断行星是否通过筛选 ──
function passesFilter(planet: PlanetData, filter: CatalogFilter, searchQuery: string): boolean {
  if (filter.habitableOnly && !planet.isHabitable) return false
  if (filter.category && planet.category !== filter.category) return false
  if (searchQuery.trim() && !planet.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false
  return true
}

interface StarFieldProps {
  filter: CatalogFilter
  searchQuery: string
  selectedName: string | null
  onSelect: (planet: PlanetData) => void
}

export default function StarField({ filter, searchQuery, selectedName, onSelect }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hovered, setHovered] = useState<PlanetPos | null>(null)
  const bgStarsRef = useRef<BgStar[]>([])
  const planetsRef = useRef<PlanetPos[]>([])
  const animRef = useRef<number>(0)
  // 保存最新 props 供渲染循环读取（避免每帧重建 effect）
  const propsRef = useRef({ filter, searchQuery, selectedName, onSelect })
  propsRef.current = { filter, searchQuery, selectedName, onSelect }

  // ── 初始化 & resize ──
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let w = window.innerWidth
    let h = window.innerHeight

    function resize() {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * window.devicePixelRatio
      canvas.height = h * window.devicePixelRatio
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
      bgStarsRef.current = generateBgStars(w, h)
      planetsRef.current = layoutPlanets(w, h)
    }
    resize()
    window.addEventListener('resize', resize)

    // ── 渲染循环 ──
    function draw(t: number) {
      ctx.clearRect(0, 0, w, h)
      const { filter: f, searchQuery: q, selectedName: sel } = propsRef.current

      // 0. 星图网格（赤经赤纬参考线）
      if (VISUALS.starChartGrid) {
        const gridSize = 150
        ctx.strokeStyle = 'rgba(255,255,255,0.028)'
        ctx.lineWidth = 1
        for (let gx = gridSize; gx < w; gx += gridSize) {
          ctx.beginPath()
          ctx.moveTo(gx, 0)
          ctx.lineTo(gx, h)
          ctx.stroke()
        }
        for (let gy = gridSize; gy < h; gy += gridSize) {
          ctx.beginPath()
          ctx.moveTo(0, gy)
          ctx.lineTo(w, gy)
          ctx.stroke()
        }
      }

      // 1. 背景星点（亮星带十字芒）
      for (const s of bgStarsRef.current) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset)
        const alpha = s.opacity * (1 - VISUALS.twinkleDepth + VISUALS.twinkleDepth * twinkle)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`
        ctx.fill()
        if (s.bright && VISUALS.diffractionSpikes) {
          drawSpikes(ctx, s.x, s.y, s.r, s.r * 6, '#ffffff', alpha * 0.5)
        }
      }

      // 2. 行星光点
      for (const p of planetsRef.current) {
        const { x, y, radius, planet } = p
        const isHovered = hovered?.planet.name === planet.name
        const isSelected = sel === planet.name
        const visible = passesFilter(planet, f, q)

        // 不满足筛选 → 大幅变暗（保留轮廓便于对比）
        const dimAlpha = 0.1
        const base = visible ? 1 : dimAlpha

        // 光晕：内层紧凑 + 外层大而淡（高级平面感的关键：大、软、透）
        const glowMultiplier = (isHovered || isSelected) ? VISUALS.hoverGlowMultiplier : VISUALS.glowMultiplier
        const g = VISUALS.glowStrength * base
        const innerGlow = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius * 1.6 * glowMultiplier)
        innerGlow.addColorStop(0, planet.color + alphaHex(0.42 * g))
        innerGlow.addColorStop(0.55, planet.color + alphaHex(0.14 * g))
        innerGlow.addColorStop(1, planet.color + '00')
        ctx.beginPath()
        ctx.arc(x, y, radius * 1.6 * glowMultiplier, 0, Math.PI * 2)
        ctx.fillStyle = innerGlow
        ctx.fill()

        const outerGlow = ctx.createRadialGradient(x, y, radius * 0.6, x, y, radius * 3.4)
        outerGlow.addColorStop(0, planet.color + alphaHex(0.1 * g))
        outerGlow.addColorStop(1, planet.color + '00')
        ctx.beginPath()
        ctx.arc(x, y, radius * 3.4, 0, Math.PI * 2)
        ctx.fillStyle = outerGlow
        ctx.fill()

        // 主体：纯色正圆（平面感，无纹理无假明暗）
        ctx.globalAlpha = base
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = planet.color
        ctx.fill()
        // 细描边：比本体亮 25%，让圆更“锋利”
        const [er, eg, eb] = shadeRgb(planet.color, 0.25)
        ctx.strokeStyle = `rgba(${er},${eg},${eb},${0.75 * base})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1

        // 重点行星：细外环（主角白环 / 宜居绿环），星图标注式
        if (visible && (planet.category === '主角' || planet.isHabitable)) {
          const ringColor = planet.isHabitable
            ? `rgba(110,225,160,${0.5 + 0.5 * (isHovered || isSelected ? 1 : 0)})`
            : `rgba(255,255,255,${0.32 + 0.4 * (isHovered || isSelected ? 1 : 0)})`
          ctx.strokeStyle = ringColor
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(x, y, radius + 7, 0, Math.PI * 2)
          ctx.stroke()
        }

        // 已否决的加 X 标记
        if (planet.isRejected && visible) {
          ctx.strokeStyle = `rgba(252,80,60,${0.75 * base})`
          ctx.lineWidth = 1.2
          const s = radius * 0.65
          ctx.beginPath()
          ctx.moveTo(x - s, y - s)
          ctx.lineTo(x + s, y + s)
          ctx.moveTo(x + s, y - s)
          ctx.lineTo(x - s, y + s)
          ctx.stroke()
        }

        // hover 效果：细白圈
        if (isHovered && visible) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(x, y, radius + 6, 0, Math.PI * 2)
          ctx.stroke()
        }

        // 选中效果：常亮外圈
        if (isSelected && visible) {
          ctx.strokeStyle = 'rgba(255,255,255,0.95)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(x, y, radius + 9, 0, Math.PI * 2)
          ctx.stroke()
        }

        // 名字标签：小号细字，星图式标注
        if (VISUALS.planetLabelSize > 0 && visible) {
          const fs = VISUALS.planetLabelSize + (isHovered || isSelected ? 1 : 0)
          ctx.font = `${fs}px ${THEME.monoFont}`
          ctx.textAlign = 'center'
          ctx.fillStyle = labelColor(planet)
          ctx.globalAlpha = isHovered || isSelected ? 1 : 0.9
          ctx.fillText(planet.name, x, y + radius + fs + 8)
          ctx.globalAlpha = 1
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [hovered])

  // ── 鼠标检测 ──
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    let found: PlanetPos | null = null
    for (const p of planetsRef.current) {
      const dx = mx - p.x
      const dy = my - p.y
      if (dx * dx + dy * dy < (p.radius + 10) * (p.radius + 10)) {
        found = p
        break
      }
    }
    setHovered(found)
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    for (const p of planetsRef.current) {
      const dx = mx - p.x
      const dy = my - p.y
      if (dx * dx + dy * dy < (p.radius + 10) * (p.radius + 10)) {
        onSelect(p.planet)
        return
      }
    }
  }

  function handleMouseLeave() {
    setHovered(null)
  }

  // ── 图例类别 ──
  const categories = [
    { label: '主角行星', color: '#ffffff', ring: false },
    { label: '候选宜居', color: '#44cc88', ring: true },
    { label: '已否决', color: '#fc503c', ring: false },
    { label: '一般行星', color: '#8a8a9c', ring: false },
  ]

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: THEME.bg,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, cursor: hovered ? 'pointer' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* 图例 */}
      <div style={{
        position: 'absolute',
        bottom: VISUALS.legendBottom,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: VISUALS.legendGap,
        padding: '10px 22px',
        background: THEME.panelBg,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: 6,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: '0.56rem',
          letterSpacing: '0.3em',
          color: THEME.textFaint,
          textTransform: 'uppercase',
          fontFamily: THEME.monoFont,
          marginRight: 2,
        }}>
          Legend
        </span>
        {categories.map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: VISUALS.legendDotSize, height: VISUALS.legendDotSize, borderRadius: '50%',
              background: c.color, opacity: 0.9,
              boxShadow: c.ring ? `0 0 0 2px rgba(110,225,160,0.5)` : 'none',
            }} />
            <span style={{ color: THEME.textSecondary, fontSize: '0.68rem', fontWeight: 300, letterSpacing: '0.06em' }}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* hover 信息弹窗 */}
      {hovered && (
        <div style={{
          position: 'absolute',
          left: Math.min(hovered.x + 30, window.innerWidth - 200),
          top: Math.max(hovered.y - 50, 66),
          background: 'rgba(9,10,16,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '12px 16px',
          pointerEvents: 'none',
          zIndex: 10,
          minWidth: 170,
        }}>
          <div style={{
            color: THEME.textPrimary,
            fontWeight: 300,
            letterSpacing: '0.08em',
            fontSize: '0.88rem',
            marginBottom: 6,
          }}>
            {hovered.planet.name}
          </div>
          <div className="mono" style={{ color: THEME.textSecondary, fontSize: '0.68rem', lineHeight: 1.7 }}>
            <div>R {hovered.planet.radius} R⊕ · T {hovered.planet.temp} K</div>
            <div>{hovered.planet.distance} ly · P {hovered.planet.period} d</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
              {hovered.planet.isHabitable && (
                <span style={{ color: THEME.accentGreen }}>● 宜居带</span>
              )}
              {hovered.planet.hasSpectrum && (
                <span style={{ color: THEME.accentBlue }}>● 有光谱</span>
              )}
              {hovered.planet.isRejected && (
                <span style={{ color: THEME.accentRed }}>● 已否决</span>
              )}
            </div>
          </div>
          <div style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            color: THEME.textFaint,
            fontSize: '0.62rem',
            letterSpacing: '0.14em',
          }}>
            点击查看档案
          </div>
        </div>
      )}
    </div>
  )
}
