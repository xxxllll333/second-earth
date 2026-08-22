import { useRef, useEffect, useState } from 'react'
import { keyPlanets, PlanetData } from '../data/planets'
import { VISUALS } from '../config/visuals'

// ── 背景随机星点 ──
interface BgStar {
  x: number
  y: number
  r: number
  opacity: number
  twinkleSpeed: number
  twinkleOffset: number
}

// ── 画布上的行星位置 ──
interface PlanetPos {
  planet: PlanetData
  x: number
  y: number
  radius: number  // 屏幕像素
}

function generateBgStars(w: number, h: number): BgStar[] {
  const stars: BgStar[] = []
  for (let i = 0; i < VISUALS.starCount; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * (VISUALS.starMaxRadius - VISUALS.starMinRadius) + VISUALS.starMinRadius,
      opacity: Math.random() * (VISUALS.starMaxOpacity - VISUALS.starMinOpacity) + VISUALS.starMinOpacity,
      twinkleSpeed: Math.random() * (VISUALS.twinkleSpeedMax - VISUALS.twinkleSpeedMin) + VISUALS.twinkleSpeedMin,
      twinkleOffset: Math.random() * Math.PI * 2,
    })
  }
  return stars
}

function layoutPlanets(w: number, h: number): PlanetPos[] {
  const gapX = VISUALS.planetGapX
  const cols = Math.min(VISUALS.maxCols, Math.floor((w - VISUALS.padding * 2) / gapX) + 1)
  const positions: PlanetPos[] = []

  keyPlanets.forEach((planet, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = VISUALS.padding + col * ((w - VISUALS.padding * 2) / Math.max(cols - 1, 1))
    const y = VISUALS.padding + row * VISUALS.planetGapY + VISUALS.planetsOffsetY

    // 半径映射：太大或太小的行星在屏幕上要限制范围
    const rawRadius = (planet.radius * 3 + 4) * VISUALS.planetSizeScale
    const radius = Math.max(VISUALS.planetMinRadius, Math.min(rawRadius, VISUALS.planetMaxRadius))

    positions.push({ planet, x, y, radius })
  })

  return positions
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hovered, setHovered] = useState<PlanetPos | null>(null)
  const bgStarsRef = useRef<BgStar[]>([])
  const planetsRef = useRef<PlanetPos[]>([])
  const animRef = useRef<number>(0)

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

      // 1. 背景星点
      for (const s of bgStarsRef.current) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset)
        const alpha = s.opacity * (1 - VISUALS.twinkleDepth + VISUALS.twinkleDepth * twinkle)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`
        ctx.fill()
      }

      // 2. 行星光点
      for (const p of planetsRef.current) {
        const { x, y, radius, planet } = p
        const isHovered = hovered?.planet.name === planet.name

        // 光晕
        const glowMultiplier = isHovered ? VISUALS.hoverGlowMultiplier : VISUALS.glowMultiplier
        const glowRadius = radius * glowMultiplier
        const glow = ctx.createRadialGradient(x, y, radius * 0.3, x, y, glowRadius)
        const alphaHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
        const g = VISUALS.glowStrength
        glow.addColorStop(0, planet.color + alphaHex(0.8 * g))
        glow.addColorStop(0.5, planet.color + alphaHex(0.27 * g))
        glow.addColorStop(1, planet.color + '00')
        ctx.beginPath()
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // 主体圆
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = planet.color
        ctx.fill()

        // 已否决的加 X 标记
        if (planet.isRejected) {
          ctx.strokeStyle = 'rgba(255,100,100,0.7)'
          ctx.lineWidth = 1.5
          const s = radius * 0.7
          ctx.beginPath()
          ctx.moveTo(x - s, y - s)
          ctx.lineTo(x + s, y + s)
          ctx.moveTo(x + s, y - s)
          ctx.lineTo(x - s, y + s)
          ctx.stroke()
        }

        // hover 效果：白圈
        if (isHovered) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, y, radius + 6, 0, Math.PI * 2)
          ctx.stroke()
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

  function handleMouseLeave() {
    setHovered(null)
  }

  // ── 图例类别 ──
  const categories = [
    { label: '主角行星', color: '#ffffff' },
    { label: '候选宜居', color: '#44cc88' },
    { label: '已否决', color: '#ff6464' },
    { label: '一般行星', color: '#888888' },
  ]

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: VISUALS.bgColor,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, cursor: hovered ? 'pointer' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* 标题 */}
      <div style={{
        position: 'absolute',
        top: VISUALS.titleTop,
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#ffffff',
        fontSize: VISUALS.titleSize,
        fontWeight: 300,
        letterSpacing: VISUALS.titleLetterSpacing,
        pointerEvents: 'none',
        textAlign: 'center',
      }}>
        {VISUALS.titleText}
      </div>

      {/* 图例 */}
      <div style={{
        position: 'absolute',
        bottom: VISUALS.legendBottom,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: VISUALS.legendGap,
        pointerEvents: 'none',
      }}>
        {categories.map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: VISUALS.legendDotSize, height: VISUALS.legendDotSize, borderRadius: '50%',
              background: c.color, opacity: 0.85,
            }} />
            <span style={{ color: '#888899', fontSize: '0.75rem' }}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* hover 信息弹窗 */}
      {hovered && (
        <div style={{
          position: 'absolute',
          left: hovered.x + 30,
          top: hovered.y - 50,
          background: VISUALS.tooltipBg,
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: VISUALS.tooltipRadius,
          padding: VISUALS.tooltipPadding,
          pointerEvents: 'none',
          zIndex: 10,
          minWidth: 150,
        }}>
          <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
            {hovered.planet.name}
          </div>
          <div style={{ color: '#888899', fontSize: '0.72rem', lineHeight: 1.6 }}>
            <div>半径 {hovered.planet.radius} R🜨 · 温度 {hovered.planet.temp} K</div>
            <div>距离 {hovered.planet.distance} 光年</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              {hovered.planet.isHabitable && (
                <span style={{ color: '#44cc88' }}>🌍 宜居带</span>
              )}
              {hovered.planet.hasSpectrum && (
                <span style={{ color: '#66aacc' }}>📊 有光谱</span>
              )}
              {hovered.planet.isRejected && (
                <span style={{ color: '#ff6464' }}>✕ 已否决</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
