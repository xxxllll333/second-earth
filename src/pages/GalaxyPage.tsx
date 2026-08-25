// 星系视图页（层级二 · 中景）：三栏工作台布局
//   左栏：目标列表（分组缩略图 + 名字 + 状态标记）——点击任意目标，相机在空间内丝滑飞行到其所在星系并聚焦
//   中间：3D 星系场景（恒星 + 轨道 + 程序化星球公转，拖拽旋转 / 滚轮缩放 / 点击星球）
//   右栏：数据可视化面板（状态徽章 + 雷达图 + 指标条 + 发现信息）
// 轨道半径按开普勒第三定律由周期推算：a ∝ period^(2/3)（假设恒星质量≈太阳）
// 支持从路由参数 /galaxy/:name 指定初始行星

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { keyPlanets, PlanetData } from '../data/planets'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import SystemView3D, { planetsOfSystem, systemOf } from '../components/SystemView3D'
import { THEME } from '../config/visuals'

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

// ── 雷达图 SVG 组件 ──
function RadarChart({ planet }: { planet: PlanetData }) {
  const size = 264
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 34
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
    const [x, y] = pointAt(i, maxR + 18)
    return (
      <text
        key={label}
        x={x}
        y={y}
        fill="#888899"
        fontSize={10}
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

// ── 指标条：左标签、右数值（等宽字体）、渐变填充条 ──
function MetricBar({ label, display, pct, color }: { label: string; display: string; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: '0.64rem', letterSpacing: '0.12em', color: THEME.textFaint }}>{label}</span>
        <span className="mono" style={{ fontSize: '0.68rem', color: THEME.textSecondary }}>{display}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.round(Math.max(pct, 0.02) * 100)}%`,
            background: `linear-gradient(90deg, ${color}33, ${color})`,
            borderRadius: 2,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}

// ── 指标定义：归一化函数（对数压缩跨量级数据） ──
const METRICS: { label: string; get: (p: PlanetData) => { display: string; pct: number } }[] = [
  { label: '半径', get: p => ({ display: `${p.radius} R⊕`, pct: Math.min(Math.log10(p.radius + 1) / 1.3, 1) }) },
  { label: '质量', get: p => ({ display: `${p.mass >= 100 ? Math.round(p.mass) : p.mass} M⊕`, pct: Math.min(Math.log10(p.mass + 1) / 3.6, 1) }) },
  { label: '平衡温度', get: p => ({ display: `${Math.round(p.temp)} K`, pct: Math.min(p.temp / 2500, 1) }) },
  { label: '轨道周期', get: p => ({ display: `${p.period} d`, pct: Math.min(Math.log10(p.period + 1) / 3, 1) }) },
  { label: '距离', get: p => ({ display: `${p.distance} ly`, pct: Math.min(Math.log10(p.distance + 1) / 4, 1) }) },
  { label: 'ESI 相似度', get: p => ({ display: p.esi.toFixed(2), pct: p.esi }) },
]

// ── 左栏分组（与星表页分类一致） ──
const CATEGORY_EN: Record<PlanetData['category'], string> = {
  '主角': 'FEATURED',
  '候选宜居': 'HABITABLE CANDIDATES',
  '已否决': 'REJECTED',
  '一般': 'SPECTRAL TARGETS',
}
const CATEGORY_ORDER: PlanetData['category'][] = ['主角', '候选宜居', '已否决', '一般']

// ── 左栏：目标列表 ──
function TargetSidebar({ selectedName, onSelect }: { selectedName: string; onSelect: (name: string) => void }) {
  const groups = useMemo(
    () => CATEGORY_ORDER.map(cat => ({ cat, planets: keyPlanets.filter(p => p.category === cat) })),
    [],
  )

  return (
    <div style={{
      width: 248,
      flexShrink: 0,
      height: 660,
      border: `1px solid ${THEME.panelBorder}`,
      borderRadius: 10,
      background: 'rgba(255,255,255,0.015)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 栏头 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${THEME.panelBorder}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span className="mono" style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: THEME.textSecondary }}>
          TARGETS
        </span>
        <span className="mono" style={{ fontSize: '0.56rem', color: THEME.textFaint }}>
          {keyPlanets.length} BODIES
        </span>
      </div>

      {/* 分组列表 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {groups.map(g => (
          <div key={g.cat}>
            <div
              className="mono"
              style={{ padding: '14px 16px 6px', fontSize: '0.54rem', letterSpacing: '0.26em', color: THEME.textFaint }}
            >
              {CATEGORY_EN[g.cat]}
            </div>
            {g.planets.map(p => {
              const selected = p.name === selectedName
              return (
                <motion.button
                  key={p.name}
                  onClick={() => onSelect(p.name)}
                  animate={{ background: selected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0)' }}
                  whileHover={{ background: 'rgba(255,255,255,0.05)' }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '9px 14px 9px 16px',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    position: 'relative',
                    color: selected ? THEME.textPrimary : THEME.textSecondary,
                  }}
                >
                  {/* 选中指示红条 */}
                  {selected && (
                    <motion.div
                      layoutId="target-active"
                      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: THEME.accentRed }}
                    />
                  )}
                  {/* 色球缩略图：径向渐变模拟受光球面 */}
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: `radial-gradient(circle at 33% 30%, #ffffffcc, ${p.color} 46%, #000000 150%)`,
                      boxShadow: `0 0 10px ${p.color}55`,
                      opacity: p.isRejected ? 0.55 : 1,
                    }}
                  />
                  <span style={{
                    flex: 1,
                    fontSize: '0.78rem',
                    fontWeight: selected ? 400 : 300,
                    letterSpacing: '0.05em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </span>
                  {p.isRejected && (
                    <span className="mono" style={{ color: THEME.accentRed, fontSize: '0.62rem' }}>✕</span>
                  )}
                  {p.isHabitable && !p.isRejected && (
                    <span style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: THEME.accentGreen,
                      boxShadow: `0 0 5px ${THEME.accentGreen}`,
                    }} />
                  )}
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 右栏：数据可视化面板 ──
function DataPanel({ planet }: { planet: PlanetData }) {
  return (
    <div style={{
      width: 320,
      flexShrink: 0,
      height: 660,
      border: `1px solid ${THEME.panelBorder}`,
      borderRadius: 10,
      background: 'rgba(255,255,255,0.015)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 内容随选中行星切换做淡入过渡 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={planet.name}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
        >
          {/* 头部：类别微标签 + 行星名 + 状态徽章 */}
          <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${THEME.panelBorder}` }}>
            <div className="mono" style={{ fontSize: '0.56rem', letterSpacing: '0.32em', color: planet.color }}>
              {CATEGORY_EN[planet.category]}
            </div>
            <div style={{ fontSize: '1.28rem', fontWeight: 200, letterSpacing: '0.12em', marginTop: 5 }}>
              {planet.name}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge planet={planet} compact />
              {planet.hasSpectrum && (
                <span
                  className="mono"
                  style={{
                    padding: '4px 10px',
                    borderRadius: 3,
                    border: `1px solid ${THEME.accentBlue}44`,
                    background: `${THEME.accentBlue}0d`,
                    fontSize: '0.6rem',
                    letterSpacing: '0.06em',
                    color: THEME.accentBlue,
                  }}
                >
                  光谱档案
                </span>
              )}
            </div>
          </div>

          {/* 雷达图 */}
          <div style={{ padding: '8px 0 2px', display: 'flex', justifyContent: 'center' }}>
            <RadarChart planet={planet} />
          </div>

          {/* 指标条 */}
          <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {METRICS.map(m => {
              const { display, pct } = m.get(planet)
              return <MetricBar key={m.label} label={m.label} display={display} pct={pct} color={planet.color} />
            })}
          </div>

          {/* 底部：发现信息 + 状态标记 */}
          <div className="mono" style={{
            marginTop: 'auto',
            padding: '11px 20px',
            borderTop: `1px solid ${THEME.panelBorder}`,
            fontSize: '0.62rem',
            letterSpacing: '0.06em',
            color: THEME.textFaint,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{planet.discoveryYear} · {planet.discoveryMethod}</span>
            <span style={{ color: planet.isRejected ? THEME.accentRed : planet.isHabitable ? THEME.accentGreen : THEME.textFaint }}>
              {planet.isRejected ? '已否决' : planet.isHabitable ? '宜居带' : planet.hasSpectrum ? '有光谱' : ''}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function GalaxyPage() {
  const { name } = useParams()
  const initial = keyPlanets.find(p => p.name === name) ?? keyPlanets[0]
  const [selectedName, setSelectedName] = useState(initial.name)
  const planet = keyPlanets.find(p => p.name === selectedName) ?? keyPlanets[0]
  const systemPlanets = useMemo(() => planetsOfSystem(planet.name), [planet.name])

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: 76,
      paddingBottom: 48,
      background: THEME.bg,
      color: THEME.textPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <PageHeader
        enLabel="Planetary Systems"
        title="星系视图"
        subtitle="点击左侧目标，飞向它的星系 · 拖拽旋转 · 滚轮缩放"
      />

      {/* 三栏工作台 */}
      <div style={{
        display: 'flex',
        gap: 18,
        width: 1360,
        maxWidth: '97vw',
        alignItems: 'stretch',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {/* 左：目标列表 */}
        <TargetSidebar selectedName={selectedName} onSelect={setSelectedName} />

        {/* 中：3D 星系场景 */}
        <div style={{
          flex: '1 1 620px',
          minWidth: 560,
          maxWidth: 780,
          height: 660,
          border: `1px solid ${THEME.panelBorder}`,
          borderRadius: 10,
          overflow: 'hidden',
          position: 'relative',
          background: '#04050a',
        }}>
          <SystemView3D planets={systemPlanets} selectedName={selectedName} onSelect={setSelectedName} />

          {/* 场景内信息 overlay：当前系统 + 聚焦目标 */}
          <div style={{ position: 'absolute', top: 14, left: 16, zIndex: 10, pointerEvents: 'none' }}>
            <div className="mono" style={{ fontSize: '0.62rem', letterSpacing: '0.3em', color: THEME.textSecondary }}>
              {systemOf(planet.name)}
            </div>
            <div style={{ fontSize: '0.7rem', color: THEME.textFaint, marginTop: 3, letterSpacing: '0.08em' }}>
              {systemPlanets.length} 颗已知行星 · 聚焦 {planet.name}
            </div>
          </div>
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 16,
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: '0.62rem',
            letterSpacing: '0.1em',
            color: THEME.textFaint,
          }}>
            拖拽旋转 · 滚轮缩放 · 点击星球切换
          </div>
        </div>

        {/* 右：数据可视化 */}
        <DataPanel planet={planet} />
      </div>
    </div>
  )
}
