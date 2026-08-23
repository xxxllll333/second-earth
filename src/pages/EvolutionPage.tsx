// 时间卷轴页（层级四 · 穿透）：恒星演化 + 宜居带移动
// 拖动底部时间轴：恒星从幼年主序星 → 壮年 → 红巨星 → 白矮星，
// 颜色、大小、宜居带（绿色环带）随之连续变化，行星宜居状态跟着改变。
// Canvas 绘制，状态插值由 data/evolution.ts 提供。

import { useEffect, useRef, useState } from 'react'
import { interpolateStage, evolutionStages } from '../data/evolution'
import PageHeader from '../components/PageHeader'
import { THEME } from '../config/visuals'

// ── 画布参数 ──
const CVS_SIZE = 640
const CENTER = CVS_SIZE / 2
// 像素/AU 比例（宜居带位置映射到画布）
const AU_SCALE = 86

export default function EvolutionPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 时间进度 0~1，初始停在"壮年主序星"（第二个阶段）
  const [progress, setProgress] = useState(1 / 3)
  const state = interpolateStage(progress)

  // ── Canvas 绘制 ──
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio
    canvas.width = CVS_SIZE * dpr
    canvas.height = CVS_SIZE * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, CVS_SIZE, CVS_SIZE)

    // 背景参考网格
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath()
      ctx.arc(CENTER, CENTER, i * 70, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // 行星轨道（固定，代表一颗"测试行星"在 1 AU 处）
    const planetOrbit = 1.0 * AU_SCALE
    ctx.beginPath()
    ctx.arc(CENTER, CENTER, planetOrbit, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    ctx.lineWidth = 1.2
    ctx.setLineDash([5, 5])
    ctx.stroke()
    ctx.setLineDash([])

    // 宜居带环（内外边界之间填充淡绿）
    const [r, g, b] = state.color
    const starR = Math.min(state.radius * 46, CENTER - 90)

    const habInner = state.habInner * AU_SCALE
    const habOuter = state.habOuter * AU_SCALE
    const habGradient = ctx.createRadialGradient(CENTER, CENTER, habInner, CENTER, CENTER, habOuter)
    habGradient.addColorStop(0, 'rgba(68,204,136,0.14)')
    habGradient.addColorStop(1, 'rgba(68,204,136,0.05)')
    ctx.beginPath()
    ctx.arc(CENTER, CENTER, habOuter, 0, Math.PI * 2)
    ctx.fillStyle = habGradient
    ctx.fill()
    ctx.beginPath()
    ctx.arc(CENTER, CENTER, habInner, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(68,204,136,0.5)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(CENTER, CENTER, habOuter, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(68,204,136,0.5)'
    ctx.stroke()

    // 测试行星（1 AU 处），宜居则绿否则红
    const planetX = CENTER + planetOrbit * Math.cos(1.2)
    const planetY = CENTER + planetOrbit * Math.sin(1.2)
    const inHabitable = planetOrbit >= habInner && planetOrbit <= habOuter
    ctx.beginPath()
    ctx.arc(planetX, planetY, 6, 0, Math.PI * 2)
    ctx.fillStyle = inHabitable ? '#44cc88' : '#ff6464'
    ctx.fill()
    ctx.fillStyle = '#888899'
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('测试行星 · 1 AU', planetX, planetY - 14)

    // 恒星（光晕 + 主体）
    const glowRadius = Math.max(starR * 3, 90)
    const starGlow = ctx.createRadialGradient(CENTER, CENTER, starR * 0.5, CENTER, CENTER, glowRadius)
    starGlow.addColorStop(0, `rgba(${r},${g},${b},0.85)`)
    starGlow.addColorStop(0.5, `rgba(${r},${g},${b},0.3)`)
    starGlow.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.beginPath()
    ctx.arc(CENTER, CENTER, glowRadius, 0, Math.PI * 2)
    ctx.fillStyle = starGlow
    ctx.fill()

    ctx.beginPath()
    ctx.arc(CENTER, CENTER, starR, 0, Math.PI * 2)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fill()

    // 宜居带标签
    ctx.fillStyle = 'rgba(68,204,136,0.75)'
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('宜居带', CENTER + habInner + 8, CENTER + habInner - 4)
  }, [progress, state])

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: 76,
      paddingBottom: 40,
      background: THEME.bg,
      color: THEME.textPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <PageHeader
        enLabel="Stellar Evolution"
        title="时间卷轴"
        subtitle="一颗类太阳恒星的一生"
      />

      {/* 当前阶段信息 */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 14,
        marginBottom: 12,
      }}>
        <span style={{ fontSize: '1.05rem', fontWeight: 300, letterSpacing: '0.1em', color: '#ffd76e' }}>
          {state.stageName}
        </span>
        <span className="mono" style={{ fontSize: '0.72rem', color: THEME.textSecondary }}>
          {state.ageLabel}
        </span>
      </div>

      {/* 画布 */}
      <div style={{
        width: 860,
        maxWidth: '92vw',
        background: 'rgba(255,255,255,0.015)',
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: 10,
        padding: 8,
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1', display: 'block' }}
        />
      </div>

      {/* 时间滑块 */}
      <div style={{ width: 560, maxWidth: '90vw', marginTop: 22 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.68rem',
          color: THEME.textFaint,
          marginBottom: 6,
        }}>
          {evolutionStages.map(s => (
            <span key={s.name} className="mono" style={{ textAlign: 'center', width: `${100 / evolutionStages.length}%` }}>
              {s.name}
            </span>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={e => setProgress(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#ffd76e' }}
        />
      </div>

      {/* 科普文案 */}
      <p style={{
        maxWidth: 560,
        color: THEME.textSecondary,
        fontSize: '0.8rem',
        lineHeight: 1.8,
        textAlign: 'center',
        marginTop: 18,
        fontWeight: 300,
      }}>
        {state.description}
      </p>
    </div>
  )
}
