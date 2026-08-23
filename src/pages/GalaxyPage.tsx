// 星系视图页（层级二 · 中景）：行星轨道图（Canvas） + 参数雷达图（SVG）
// 轨道半径按开普勒第三定律由周期推算：a ∝ period^(2/3)（假设恒星质量≈太阳）
// 支持从路由参数 /galaxy/:name 指定行星，或页面内下拉切换

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { keyPlanets, PlanetData } from '../data/planets'
import PageHeader from '../components/PageHeader'
import { THEME } from '../config/visuals'

// ── 轨道图参数 ──
const ORBIT_SIZE = 560
const CENTER = ORBIT_SIZE / 2
const STAR_RADIUS = 26

// ── 雷达图五维归一化（0~1） ──
function radarValues(p: PlanetData): number[] {
  return [
    Math.min(p.radius / 20, 1),                         // 半径
    Math.min(Math.log10(Math.max(p.mass, 0.1) + 1) / 4, 1), // 质量（对数压缩）
    Math.min(p.temp / 2500, 1),                         // 温度
    Math.min(Math.log10(p.period + 1) / 3, 1),          // 轨道周期（对数压缩）
    Math.min(p.esi, 1),                                 // 地球相似指数
  ]
}

const radarLabels = ['半径', '质量', '温度', '周期', 'ESI']

// ── 轨道图 Canvas 组件 ──
function OrbitCanvas({ planet }: { planet: PlanetData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio
    canvas.width = ORBIT_SIZE * dpr
    canvas.height = ORBIT_SIZE * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, ORBIT_SIZE, ORBIT_SIZE)

    // 轨道半径：开普勒第三定律 a(AU) = period(年)^(2/3)
    const periodYears = planet.period / 365.25
    const orbitAU = Math.pow(periodYears, 2 / 3)
    const maxAU = 6
    const orbitR = 40 + (Math.min(orbitAU, maxAU) / maxAU) * (CENTER - 70)
    const phase = (planet.period * 37) % 360 // 由周期决定固定相位角

    // 网格同心圆（尺度参考）
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath()
      ctx.arc(CENTER, CENTER, (orbitR / 3) * i, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // 中心恒星
    const starGlow = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, STAR_RADIUS * 3)
    starGlow.addColorStop(0, 'rgba(255,220,130,0.9)')
    starGlow.addColorStop(0.4, 'rgba(255,180,80,0.35)')
    starGlow.addColorStop(1, 'rgba(255,180,80,0)')
    ctx.beginPath()
    ctx.arc(CENTER, CENTER, STAR_RADIUS * 3, 0, Math.PI * 2)
    ctx.fillStyle = starGlow
    ctx.fill()

    ctx.beginPath()
    ctx.arc(CENTER, CENTER, STAR_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = '#ffd76e'
    ctx.fill()

    // 轨道椭圆（轻微倾斜增加立体感）
    const tilt = 0.12
    ctx.beginPath()
    ctx.ellipse(CENTER, CENTER, orbitR, orbitR * (1 - tilt), -0.3, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 行星位置（椭圆轨道上）
    const angle = (phase * Math.PI) / 180
    const planetX = CENTER + orbitR * Math.cos(angle)
    const planetY = CENTER + orbitR * (1 - tilt) * Math.sin(angle)

    // 行星光点 + 光晕
    const planetGlow = ctx.createRadialGradient(planetX, planetY, 0, planetX, planetY, 26)
    planetGlow.addColorStop(0, planet.color + 'cc')
    planetGlow.addColorStop(1, planet.color + '00')
    ctx.beginPath()
    ctx.arc(planetX, planetY, 26, 0, Math.PI * 2)
    ctx.fillStyle = planetGlow
    ctx.fill()

    ctx.beginPath()
    ctx.arc(planetX, planetY, 9, 0, Math.PI * 2)
    ctx.fillStyle = planet.color
    ctx.fill()

    // 行星标签
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(planet.name, planetX, planetY - 18)
    ctx.fillStyle = '#888899'
    ctx.font = '10px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(`${orbitAU.toFixed(2)} AU`, planetX, planetY + 26)
  }, [planet])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: ORBIT_SIZE, height: ORBIT_SIZE, maxWidth: '100%' }}
    />
  )
}

// ── 雷达图 SVG 组件 ──
function RadarChart({ planet }: { planet: PlanetData }) {
  const size = 300
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 36
  const values = radarValues(planet)

  // 五边形顶点坐标
  function pointAt(i: number, r: number): [number, number] {
    const angle = (Math.PI * 2 * i) / radarLabels.length - Math.PI / 2
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }

  // 网格层（4 层五边形）
  const gridPolygons = [0.25, 0.5, 0.75, 1].map(scale => {
    const pts = radarLabels
      .map((_, i) => pointAt(i, maxR * scale).join(','))
      .join(' ')
    return <polygon key={scale} points={pts} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
  })

  // 轴线
  const axes = radarLabels.map((_, i) => {
    const [x, y] = pointAt(i, maxR)
    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
  })

  // 数据多边形
  const dataPts = values
    .map((v, i) => pointAt(i, maxR * v).join(','))
    .join(' ')

  // 顶点标签
  const labelNodes = radarLabels.map((label, i) => {
    const [x, y] = pointAt(i, maxR + 20)
    return (
      <text
        key={label}
        x={x}
        y={y}
        fill="#888899"
        fontSize={11}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
    )
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridPolygons}
      {axes}
      <polygon
        points={dataPts}
        fill={planet.color + '44'}
        stroke={planet.color}
        strokeWidth={2}
      />
      {labelNodes}
    </svg>
  )
}

export default function GalaxyPage() {
  const { name } = useParams()
  const initial = keyPlanets.find(p => p.name === name) ?? keyPlanets[0]
  const [selectedName, setSelectedName] = useState(initial.name)
  const planet = keyPlanets.find(p => p.name === selectedName) ?? keyPlanets[0]

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: 76,
      background: THEME.bg,
      color: THEME.textPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <PageHeader
        enLabel="Planetary Systems"
        title="星系视图"
        subtitle="轨道尺度按开普勒定律由周期推算 · 演示数据"
      />

      {/* 行星选择器 */}
      <select
        value={selectedName}
        onChange={e => setSelectedName(e.target.value)}
        style={{
          padding: '8px 16px',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.12)',
          background: '#0d0e16',
          color: THEME.textPrimary,
          fontSize: '0.82rem',
          fontWeight: 300,
          letterSpacing: '0.06em',
          marginBottom: 22,
          outline: 'none',
        }}
      >
        {keyPlanets.map(p => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        {/* 左：轨道图 */}
        <div style={{
          background: 'rgba(255,255,255,0.015)',
          border: `1px solid ${THEME.panelBorder}`,
          borderRadius: 10,
          padding: 16,
        }}>
          <OrbitCanvas planet={planet} />
        </div>

        {/* 右：雷达图 + 参数 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ color: THEME.textPrimary, fontSize: '0.95rem', fontWeight: 300, letterSpacing: '0.1em' }}>
            {planet.name}
          </div>
          <RadarChart planet={planet} />
          <div className="mono" style={{ color: THEME.textFaint, fontSize: '0.68rem' }}>
            {planet.discoveryYear} · {planet.discoveryMethod}
          </div>
        </div>
      </div>
    </div>
  )
}
