// ═══════════════════════════════════════════════════════════════
// K2-18b 真实数据 · 科学争议模拟器（层级三 · 近景 · 深度重构版）
//
// 数据源：后端 /api/spectra/K2-18b/compare + /fits（在线）
//         或 src/data/k218bReal.ts 静态镜像（离线兜底）
//
// 核心交互：拖动"科学置信度门槛"滑块——
//   门槛低 → 连 DMS 生物标志物假设（置信度 0.35）都能站住脚
//   门槛高 → 生命信号被剔除，只剩非生物 / 保守解释
//   让用户亲眼看见"同一份数据如何被读出不同故事"，而非被告知结论。
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { BackendCompare, BackendFits } from '../../lib/api'
import { INSTRUMENT_META, MODEL_COLOR } from '../../data/k218bReal'
import { THEME } from '../../config/visuals'
import { useIsMobile } from '../../lib/useIsMobile'
import AiInterpretBar from './AiInterpretBar'
import K218bPlanet3D from './K218bPlanet3D'
import { GLOSSARY, TermTip, TipBubble, type GlossaryKey } from './GlossaryTip'

interface Props {
  compare: BackendCompare
  fits: BackendFits
  live: boolean
}

// 分子吸收带标注（DMS 为争议焦点，红色高亮；k 为微辞典锚点）
const MOLECULE_BANDS: { label: string; center: number; color: string; k: GlossaryKey }[] = [
  { label: 'CH₄', center: 1.4, color: '#6a6a7e', k: 'ch4' },
  { label: 'CH₄', center: 2.3, color: '#6a6a7e', k: 'ch4' },
  { label: 'DMS?', center: 3.4, color: THEME.accentRed, k: 'dms' },
  { label: 'CO₂', center: 4.3, color: '#6a6a7e', k: 'co2' },
]

