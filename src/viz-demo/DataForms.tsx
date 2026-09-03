// DataForms —— 数据形式实验室：同一份五维数据（K2-18b vs 地球）的四种数据驱动视觉表达
// 全部为手写 SVG（零新依赖，项目已有 d3/framer-motion），风格对齐 NASA 深空主题
// 目的：评估「雷达图的替代形式」与「数据视觉感升级」的候选方案
import { motion } from 'framer-motion'

// ── 共享数据：五维指标归一化 0~100 ──
export const FORM_DATA = [
  { key: '半径', k2: 74, earth: 23 },
  { key: '质量', k2: 84, earth: 8 },
  { key: '温度', k2: 61, earth: 12 },
  { key: '周期', k2: 48, earth: 85 },
  { key: 'ESI', k2: 73, earth: 100 },
] as const

const K2 = '#6ee1a0'
const EARTH = '#e8ecf7'
const GRID = 'rgba(255,255,255,0.1)'
const FAINT = 'rgba(255,255,255,0.4)'

const rad = (deg: number) => (deg * Math.PI) / 180
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => [
  cx + r * Math.cos(rad(deg)),
  cy + r * Math.sin(rad(deg)),
]

// 指标轴角度：12 点方向起，顺时针均分
const axisDeg = (i: number) => -90 + i * 72

// ══════════════════════════════════════════════════════════════
// ① GlowRadar 发光雷达图 —— 经典五边形 + 光晕描边 + 渐变填充 + 发光顶点
// ══════════════════════════════════════════════════════════════
export function GlowRadar({ size = 220 }: { size?: number }) {
  const c = size / 2
  const R = size / 2 - 26
  const pts = (vals: readonly number[]) =>
    vals.map((v, i) => polar(c, c, (v / 100) * R, axisDeg(i)))
  const k2Pts = pts(FORM_DATA.map((d) => d.k2))
  const earthPts = pts(FORM_DATA.map((d) => d.earth))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="glowRadarFill" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={K2} stopOpacity={0.04} />
          <stop offset="70%" stopColor={K2} stopOpacity={0.18} />
          <stop offset="100%" stopColor={K2} stopOpacity={0.32} />
        </radialGradient>
        <filter id="glowSoft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={3} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* 网格：4 层同心圆 + 5 条轴线 */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle key={f} cx={c} cy={c} r={R * f} fill="none" stroke={GRID} strokeWidth={1} />
      ))}
      {FORM_DATA.map((_, i) => {
        const [x, y] = polar(c, c, R, axisDeg(i))
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      })}
      {/* 地球基准：白色虚线多边形 */}
      <polygon
        points={earthPts.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke={EARTH}
        strokeOpacity={0.55}
        strokeWidth={1.2}
        strokeDasharray="3 3"
      />
      {/* K2-18b：外层光晕 + 渐变填充 + 主描边 */}
      <polygon points={k2Pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={K2} strokeOpacity={0.28} strokeWidth={7} filter="url(#glowSoft)" />
      <motion.polygon
        points={k2Pts.map((p) => p.join(',')).join(' ')}
        fill="url(#glowRadarFill)"
        stroke={K2}
        strokeWidth={1.6}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ transformOrigin: `${c}px ${c}px` }}
      />
      {/* 发光顶点 */}
      {k2Pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={6.5} fill={K2} opacity={0.22} filter="url(#glowSoft)" />
          <circle cx={x} cy={y} r={2.6} fill="#c9ffe0" />
        </g>
      ))}
      {/* 指标标签 */}
      {FORM_DATA.map((d, i) => {
        const [x, y] = polar(c, c, R + 15, axisDeg(i))
        return (
          <text key={d.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            style={{ fill: FAINT, fontSize: 10, letterSpacing: 1 }}>
            {d.key}
          </text>
        )
      })}
    </svg>
  )
}

