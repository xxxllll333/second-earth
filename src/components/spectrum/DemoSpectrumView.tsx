// ═══════════════════════════════════════════════════════════════
// 演示光谱视图（大气强度滑块）—— 用于后端暂无真实数据的行星
//   （WASP-96b、HD 189733b）
//
// 逻辑与重构前的 SpectrumPage 完全一致：拖动滑块，观测光谱（实线）
// 与"无大气模型"（虚线）之间的分叉越来越大，直观展示大气分子吸收。
// 后端补齐这些行星的真实数据后，可平滑切到 K218bDisputeView 同款视图。
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { generateNoAtmosphereBaseline, SpectrumData } from '../../data/spectra'
import { THEME } from '../../config/visuals'

const W = 860
const H = 420
const MARGIN = { top: 30, right: 40, bottom: 52, left: 62 }

export default function DemoSpectrumView({ spectrum }: { spectrum: SpectrumData }) {
  // 大气强度：0 = 无大气（平基线），1 = 完整大气（观测曲线）
  const [atmosphere, setAtmosphere] = useState(1)
  const svgRef = useRef<SVGSVGElement>(null)
  const baseline = useMemo(() => generateNoAtmosphereBaseline(spectrum), [spectrum])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { wavelengthUm, flux, error } = spectrum

    const xScale = d3.scaleLinear()
      .domain(d3.extent(wavelengthUm) as [number, number])
      .range([MARGIN.left, W - MARGIN.right])

    const yExtent = d3.extent([
      ...flux.map((f, i) => f + error[i]),
      ...flux.map((f, i) => f - error[i]),
    ]) as [number, number]
    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - 0.05, yExtent[1] + 0.05])
      .range([H - MARGIN.bottom, MARGIN.top])

    const blended = flux.map((f, i) => baseline[i] + (f - baseline[i]) * atmosphere)
    const blendedError = error.map(e => e * (0.3 + 0.7 * atmosphere))

    const line = d3.line<number>()
      .x((_, i) => xScale(wavelengthUm[i]))
      .y(d => yScale(d))
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

    g.append('path')
      .datum(baseline)
      .attr('d', line as never)
      .attr('fill', 'none')
      .attr('stroke', '#888899')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5 5')

    g.append('path')
      .datum(blended)
      .attr('d', line as never)
      .attr('fill', 'none')
      .attr('stroke', '#66d9ff')
      .attr('stroke-width', 2.2)

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
        .attr('y1', MARGIN.top).attr('y2', H - MARGIN.bottom)
        .attr('stroke', '#ff8866').attr('stroke-width', 1)
        .attr('stroke-dasharray', '3 3').attr('opacity', 0.7)
      bandGroup.append('text')
        .attr('x', x).attr('y', MARGIN.top - 6 - (idx % 2) * 14)
        .attr('fill', '#ff8866').attr('font-size', 11).attr('text-anchor', 'middle')
        .text(band.label)
    })

    const xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(d => `${d} μm`)
    const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(d3.format('.2f'))

    g.append('g')
      .selectAll('line')
      .data(yScale.ticks(6))
      .join('line')
      .attr('x1', MARGIN.left).attr('x2', W - MARGIN.right)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-width', 1)

    g.append('g')
      .attr('transform', `translate(0,${H - MARGIN.bottom})`)
      .call(xAxis)
      .style('color', '#6a6a7e').style('font-size', '11px').style('font-family', THEME.monoFont)
    g.append('g')
      .attr('transform', `translate(${MARGIN.left},0)`)
      .call(yAxis)
      .style('color', '#6a6a7e').style('font-size', '11px').style('font-family', THEME.monoFont)

    g.append('text')
      .attr('x', W / 2).attr('y', H - 8)
      .attr('fill', '#888899').attr('font-size', 12).attr('text-anchor', 'middle')
      .text('波长 (μm)')
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(H / 2)).attr('y', 18)
      .attr('fill', '#888899').attr('font-size', 12).attr('text-anchor', 'middle')
      .text('相对流量')
  }, [spectrum, baseline, atmosphere])

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 光谱图 */}
      <div style={{
        width: 860, maxWidth: '92vw',
        background: 'rgba(255,255,255,0.015)',
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: THEME.cardRadius, padding: '8px 12px',
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
          type="range" min={0} max={1} step={0.01}
          value={atmosphere}
          onChange={e => setAtmosphere(Number(e.target.value))}
          style={{ width: '100%', accentColor: THEME.accentBlue }}
        />
        <div style={{
          textAlign: 'center', color: THEME.textFaint, fontSize: '0.74rem',
          lineHeight: 1.7, marginTop: 10, fontWeight: 300,
        }}>
          向右拖动：大气分子的吸收谷越来越深——这就是 {spectrum.molecules.join('、')} 在光谱上留下的指纹。
        </div>
      </div>

      {/* 演示数据说明 */}
      <div style={{ marginTop: 14, fontSize: '0.66rem', color: THEME.textFaint, letterSpacing: '0.03em' }}>
        演示光谱（程序生成）· 后端补齐该行星真实 JWST 数据后可无缝替换
      </div>
    </div>
  )
}
