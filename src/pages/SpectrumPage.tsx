// 光谱档案页（层级三 · 近景）：JWST 光谱曲线 + "大气强度"滑块对比
// 核心交互：拖动滑块，观测光谱（实线）与"无大气模型"（虚线）之间
// 的分叉越来越大 —— 直观展示"大气分子吸收"如何改变一条光谱。
// 后端真实 spectra.json 到达后，替换导入的数据源即可，绘图逻辑不变。

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as d3 from 'd3'
import { spectra, generateNoAtmosphereBaseline, SpectrumData } from '../data/spectra'
import PageHeader from '../components/PageHeader'
import { THEME } from '../config/visuals'

// ── 图尺寸 ──
const W = 860
const H = 420
const MARGIN = { top: 30, right: 40, bottom: 52, left: 62 }

export default function SpectrumPage() {
  const { name } = useParams()
  const initialIdx = Math.max(0, spectra.findIndex(s => s.planet === name))
  const [spectrumIdx, setSpectrumIdx] = useState(initialIdx)
  // 大气强度：0 = 无大气（平基线），1 = 完整大气（观测曲线）
  const [atmosphere, setAtmosphere] = useState(1)
  const svgRef = useRef<SVGSVGElement>(null)

  const spectrum = spectra[spectrumIdx]
  const baseline = useMemo(() => generateNoAtmosphereBaseline(spectrum), [spectrum])

  // ── D3 绘图 ──
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { wavelengthUm, flux, error } = spectrum

    const xScale = d3.scaleLinear()
      .domain(d3.extent(wavelengthUm) as [number, number])
      .range([MARGIN.left, W - MARGIN.right])

    // y 轴范围：观测曲线 + 误差棒的最大最小
    const yExtent = d3.extent([
      ...flux.map((f, i) => f + error[i]),
      ...flux.map((f, i) => f - error[i]),
    ]) as [number, number]
    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - 0.05, yExtent[1] + 0.05])
      .range([H - MARGIN.bottom, MARGIN.top])

    // 混合曲线：观测 与 基线 按大气强度插值
    const blended = flux.map((f, i) =>
      baseline[i] + (f - baseline[i]) * atmosphere,
    )
    const blendedError = error.map(e => e * (0.3 + 0.7 * atmosphere))

    const line = d3.line<number>()
      .x((_, i) => xScale(wavelengthUm[i]))
      .y(d => yScale(d))

    // 误差带
    const area = d3.area<number>()
      .x((_, i) => xScale(wavelengthUm[i]))
      .y0((_, i) => yScale(blended[i] - blendedError[i]))
      .y1((_, i) => yScale(blended[i] + blendedError[i]))

    const g = svg.append('g')

    g.append('path')
      .datum(blended)
      .attr('d', area as never)
      .attr('fill', '#66aacc')
      .attr('opacity', 0.18)

    // 无大气基线（虚线）
    g.append('path')
      .datum(baseline)
      .attr('d', line as never)
      .attr('fill', 'none')
      .attr('stroke', '#888899')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5 5')

    // 观测光谱（实线）
    g.append('path')
      .datum(blended)
      .attr('d', line as never)
      .attr('fill', 'none')
      .attr('stroke', '#66d9ff')
      .attr('stroke-width', 2.2)

    // 分子吸收带标注（虚线 + 标签）
    const moleculeBands: { label: string; center: number }[] =
      spectrum.molecules.includes('H₂O') ? [{ label: 'H₂O', center: 1.4 }, { label: 'H₂O', center: 1.9 }] :
      spectrum.molecules.includes('CH₄') ? [
        { label: 'CH₄', center: 2.3 },
        { label: 'CH₄', center: 3.3 },
        { label: 'CO₂', center: 4.3 },
        ...(spectrum.molecules.includes('DMS?') ? [{ label: 'DMS?', center: 2.8 }] : []),
      ] : []

    const bandGroup = g.append('g')
    moleculeBands.forEach((band, idx) => {
      const x = xScale(band.center)
      bandGroup.append('line')
        .attr('x1', x).attr('x2', x)
        .attr('y1', MARGIN.top)
        .attr('y2', H - MARGIN.bottom)
        .attr('stroke', '#ff8866')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3 3')
        .attr('opacity', 0.7)
      bandGroup.append('text')
        .attr('x', x)
        .attr('y', MARGIN.top - 6 - (idx % 2) * 14)
        .attr('fill', '#ff8866')
        .attr('font-size', 11)
        .attr('text-anchor', 'middle')
        .text(band.label)
    })

    // 坐标轴
    const xAxis = d3.axisBottom(xScale)
      .ticks(8)
      .tickFormat(d => `${d} μm`)
    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d3.format('.2f'))

    // 仪器感网格线（横向浅线）
    const yTicks = yScale.ticks(6)
    g.append('g')
      .selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', MARGIN.left)
      .attr('x2', W - MARGIN.right)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', 'rgba(255,255,255,0.05)')
      .attr('stroke-width', 1)

    g.append('g')
      .attr('transform', `translate(0,${H - MARGIN.bottom})`)
      .call(xAxis)
      .style('color', '#6a6a7e')
      .style('font-size', '11px')
      .style('font-family', THEME.monoFont)
    g.append('g')
      .attr('transform', `translate(${MARGIN.left},0)`)
      .call(yAxis)
      .style('color', '#6a6a7e')
      .style('font-size', '11px')
      .style('font-family', THEME.monoFont)

    // 轴标签
    g.append('text')
      .attr('x', W / 2)
      .attr('y', H - 8)
      .attr('fill', '#888899')
      .attr('font-size', 12)
      .attr('text-anchor', 'middle')
      .text('波长 (μm)')
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(H / 2))
      .attr('y', 18)
      .attr('fill', '#888899')
      .attr('font-size', 12)
      .attr('text-anchor', 'middle')
      .text('相对流量')
  }, [spectrum, baseline, atmosphere])

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: 76,
      paddingBottom: 32,
      background: THEME.bg,
      color: THEME.textPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <PageHeader
        enLabel="Spectral Archive"
        title="光谱档案"
        subtitle="演示光谱 · 后端真实 JWST 数据就绪后可无缝替换"
      />

      {/* 行星切换按钮组 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {spectra.map((s, i) => (
          <button
            key={s.planet}
            onClick={() => setSpectrumIdx(i)}
            style={{
              padding: '6px 16px',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.12)',
              background: spectrumIdx === i ? 'rgba(102,217,255,0.1)' : 'transparent',
              color: spectrumIdx === i ? THEME.accentBlue : THEME.textSecondary,
              fontSize: '0.76rem',
              fontWeight: 300,
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            {s.planet}
          </button>
        ))}
      </div>

      {/* 光谱图 */}
      <div style={{
        width: 860,
        maxWidth: '92vw',
        background: 'rgba(255,255,255,0.015)',
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: 10,
        padding: '8px 12px',
      }}>
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} />
      </div>

      {/* 图例 */}
      <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: '0.68rem', color: THEME.textSecondary, letterSpacing: '0.05em' }}>
        <span><span style={{ color: THEME.accentBlue }}>──</span> 观测光谱</span>
        <span><span style={{ color: THEME.textSecondary }}>╌╌</span> 无大气模型</span>
        <span><span style={{ color: '#ff8866' }}>┆</span> 分子吸收带</span>
        <span><span style={{ color: '#5a8baa' }}>▨</span> 观测误差</span>
      </div>

      {/* 大气强度滑块 */}
      <div style={{ width: 560, maxWidth: '90vw', marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: THEME.textSecondary, letterSpacing: '0.08em', marginBottom: 6 }}>
          <span>无大气</span>
          <span className="mono" style={{ color: THEME.accentBlue }}>ATMOSPHERE {Math.round(atmosphere * 100)}%</span>
          <span>完整大气</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={atmosphere}
          onChange={e => setAtmosphere(Number(e.target.value))}
          style={{ width: '100%', accentColor: THEME.accentBlue }}
        />
        <div style={{
          textAlign: 'center',
          color: THEME.textFaint,
          fontSize: '0.74rem',
          lineHeight: 1.7,
          marginTop: 10,
          fontWeight: 300,
        }}>
          向右拖动：大气分子的吸收谷越来越深——这就是 {spectrum.molecules.join('、')} 在光谱上留下的指纹。
        </div>
      </div>
    </div>
  )
}