export default function K218bDisputeView({ compare, fits, live }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const isMobile = useIsMobile()
  // 绘图尺寸：移动端收窄 viewBox，使缩放后图内文字仍可辨认
  const W = isMobile ? 560 : 880
  const H = isMobile ? 340 : 440
  const MARGIN = isMobile ? { top: 26, right: 18, bottom: 42, left: 44 } : { top: 34, right: 42, bottom: 54, left: 68 }
  // 置信度门槛：模型 confidence_level >= threshold 才"存活"
  const [threshold, setThreshold] = useState(0.3)
  const [showError, setShowError] = useState(true)
  // 微辞典：SVG 内锚点（轴标签/分子指纹）的浮现气泡状态
  const [tip, setTip] = useState<{ x: number; y: number; k: GlossaryKey } | null>(null)
  // 散点悬停读数：把"误差棒"落到该点的真实数值 ± 精度
  const [dataTip, setDataTip] = useState<{ x: number; y: number; value: number; error: number; color: string } | null>(null)
  const chartWrapRef = useRef<HTMLDivElement>(null)

  const models = fits.models
  const activeModels = useMemo(
    () => models.filter(m => m.confidence_level >= threshold),
    [models, threshold],
  )
  const bioActive = activeModels.some(m => m.is_biosignature)

  // 随门槛变化的叙事（不下结论，只陈述"此刻数据支持什么"）
  const narrative = useMemo(() => {
    if (activeModels.length === 0)
      return '极端门槛：没有任何模型能达到这个置信度——提醒我们，数据本身并不支撑任何"板上钉钉"的结论。'
    if (bioActive)
      return '低门槛：连 DMS 生物标志物假设都能站住脚，三种解释并存——"生命信号"在宽松标准下成立。'
    if (activeModels.length >= 2)
      return '中等门槛：生物标志物假设被剔除，只剩非生物与保守解释——同一份数据，此刻读作"无需生命"。'
    return '高门槛：只保留最保守的基线模型，任何分子结论都不轻易下——这是科学在证据不足时的克制。'
  }, [activeModels.length, bioActive])

  // 屏幕实测数字：DMS 指纹处三解读的差异 vs 散点典型误差棒（把"争议"落到真实数量级）
  const disputeNote = useMemo(() => {
    const target = 3.4
    const vals: number[] = []
    models.forEach(m => {
      let bi = 0, bd = Infinity
      m.wavelength.forEach((w, i) => { const d = Math.abs(w - target); if (d < bd) { bd = d; bi = i } })
      if (m.fit_line[bi] != null) vals.push(m.fit_line[bi])
    })
    const spread = vals.length >= 2 ? Math.max(...vals) - Math.min(...vals) : 0
    const errs: number[] = []
    compare.items.forEach(it => it.flux_error.forEach(e => { if (e > 0) errs.push(e) }))
    errs.sort((a, b) => a - b)
    const typErr = errs.length ? errs[Math.floor(errs.length / 2)] : 0
    if (!spread || !typErr) return ''
    const rel = spread <= typErr
      ? `甚至小于散点的典型误差棒 ±${typErr.toFixed(0)} ppm`
      : `与散点的典型误差棒 ±${typErr.toFixed(0)} ppm 同量级`
    return `在 DMS 指纹（3.4 μm）处，三条解读曲线的最大差异约 ${spread.toFixed(0)} ppm，${rel}——信号没有强过噪声，所以同一批数据在逻辑上容得下三种读法。`
  }, [models, compare])

  // ── D3 绘图 ──
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const items = compare.items
    const xScale = d3.scaleLinear().domain([0.8, 10.2]).range([MARGIN.left, W - MARGIN.right])

    // y 轴范围：固定用全部数据（散点±误差 + 所有模型 CI），滑块移动时坐标轴不跳
    const yVals: number[] = []
    items.forEach(it => it.flux.forEach((f, i) => { yVals.push(f - it.flux_error[i], f + it.flux_error[i]) }))
    models.forEach(m => m.confidence_interval.forEach(ci => { yVals.push(ci[0], ci[1]) }))
    const yScale = d3.scaleLinear()
      .domain([(d3.min(yVals) ?? 2200) - 30, (d3.max(yVals) ?? 2600) + 30])
      .range([H - MARGIN.bottom, MARGIN.top])

    const g = svg.append('g')

    // 微辞典 SVG 锚点绑定：hover 时在图表容器内浮现气泡
    const bindTip = (
      sel: d3.Selection<SVGTextElement, unknown, null, undefined>,
      k: GlossaryKey,
    ) => {
      sel.style('cursor', 'help')
        .on('mouseenter', (event: MouseEvent) => {
          const r = chartWrapRef.current?.getBoundingClientRect()
          if (!r) return
          // x 夹紧：气泡加宽后防止贴近图左右缘时溢出视口
          setTip({ x: Math.min(Math.max(event.clientX - r.left, 150), r.width - 150), y: event.clientY - r.top - 6, k })
        })
        .on('mouseleave', () => setTip(null))
      // 虚线下划线：让 SVG 标注也"看起来可点"，与 HTML 术语视觉语言一致
      sel.each(function () {
        const bbox = (this as SVGTextElement).getBBox()
        d3.select(this.parentNode as Element).append('line')
          .attr('x1', bbox.x).attr('x2', bbox.x + bbox.width)
          .attr('y1', bbox.y + bbox.height + 1.5).attr('y2', bbox.y + bbox.height + 1.5)
          .attr('stroke', 'rgba(32,235,243,0.45)')
          .attr('stroke-width', 1).attr('stroke-dasharray', '2 2')
          .style('pointer-events', 'none')
      })
    }

    // 横向网格线
    g.append('g')
      .selectAll('line')
      .data(yScale.ticks(6))
      .join('line')
      .attr('x1', MARGIN.left).attr('x2', W - MARGIN.right)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-width', 1)

    // 分子吸收带（DMS 争议焦点红色高亮）
    MOLECULE_BANDS.forEach(band => {
      const x = xScale(band.center)
      const isDms = band.color === THEME.accentRed
      g.append('line')
        .attr('x1', x).attr('x2', x)
        .attr('y1', MARGIN.top).attr('y2', H - MARGIN.bottom)
        .attr('stroke', band.color)
        .attr('stroke-width', isDms ? 1.4 : 1)
        .attr('stroke-dasharray', isDms ? '4 3' : '3 3')
        .attr('opacity', isDms ? 0.85 : 0.5)
      g.append('text')
        .attr('x', x).attr('y', MARGIN.top - 8)
        .attr('fill', band.color)
        .attr('font-size', isDms ? 12 : 10.5)
        .attr('font-weight', isDms ? 600 : 400)
        .attr('text-anchor', 'middle')
        .attr('font-family', THEME.monoFont)
        .text(band.label)
        .call(bindTip as never, band.k)
    })

    // 拟合模型：置信区间带 + 曲线（存活=实线鲜亮，被剔除=虚线残影）
    models.forEach(m => {
      const active = m.confidence_level >= threshold
      const color = MODEL_COLOR[m.model_type] ?? '#888899'
      const lineGen = d3.line<number>()
        .x((_, i) => xScale(m.wavelength[i]))
        .y(d => yScale(d))
      const areaGen = d3.area<number>()
        .x((_, i) => xScale(m.wavelength[i]))
        .y0((_, i) => yScale(m.confidence_interval[i]?.[0] ?? m.fit_line[i]))
        .y1((_, i) => yScale(m.confidence_interval[i]?.[1] ?? m.fit_line[i]))

      g.append('path')
        .datum(m.fit_line)
        .attr('d', areaGen as never)
        .attr('fill', color)
        .attr('opacity', active ? 0.13 : 0.02)
      g.append('path')
        .datum(m.fit_line)
        .attr('d', lineGen as never)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', active ? 2.2 : 1)
        .attr('opacity', active ? 0.95 : 0.16)
        .attr('stroke-dasharray', active ? null : '4 4')
    })

    // 观测散点 + 误差棒（三仪器，保留原始噪声，不美化）
    items.forEach(it => {
      const color = INSTRUMENT_META[it.instrument]?.color ?? '#cccccc'
      it.wavelength.forEach((w, i) => {
        const f = it.flux[i]
        const e = it.flux_error[i]
        if (showError) {
          g.append('line')
            .attr('x1', xScale(w)).attr('x2', xScale(w))
            .attr('y1', yScale(f - e)).attr('y2', yScale(f + e))
            .attr('stroke', color).attr('stroke-width', 1).attr('opacity', 0.55)
        }
        g.append('circle')
          .attr('cx', xScale(w)).attr('cy', yScale(f)).attr('r', 3.2)
          .attr('fill', color).attr('stroke', THEME.bg).attr('stroke-width', 0.8)
        // 透明命中圈：悬停即显示该点真实读数 ± 误差——误差棒"眼见为实"
        g.append('circle')
          .attr('cx', xScale(w)).attr('cy', yScale(f)).attr('r', 9)
          .attr('fill', 'transparent').style('cursor', 'pointer')
          .on('mouseenter', (event: MouseEvent) => {
            const r = chartWrapRef.current?.getBoundingClientRect()
            if (!r) return
            setDataTip({ x: Math.min(Math.max(event.clientX - r.left, 150), r.width - 150), y: event.clientY - r.top - 10, value: f, error: e, color })
          })
          .on('mouseleave', () => setDataTip(null))
      })
    })

    // 坐标轴
    g.append('g')
      .attr('transform', `translate(0,${H - MARGIN.bottom})`)
      .call(d3.axisBottom(xScale).ticks(9).tickFormat(d => `${d} μm`))
      .style('color', '#6a6a7e').style('font-size', '11px').style('font-family', THEME.monoFont)
    g.append('g')
      .attr('transform', `translate(${MARGIN.left},0)`)
      .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => `${d3.format('.0f')(d as number)}`))
      .style('color', '#6a6a7e').style('font-size', '11px').style('font-family', THEME.monoFont)

    // 轴标签（微辞典锚点：波长 / 凌星深度）
    bindTip(
      g.append('text')
        .attr('x', W / 2).attr('y', H - 10)
        .attr('fill', '#888899').attr('font-size', 12).attr('text-anchor', 'middle')
        .text('波长 (μm)'),
      'wavelength',
    )
    // y 轴标签放进旋转组，使其虚线下划线随文字一起旋转
    const yLabelG = g.append('g').attr('transform', `translate(18,${H / 2}) rotate(-90)`)
    bindTip(
      yLabelG.append('text')
        .attr('x', 0).attr('y', 0)
        .attr('fill', '#888899').attr('font-size', 12).attr('text-anchor', 'middle')
        .text('凌星深度 (ppm)'),
      'transitDepth',
    )
  }, [compare, fits, models, threshold, showError, isMobile])

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 数据来源徽标 + 争议焦点 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{
          padding: '3px 10px', borderRadius: 3, fontSize: '0.66rem', letterSpacing: '0.08em',
          fontFamily: THEME.monoFont,
          background: live ? 'rgba(68,204,136,0.14)' : 'rgba(102,217,255,0.12)',
          color: live ? THEME.accentGreen : THEME.accentBlue,
          border: `1px solid ${live ? 'rgba(68,204,136,0.4)' : 'rgba(102,217,255,0.35)'}`,
        }}>
          {live ? '● LIVE 实时后端' : '● JWST 观测数据'}
        </span>
        <span style={{ fontSize: '0.82rem', color: THEME.textPrimary, fontWeight: 300 }}>
          争议焦点：{fits.dispute_topic}
        </span>
      </div>

      {/* 主视区：桌面左右分栏（左 3D 窗口 / 右光谱图+图例），一屏框住"球+图"；移动端竖排 */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        gap: 16, alignItems: 'stretch', justifyContent: 'center',
        width: isMobile ? '100%' : THEME.contentWidth, maxWidth: '97vw',
      }}>
        {/* 左：可拖转/缩放的 3D 行星窗口（宇宙背景） */}
        <div style={{ flex: isMobile ? 'none' : '0 0 40%', minWidth: isMobile ? 'auto' : 360 }}>
          <K218bPlanet3D models={models} threshold={threshold} width="100%" />
        </div>
        {/* 右：光谱图 + 图例 */}
        <div style={{ flex: '1 1 60%', minWidth: isMobile ? 'auto' : 380, display: 'flex', flexDirection: 'column' }}>
          {/* 光谱图（序章"进入档案"滚动锚点；微辞典 SVG 锚点宿主） */}
          <div id="k218b-chart" ref={chartWrapRef} style={{
            width: '100%', position: 'relative',
            background: 'rgba(255,255,255,0.015)',
            border: `1px solid ${THEME.panelBorder}`,
            borderRadius: THEME.cardRadius, padding: '8px 12px',
          }}>
            <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} />
            {tip && (
              <TipBubble
                text={GLOSSARY[tip.k]}
                style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, -100%)' }}
              />
            )}
            {dataTip && (
              <TipBubble
                text={`读数 ${dataTip.value.toFixed(0)} ± ${dataTip.error.toFixed(0)} ppm · 竖线就覆盖这个范围`}
                style={{ left: dataTip.x, top: dataTip.y, transform: 'translate(-50%, -100%)', borderColor: dataTip.color }}
              />
            )}
          </div>

          {/* 图例 */}
          <div style={{ display: 'flex', gap: 18, marginTop: 10, fontSize: '0.68rem', color: THEME.textSecondary, letterSpacing: '0.04em', flexWrap: 'wrap', justifyContent: 'center' }}>
            {compare.items.map(it => (
              <span key={it.instrument}>
                <span style={{ color: INSTRUMENT_META[it.instrument]?.color }}>●</span> {INSTRUMENT_META[it.instrument]?.label ?? it.instrument}
              </span>
            ))}
            <span style={{ opacity: 0.5 }}>│</span>
            {models.map(m => (
              <span key={m.team_name}>
                <span style={{ color: MODEL_COLOR[m.model_type] }}>──</span>{' '}
                <TermTip k={m.model_type === 'biosignature' ? 'biosignature' : m.model_type === 'abiotic' ? 'abiotic' : 'baseline'}>
                  {m.model_type === 'biosignature' ? '生物标志' : m.model_type === 'abiotic' ? '非生物' : '保守基线'}
                </TermTip>
              </span>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input type="checkbox" checked={showError} onChange={e => setShowError(e.target.checked)} style={{ accentColor: THEME.accentBlue }} />
              <TermTip k="errorBar">误差棒</TermTip>
            </label>
          </div>
        </div>
      </div>

      {/* 置信度门槛滑块：紧跟主视区，保证"球+图+滑块"同屏（录演示视频）；宽度与主视区对齐 */}
      <div style={{ width: isMobile ? '100%' : THEME.contentWidth, maxWidth: '97vw', marginTop: isMobile ? 16 : 14, padding: isMobile ? '0 4px' : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: THEME.textSecondary, letterSpacing: '0.06em', marginBottom: 6 }}>
          <span>宽松（0.0）</span>
          <span className="mono" style={{ color: THEME.accentBlue }}>
            <TermTip k="threshold">科学置信度门槛</TermTip> {threshold.toFixed(2)}
          </span>
          <span>严格（1.0）</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.01}
          value={threshold}
          onChange={e => setThreshold(Number(e.target.value))}
          style={{ width: '100%', accentColor: THEME.accentBlue }}
        />
        <div style={{
          textAlign: 'center', color: THEME.textFaint, fontSize: '0.78rem',
          lineHeight: 1.75, marginTop: 10, fontWeight: 300, minHeight: '2.6em',
        }}>
          {narrative}
        </div>
      </div>

      {/* AI 解读条：默认沉默，点击才展开；disputeNote 传入屏幕实测数字 */}
      <AiInterpretBar width={isMobile ? '100%' : THEME.contentWidth} disputeNote={disputeNote} />

      {/* 交互提示：教会访客"哪些地方能点/能悬停"，解决锚点太隐蔽 */}
      <div style={{ fontSize: '0.62rem', color: THEME.textFaint, marginTop: 8, letterSpacing: '0.02em', textAlign: 'center', maxWidth: '90vw', lineHeight: 1.6 }}>
        带 <span style={{ color: THEME.accentCyan, borderBottom: '1px solid rgba(32,235,243,0.5)' }}>下划线 ?</span> 的术语、坐标轴与分子标注、以及图上任意散点，都可悬停或点击查看解释
      </div>

      {/* 三团队争议卡片：宽度与主视区对齐，三卡均分整行 */}
      <div style={{ display: 'flex', gap: 14, marginTop: 20, width: THEME.contentWidth, maxWidth: '97vw', flexWrap: 'wrap', justifyContent: 'center' }}>
        {models.map(m => {
          const active = m.confidence_level >= threshold
          const color = MODEL_COLOR[m.model_type] ?? '#888899'
          return (
            <div key={m.team_name} style={{
              flex: '1 1 260px', minWidth: 250,
              background: THEME.panelBg,
              border: `1px solid ${active ? color : THEME.panelBorder}`,
              borderRadius: THEME.cardRadius, padding: '14px 16px',
              opacity: active ? 1 : 0.42,
              transition: 'opacity 0.3s, border-color 0.3s',
              position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: THEME.textSecondary, letterSpacing: '0.02em', lineHeight: 1.3 }}>
                  {m.team_name}
                </span>
              </div>
              <div style={{ fontSize: '0.86rem', color: THEME.textPrimary, fontWeight: 500, marginBottom: 10, lineHeight: 1.45 }}>
                {m.model_label}
                {m.is_biosignature && (
                  <span style={{
                    marginLeft: 6, padding: '1px 6px', borderRadius: 3, fontSize: '0.6rem',
                    background: 'rgba(252,61,33,0.16)', color: THEME.accentRed, border: '1px solid rgba(252,61,33,0.35)',
                    verticalAlign: 'middle',
                  }}>潜在生命信号</span>
                )}
              </div>

              {/* 置信度条 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${m.confidence_level * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
                </div>
                <span className="mono" style={{ fontSize: '0.7rem', color }}>{m.confidence_level.toFixed(2)}</span>
                <span style={{ fontSize: '0.68rem', color: active ? THEME.accentGreen : THEME.accentRed }}>
                  {active ? '✓ 达标' : '✗ 剔除'}
                </span>
              </div>

              {/* 关键分子 */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                {m.key_molecules.map(mol => {
                  const gk: GlossaryKey | null = mol.includes('DMS') ? 'dms'
                    : (mol.includes('CH4') || mol.includes('CH₄')) ? 'ch4'
                    : (mol.includes('CO2') || mol.includes('CO₂')) ? 'co2' : null
                  return (
                    <span key={mol} style={{
                      padding: '2px 7px', borderRadius: 3, fontSize: '0.64rem',
                      background: 'rgba(255,255,255,0.05)', color: THEME.textSecondary,
                      border: `1px solid ${THEME.panelBorder}`, fontFamily: THEME.monoFont,
                    }}>
                      {gk ? <TermTip k={gk}>{mol}</TermTip> : mol}
                    </span>
                  )
                })}
              </div>

              <div style={{ fontSize: '0.72rem', color: THEME.textSecondary, lineHeight: 1.6, fontWeight: 300, marginBottom: 10 }}>
                {m.description}
              </div>

              <div style={{ fontSize: '0.64rem', color: THEME.textFaint, lineHeight: 1.5, borderTop: `1px solid ${THEME.panelBorder}`, paddingTop: 8 }}>
                {m.citation}
                {m.doi && (
                  <>
                    {' · '}
                    <a href={m.doi} target="_blank" rel="noopener noreferrer" style={{ color: THEME.accentBlue, textDecoration: 'none' }}>
                      DOI ↗
                    </a>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 观测数据来源（三仪器引用） */}
      <div style={{ width: THEME.contentWidth, maxWidth: '97vw', marginTop: 22, borderTop: `1px solid ${THEME.panelBorder}`, paddingTop: 14 }}>
        <div style={{ fontSize: '0.68rem', color: THEME.textFaint, letterSpacing: '0.1em', marginBottom: 10 }}>观测数据来源 · JWST REAL DATA</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {compare.items.map(it => (
            <div key={it.instrument} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: '0.7rem', flexWrap: 'wrap' }}>
              <span style={{ color: INSTRUMENT_META[it.instrument]?.color, fontFamily: THEME.monoFont, minWidth: 116 }}>
                {INSTRUMENT_META[it.instrument]?.label ?? it.instrument}
              </span>
              <span style={{ color: THEME.textFaint, fontFamily: THEME.monoFont }}>{INSTRUMENT_META[it.instrument]?.range}</span>
              <span style={{ color: THEME.textSecondary, flex: 1 }}>{it.citation}</span>
              <span style={{ color: THEME.textFaint, fontFamily: THEME.monoFont }}>{it.program_id}</span>
              {it.doi && (
                <a href={it.doi} target="_blank" rel="noopener noreferrer" style={{ color: THEME.accentBlue, textDecoration: 'none' }}>DOI ↗</a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 数据管道 · MCP 技能包档案卡（技能包真实产出展示） */}
      <div style={{ width: THEME.contentWidth, maxWidth: '97vw', marginTop: 22, borderTop: `1px solid ${THEME.panelBorder}`, paddingTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: THEME.displayFont, fontSize: '0.66rem', letterSpacing: '0.22em', color: THEME.accentCyan, textShadow: THEME.labelGlow }}>
            MCP SKILL · DATA PIPELINE
          </span>
          <span style={{ fontSize: '0.68rem', color: THEME.textFaint, letterSpacing: '0.1em' }}>数据管道 · MCP 技能包</span>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {/* 左：技能包真实产出预览图 */}
          <div style={{ flex: '1 1 340px', minWidth: 300, background: THEME.panelBg, border: `1px solid ${THEME.panelBorder}`, borderRadius: THEME.cardRadius, padding: 10 }}>
            <img src="/mcp/k218b_preview.png" alt="exoplanet-spectra-fetcher 预览图" style={{ width: '100%', display: 'block', borderRadius: THEME.cardRadius }} />
            <div style={{ fontSize: '0.64rem', color: THEME.textFaint, marginTop: 8, fontFamily: THEME.monoFont }}>
              output/k218b_preview.png · 技能包渲染产出
            </div>
          </div>
          {/* 右：闭环说明 + 标准化输出样例 */}
          <div style={{ flex: '1 1 340px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '0.74rem', color: THEME.textSecondary, lineHeight: 1.7, fontWeight: 300 }}>
              本页数据由 MCP 技能包 <span style={{ fontFamily: THEME.monoFont, color: THEME.accentBlue }}>exoplanet-spectra-fetcher</span> 以标准协议封装：输入行星名 → 加载光谱 → 标准化 JSON → 渲染预览图，形成“输入—处理—输出”任务闭环。
            </div>
            <pre style={{
              margin: 0, padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${THEME.panelBorder}`, borderRadius: THEME.cardRadius,
              fontFamily: THEME.monoFont, fontSize: '0.66rem', lineHeight: 1.6,
              color: THEME.textSecondary, overflowX: 'auto', whiteSpace: 'pre',
            }}>
{`{
  "skill": "exoplanet-spectra-fetcher",
  "planet_name": "K2-18 b",
  "pipeline": [ "resolve_planet", "load_spectra_cache",
                "load_dispute_models", "standardize_json",
                "render_preview_png" ],
  "spectra_count": 3,
  "instruments": [ "NIRISS_SOSS", "NIRSpec_G395H", "MIRI_LRS" ]
}`}
            </pre>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['MCP 协议', 'stdio 传输', '可复现运行', '含文献 DOI'].map(t => (
                <span key={t} style={{
                  padding: '2px 8px', borderRadius: 3, fontSize: '0.62rem',
                  background: 'rgba(32,235,243,0.08)', color: THEME.accentCyan,
                  border: '1px solid rgba(32,235,243,0.3)', fontFamily: THEME.monoFont,
                }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
