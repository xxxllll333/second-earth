// 星系视图页（层级二 · 中景）：三栏工作台布局
//   左栏：目标列表（分组缩略图 + 名字 + 状态标记）——点击任意目标，相机在空间内丝滑飞行到其所在星系并聚焦
//   中间：3D 星系场景（恒星 + 轨道 + 程序化星球公转，拖拽旋转 / 滚轮缩放 / 点击星球）
//   右栏：数据可视化面板（状态徽章 + 雷达图 + 指标条 + 发现信息）
// 轨道半径按开普勒第三定律由周期推算：a ∝ period^(2/3)（假设恒星质量≈太阳）
// 支持从路由参数 /galaxy/:name 指定初始行星

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { keyPlanets, PlanetData, EARTH, starParams, habitableZone, orbitAU } from '../data/planets'
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

// ── 轨道行星仪表 SVG 组件（指标值 = 行星在弧形轨道上的位置，天文隐喻）──
// 五条半圆弧轨道：行星值画成实色尾迹弧 + 行星点，地球基准为白色参考点（NASA 克制风，无发光）
function OrbitGauges({ planet }: { planet: PlanetData }) {
  const size = 240 // 宽（面板内宽 280，居中留边）
  const height = 150 // 高（扁长：弧舒展、上方空白少）
  const cx = size / 2
  const cy = height - 16
  const R0 = size / 2 - 30
  const gap = R0 / radarLabels.length // 5 条弧间距 18px，舒展不拥挤
  const values = radarValues(planet)
  const earthVals = radarValues(EARTH)

  const rad = (d: number) => (d * Math.PI) / 180
  // 半圆弧（向上拱）：左端 180° 到右端 0°，sweep=0 经过上方
  const arcPath = (r: number, fromDeg: number, toDeg: number) => {
    const x1 = cx + r * Math.cos(rad(fromDeg))
    const y1 = cy - r * Math.sin(rad(fromDeg))
    const x2 = cx + r * Math.cos(rad(toDeg))
    const y2 = cy - r * Math.sin(rad(toDeg))
    const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0
    return `M${x1},${y1} A${r},${r} 0 ${large} 0 ${x2},${y2}`
  }
  // 值 0~1 → 弧上点（180° 左端 → 0° 右端）
  const ptOn = (r: number, v: number): [number, number] => {
    const deg = 180 - v * 180
    return [cx + r * Math.cos(rad(deg)), cy - r * Math.sin(rad(deg))]
  }

  return (
    <svg key={planet.name} width={size} height={height} viewBox={`0 0 ${size} ${height}`}>
      {radarLabels.map((label, i) => {
        const r = R0 - i * gap
        const v = values[i] ?? 0
        const ev = earthVals[i] ?? 0
        const [kx, ky] = ptOn(r, v)
        const [ex, ey] = ptOn(r, ev)
        return (
          <g key={label}>
            {/* 底轨 */}
            <path d={arcPath(r, 180, 0)} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
            {/* 行星尾迹弧（左端 → 行星位置） */}
            <motion.path
              d={arcPath(r, 180, 180 - v * 180)}
              fill="none"
              stroke={planet.color}
              strokeWidth={1.7}
              strokeOpacity={0.85}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: 'easeOut', delay: i * 0.07 }}
            />
            {/* 地球基准点（白色空心环，避免与行星点粘连混淆） */}
            <circle cx={ex} cy={ey} r={2.6} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={1.2} />
            {/* 行星点（实色，无光晕） */}
            <circle cx={kx} cy={ky} r={2.9} fill={planet.color} />
            {/* 指标名：固定左端弧外（与数值永久分离，不随行星点移动） */}
            <text x={cx - r - 7} y={cy} textAnchor="end" dominantBaseline="middle" fill="#888899" fontSize={8.5} letterSpacing={1}>
              {label}
            </text>
            {/* 归一化值：固定右端弧外，与指标名对称 */}
            <text x={cx + r + 8} y={cy} textAnchor="start" dominantBaseline="middle" fill="rgba(255,255,255,0.55)" fontSize={7.5} letterSpacing={0.3}>
              {Math.round(v * 100)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── 指标条：左标签、右数值（等宽字体）、渐变填充条 + 地球基准刻度线 ──
function MetricBar({ label, display, pct, earthPct, color }: { label: string; display: string; pct: number; earthPct?: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: THEME.textFaint }}>{label}</span>
        <span className="mono" style={{ fontSize: '0.64rem', color: THEME.textSecondary }}>{display}</span>
      </div>
      <div style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.round(Math.max(pct, 0.02) * 100)}%`,
            background: `linear-gradient(90deg, ${color}33, ${color})`,
            borderRadius: 2,
            transition: 'width 0.5s ease',
          }}
        />
        {earthPct !== undefined && (
          <div
            title="地球基准"
            style={{
              position: 'absolute',
              left: `calc(${Math.round(earthPct * 100)}% - 1px)`,
              top: -3,
              width: 2,
              height: 9,
              background: 'rgba(255,255,255,0.8)',
              borderRadius: 1,
            }}
          />
        )}
      </div>
    </div>
  )
}

// ── 指标定义：归一化函数（对数压缩跨量级数据）+ 地球基准刻度位置 ──
const METRICS: { label: string; get: (p: PlanetData) => { display: string; pct: number }; earthPct?: number }[] = [
  { label: '半径', get: p => ({ display: `${p.radius} R⊕`, pct: Math.min(Math.log10(p.radius + 1) / 1.3, 1) }), earthPct: Math.min(Math.log10(2) / 1.3, 1) },
  { label: '质量', get: p => ({ display: `${p.mass >= 100 ? Math.round(p.mass) : p.mass} M⊕`, pct: Math.min(Math.log10(p.mass + 1) / 3.6, 1) }), earthPct: Math.min(Math.log10(2) / 3.6, 1) },
  { label: '平衡温度', get: p => ({ display: `${Math.round(p.temp)} K`, pct: Math.min(p.temp / 2500, 1) }), earthPct: Math.min(288 / 2500, 1) },
  { label: '轨道周期', get: p => ({ display: `${p.period} d`, pct: Math.min(Math.log10(p.period + 1) / 3, 1) }), earthPct: Math.min(Math.log10(366.25) / 3, 1) },
  { label: '距离', get: p => ({ display: `${p.distance} ly`, pct: Math.min(Math.log10(p.distance + 1) / 4, 1) }), earthPct: 0 },
  { label: 'ESI 相似度', get: p => ({ display: p.esi.toFixed(2), pct: p.esi }), earthPct: 1 },
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

// ── 宜居判决：程序化生成“为什么宜居 / 为什么不满足”的判据清单（数据驱动的说理核心）──
type VerdictItem = { ok: 'yes' | 'warn' | 'no'; label: string; note: string }

function verdictItems(p: PlanetData): VerdictItem[] {
  const sys = systemOf(p.name).trim()
  const sp = starParams[sys] ?? { luminosity: 1, temp: 5772, mass: 1, spectral: 'G2V' }
  const hz = habitableZone(sp.luminosity)
  const a = orbitAU(p.period, sp.mass)
  const items: VerdictItem[] = []

  // 1. 宜居带轨道（由恒星亮度推算，Kopparapu 保守边界近似）
  if (a >= hz.inner && a <= hz.outer) {
    items.push({ ok: 'yes', label: '宜居带轨道', note: `${a.toFixed(2)} AU 落在宜居带 ${hz.inner.toFixed(2)}–${hz.outer.toFixed(2)} AU 内` })
  } else if (a >= hz.inner * 0.6 && a <= hz.outer * 1.35) {
    items.push({ ok: 'warn', label: '宜居带轨道', note: `${a.toFixed(2)} AU 处于宜居带边缘（${hz.inner.toFixed(2)}–${hz.outer.toFixed(2)} AU）` })
  } else {
    items.push({ ok: 'no', label: '宜居带轨道', note: a < hz.inner ? `${a.toFixed(2)} AU 远在宜居带内侧（内边界 ${hz.inner.toFixed(2)} AU）` : `${a.toFixed(2)} AU 远在宜居带外侧（外边界 ${hz.outer.toFixed(2)} AU）` })
  }

  // 2. 温度窗口（液态水 223–323 K）
  if (p.temp >= 223 && p.temp <= 323) {
    items.push({ ok: 'yes', label: '温度窗口', note: `${p.temp} K 支持液态水（223–323 K）` })
  } else if (p.temp >= 180 && p.temp <= 373) {
    items.push({ ok: 'warn', label: '温度窗口', note: `${p.temp} K 处于液态水窗口边缘` })
  } else {
    items.push({ ok: 'no', label: '温度窗口', note: `${p.temp} K ${p.temp < 180 ? '过冷' : '过热'}，液态水难以存在` })
  }

  // 3. 岩石地表（半径阈值：≤1.6 岩石 / 1.6–3.5 过渡 / >3.5 气态）
  if (p.radius <= 1.6) {
    items.push({ ok: 'yes', label: '岩石地表', note: `${p.radius} R⊕ 以内，很可能有固态表面` })
  } else if (p.radius <= 3.5) {
    items.push({ ok: 'warn', label: '岩石地表', note: `${p.radius} R⊕，岩石与气态之间（海洋/混合世界）` })
  } else {
    items.push({ ok: 'no', label: '岩石地表', note: `${p.radius} R⊕ 气态巨行星，无固态表面` })
  }

  // 4. 潮汐锁定（红矮星近轨道）
  if (sp.temp < 4000 && p.period < 15) {
    items.push({ ok: 'warn', label: '潮汐锁定', note: `周期仅 ${p.period} 天，可能一面永远朝向恒星` })
  }

  // 5. 大气证据 / 研究结论
  if (p.isRejected && p.statusNote) {
    items.push({ ok: 'no', label: '研究结论', note: p.statusNote })
  } else if (p.hasSpectrum) {
    items.push({ ok: 'yes', label: '大气证据', note: '已有透射光谱，大气成分在研究中' })
  } else {
    items.push({ ok: 'warn', label: '大气证据', note: '尚无大气光谱数据，成分未知' })
  }

  return items
}

const VERDICT_STYLE = {
  yes: { color: '#6ee1a0', mark: '✓' },
  warn: { color: '#e8c56a', mark: '⚠' },
  no: { color: '#e0685a', mark: '✗' },
}

// ── 宜居判决卡 ──
function VerdictCard({ planet }: { planet: PlanetData }) {
  const items = useMemo(() => verdictItems(planet), [planet])
  const title = planet.isRejected ? '否决依据 · WHY REJECTED' : '宜居评估 · HABITABILITY'
  const titleColor = planet.isRejected ? '#e0685a' : '#6ee1a0'
  return (
    <div style={{ padding: '0 20px 10px' }}>
      <div className="mono" style={{ fontSize: '0.54rem', letterSpacing: '0.28em', color: titleColor, marginBottom: 7 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span
              style={{
                color: VERDICT_STYLE[it.ok].color,
                fontSize: '0.72rem',
                lineHeight: 1.1,
                width: 13,
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              {VERDICT_STYLE[it.ok].mark}
            </span>
            <span style={{ fontSize: '0.66rem', color: THEME.textSecondary, letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0, width: 64, lineHeight: 1.15 }}>
              {it.label}
            </span>
            <span style={{ fontSize: '0.6rem', color: THEME.textFaint, lineHeight: 1.3, letterSpacing: '0.02em' }}>
              {it.note}
            </span>
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
          <div style={{ padding: '13px 20px 10px', borderBottom: `1px solid ${THEME.panelBorder}` }}>
            <div className="mono" style={{ fontSize: '0.54rem', letterSpacing: '0.32em', color: planet.color }}>
              {CATEGORY_EN[planet.category]}
            </div>
            <div style={{ fontSize: '1.28rem', fontWeight: 200, letterSpacing: '0.12em', marginTop: 4 }}>
              {planet.name}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge planet={planet} compact />
              {planet.hasSpectrum && (
                <span
                  className="mono"
                  style={{
                    padding: '3px 9px',
                    borderRadius: 3,
                    border: `1px solid ${THEME.accentBlue}44`,
                    background: `${THEME.accentBlue}0d`,
                    fontSize: '0.58rem',
                    letterSpacing: '0.06em',
                    color: THEME.accentBlue,
                  }}
                >
                  光谱档案
                </span>
              )}
            </div>
          </div>

          {/* 宜居判决卡：为什么宜居 / 为什么不满足 */}
          <div style={{ padding: '9px 0 0' }}>
            <VerdictCard planet={planet} />
          </div>

          {/* 轨道行星仪表（行星 vs 地球基准） */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 0 }}>
            <OrbitGauges planet={planet} />
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 5, fontSize: '0.56rem', color: THEME.textFaint, letterSpacing: '0.06em', marginTop: 2, padding: '0 14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 2.5, background: planet.color, display: 'inline-block', flexShrink: 0 }} />
                {planet.name}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', border: '1.2px solid rgba(255,255,255,0.85)', display: 'inline-block', flexShrink: 0 }} />
                地球基准
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 2, height: 9, background: 'rgba(255,255,255,0.8)', display: 'inline-block', flexShrink: 0 }} />
                指标条地球刻度
              </span>
            </div>
          </div>

          {/* 指标条（两列 + 地球基准刻度） */}
          <div style={{ padding: '8px 20px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 16px' }}>
            {METRICS.map(m => {
              const { display, pct } = m.get(planet)
              return <MetricBar key={m.label} label={m.label} display={display} pct={pct} earthPct={m.earthPct} color={planet.color} />
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

          {/* 场景内信息 overlay：当前系统（光谱型/亮度）+ 聚焦目标 */}
          <div style={{ position: 'absolute', top: 14, left: 16, zIndex: 10, pointerEvents: 'none' }}>
            <div className="mono" style={{ fontSize: '0.62rem', letterSpacing: '0.3em', color: THEME.textSecondary }}>
              {systemOf(planet.name)}
              {(() => {
                const sp = starParams[systemOf(planet.name).trim()]
                return sp ? ` · ${sp.spectral} · ${sp.luminosity} L☉` : ''
              })()}
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