// ══════════════════════════════════════════════════════════════
// ② OrbitGauges 轨道行星仪表 —— 指标值 = 行星在弧形轨道上的位置（天文隐喻）
// 五条半圆弧轨道，K2-18b 绿色行星带尾迹滑行，地球白色基准点
// ══════════════════════════════════════════════════════════════
export function OrbitGauges({ size = 220 }: { size?: number }) {
  const cx = size / 2
  const cy = size - 24
  const R0 = size / 2 - 24
  const gap = R0 / (FORM_DATA.length - 1)

  const arcPath = (r: number, fromDeg: number, toDeg: number) => {
    // 半圆：从 180°（左端）到 0°（右端）
    const [x1, y1] = polar(cx, cy, r, fromDeg)
    const [x2, y2] = polar(cx, cy, r, toDeg)
    const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0
    return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {FORM_DATA.map((d, i) => {
        const r = R0 - i * gap
        const k2Deg = 180 - (d.k2 / 100) * 180
        const earthDeg = 180 - (d.earth / 100) * 180
        const [kx, ky] = polar(cx, cy, r, k2Deg)
        const [ex, ey] = polar(cx, cy, r, earthDeg)
        return (
          <g key={d.key}>
            {/* 底轨 */}
            <path d={arcPath(r, 180, 0)} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1.2} />
            {/* 行星尾迹：0 → 目标角度的发光弧 */}
            <motion.path
              d={arcPath(r, 180, k2Deg)}
              fill="none"
              stroke={K2}
              strokeWidth={2}
              strokeOpacity={0.75}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: i * 0.08 }}
            />
            {/* 地球基准点 */}
            <circle cx={ex} cy={ey} r={2.4} fill={EARTH} opacity={0.85} />
            {/* K2-18b 行星点（带光晕） */}
            <g>
              <circle cx={kx} cy={ky} r={6} fill={K2} opacity={0.25} />
              <circle cx={kx} cy={ky} r={3.2} fill="#c9ffe0" />
            </g>
            {/* 指标名（左端） */}
            <text x={cx - r - 6} y={cy} textAnchor="end" dominantBaseline="middle"
              style={{ fill: FAINT, fontSize: 9.5, letterSpacing: 1 }}>
              {d.key}
            </text>
            {/* 值数字（跟随行星点） */}
            <text x={kx + 7} y={ky - 7} textAnchor="start"
              style={{ fill: 'rgba(201,255,224,0.9)', fontSize: 9, letterSpacing: 0.5 }}>
              {d.k2}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ══════════════════════════════════════════════════════════════
// ③ Nightingale 玫瑰图 —— 扇区角度均分，半径编码数值，面积直观
// K2-18b 绿色渐变扇区 + 地球白色描边扇区叠加
// ══════════════════════════════════════════════════════════════
export function Nightingale({ size = 220 }: { size?: number }) {
  const c = size / 2
  const R = size / 2 - 24
  const r0 = R * 0.16

  const sectorPath = (r: number, i: number) => {
    const a0 = axisDeg(i) - 36
    const a1 = axisDeg(i) + 36
    const [x0, y0] = polar(c, c, r, a0)
    const [x1, y1] = polar(c, c, r, a1)
    const [ix0, iy0] = polar(c, c, r0, a0)
    const [ix1, iy1] = polar(c, c, r0, a1)
    return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} L${ix1},${iy1} A${r0},${r0} 0 0 0 ${ix0},${iy0} Z`
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="roseFill" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor={K2} stopOpacity={0.06} />
          <stop offset="100%" stopColor={K2} stopOpacity={0.4} />
        </radialGradient>
      </defs>
      {/* 满值参考环（100 刻度） */}
      <circle cx={c} cy={c} r={R} fill="none" stroke={GRID} strokeWidth={1} strokeDasharray="2 4" />
      {/* K2-18b 扇区 */}
      {FORM_DATA.map((d, i) => (
        <motion.path
          key={d.key}
          d={sectorPath((d.k2 / 100) * R, i)}
          fill="url(#roseFill)"
          stroke={K2}
          strokeWidth={1.1}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: i * 0.06 }}
          style={{ transformOrigin: `${c}px ${c}px` }}
        />
      ))}
      {/* 地球扇区（白描边） */}
      {FORM_DATA.map((d, i) => (
        <path key={`e${d.key}`} d={sectorPath((d.earth / 100) * R, i)} fill="none" stroke={EARTH} strokeWidth={1.1} strokeOpacity={0.7} />
      ))}
      {/* 中心装饰圆 */}
      <circle cx={c} cy={c} r={r0} fill="none" stroke={GRID} strokeWidth={1} />
      {/* 指标标签 */}
      {FORM_DATA.map((d, i) => {
        const [x, y] = polar(c, c, R + 15, axisDeg(i))
        return (
          <text key={d.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            style={{ fill: FAINT, fontSize: 10, letterSpacing: 1 }}>
            {d.key}
          </text>
        )
      })}
    </svg>
  )
}

// ══════════════════════════════════════════════════════════════
// ④ RadialBars 径向柱状 —— 中心辐射光柱，柱长编码数值（像恒星光芒）
// K2-18b 绿色光柱（根暗尖亮）+ 地球白色细柱对照 + 满值虚线刻度环
// ══════════════════════════════════════════════════════════════
export function RadialBars({ size = 220 }: { size?: number }) {
  const c = size / 2
  const rIn = 30
  const rMax = size / 2 - 24
  const barLen = (v: number) => (v / 100) * (rMax - rIn)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="barGlow" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={K2} stopOpacity={0.02} />
          <stop offset="100%" stopColor={K2} stopOpacity={0.14} />
        </radialGradient>
      </defs>
      {/* 满值刻度环 + 中心柔光 */}
      <circle cx={c} cy={c} r={rMax} fill="none" stroke={GRID} strokeWidth={1} strokeDasharray="2 4" />
      <circle cx={c} cy={c} r={rMax * 0.72} fill="url(#barGlow)" />
      {FORM_DATA.map((d, i) => {
        const [x1, y1] = polar(c, c, rIn, axisDeg(i))
        const [x2, y2] = polar(c, c, rIn + barLen(d.k2), axisDeg(i))
        const [ex2, ey2] = polar(c, c, rIn + barLen(d.earth), axisDeg(i))
        const [lx, ly] = polar(c, c, rMax + 14, axisDeg(i))
        return (
          <g key={d.key}>
            {/* 地球白色细柱 */}
            <line x1={x1} y1={y1} x2={ex2} y2={ey2} stroke={EARTH} strokeWidth={2.2} strokeOpacity={0.6} strokeLinecap="round" />
            {/* K2-18b 光柱：根部暗 → 尖端亮 */}
            <motion.line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={K2}
              strokeWidth={7}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, ease: 'easeOut', delay: i * 0.06 }}
            />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d8ffe9" strokeWidth={1.8} strokeLinecap="round" />
            {/* 尖端发光点 */}
            <circle cx={x2} cy={y2} r={2.6} fill="#c9ffe0" />
            {/* 指标标签 */}
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              style={{ fill: FAINT, fontSize: 10, letterSpacing: 1 }}>
              {d.key}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
