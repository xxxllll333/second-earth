// VizDemoPage —— 可视化组件试验场（临时演示页，用于评估外部可视化库在项目深空主题下的效果）
// 组件来源：
//   - Aurora / Particles / MagicRings：React Bits（github.com/DavidHDev/react-bits，MIT，复制源码本地化）
//   - NivoRadar：@nivo/radar（雷达图对比项目现有手写 SVG 版）
// 评估完可删除本页与 src/viz-demo/ 目录，不影响主站任何功能
import { ResponsiveRadar } from '@nivo/radar'
import Aurora from '../viz-demo/Aurora'
import Particles from '../viz-demo/Particles'
import MagicRings from '../viz-demo/MagicRings'
import { GlowRadar, OrbitGauges, Nightingale, RadialBars } from '../viz-demo/DataForms'

// ── 演示数据：K2-18b 与地球五维指标（nivo 语义：每行一个维度指标，keys 为数据系列）──
const RADAR_DATA = [
  { 指标: '半径', 'K2-18b': 74, 地球: 23 },
  { 指标: '质量', 'K2-18b': 84, 地球: 8 },
  { 指标: '温度', 'K2-18b': 61, 地球: 12 },
  { 指标: '周期', 'K2-18b': 48, 地球: 85 },
  { 指标: 'ESI', 'K2-18b': 73, 地球: 100 },
]

// ── 区块外壳：深空面板 + 标注 ──
function Section({ title, enLabel, desc, children, height = 300 }: {
  title: string
  enLabel: string
  desc: string
  children: React.ReactNode
  height?: number
}) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: '0.56rem', letterSpacing: '0.3em', color: '#e31c23' }}>{enLabel}</span>
        <span style={{ fontSize: '0.95rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.92)' }}>{title}</span>
      </div>
      <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', marginBottom: 10 }}>{desc}</div>
      <div style={{
        height,
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        background: '#05060c',
      }}>
        {children}
      </div>
    </div>
  )
}

// ── 数据形式卡片 ──
function FormCard({ name, note, children }: { name: string; note: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 6,
      background: 'rgba(255,255,255,0.012)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '8px 6px',
      overflow: 'hidden',
    }}>
      <div className="mono" style={{ fontSize: '0.58rem', letterSpacing: '0.14em', color: '#6ee1a0' }}>{name}</div>
      {children}
      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.42)', textAlign: 'center', lineHeight: 1.45, letterSpacing: '0.03em' }}>
        {note}
      </div>
    </div>
  )
}

export default function VizDemoPage() {
  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: 96,
      paddingBottom: 60,
      background: '#06070B',
      color: 'rgba(255,255,255,0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ width: 1160, maxWidth: '94vw' }}>
        <div className="mono" style={{ fontSize: '0.6rem', letterSpacing: '0.32em', color: '#e31c23' }}>VIZ LAB</div>
        <div style={{ fontSize: '1.7rem', fontWeight: 300, letterSpacing: '0.1em', marginTop: 6 }}>可视化组件试验场</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', marginTop: 8, marginBottom: 30 }}>
          临时评估页（路径 /viz-demo）· 重点是「数据形式实验室」：同一份数据的不同视觉形态 · 鼠标悬停试试交互
        </div>

        {/* ★ 数据形式实验室 —— 核心区块：K2-18b（绿）vs 地球（白），同一份五维数据的四种形态 */}
        <Section
          enLabel="DATA FORMS LAB"
          title="数据形式实验室 · 同一份五维数据的四种视觉表达"
          desc="指标：半径 / 质量 / 温度 / 周期 / ESI。全部手写 SVG、零新依赖，数据即形态——评估哪种适合替换 GalaxyPage 雷达图"
          height={330}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: 12, height: '100%' }}>
            <FormCard name="GlowRadar 发光雷达" note="经典五边形 + 光晕描边与发光顶点，现有雷达图改动最小">
              <GlowRadar size={200} />
            </FormCard>
            <FormCard name="OrbitGauges 轨道行星仪表" note="指标值 = 行星在弧形轨道上的位置，与天文主题天然契合">
              <OrbitGauges size={200} />
            </FormCard>
            <FormCard name="Nightingale 玫瑰图" note="扇区半径编码数值，面积感直观，渐变填充 + 地球描边叠加">
              <Nightingale size={200} />
            </FormCard>
            <FormCard name="RadialBars 径向光柱" note="中心辐射光柱像恒星光芒，柱长编码数值，地球细柱对照">
              <RadialBars size={200} />
            </FormCard>
          </div>
        </Section>

        {/* 1. Aurora 极光背景 —— 用 NASA 青绿蓝配色 */}
        <Section
          enLabel="REACT BITS · BACKGROUNDS"
          title="Aurora 极光"
          desc="shader 极光（ogl 渲染）：横向渐变 + 流动噪声。可作右栏面板或整页背景氛围层。下方配色 colorStops=['#0a1e5e', '#6ee1a0', '#0a2e7a']"
        >
          <Aurora colorStops={['#0a1e5e', '#6ee1a0', '#0a2e7a']} amplitude={1.1} blend={0.55} speed={0.8} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.85)' }}>AURORA</div>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>流动的极光 · 能量场</div>
            </div>
          </div>
        </Section>

        {/* 2. Particles 粒子场 */}
        <Section
          enLabel="REACT BITS · BACKGROUNDS"
          title="Particles 粒子场"
          desc="GPU 点精灵（ogl 渲染）：柔光粒子缓慢漂移旋转，可作卡片/面板内部氛围。当前 160 粒子、青白配色、悬停跟随"
        >
          <Particles
            particleCount={160}
            particleSpread={8}
            speed={0.08}
            particleColors={['#cfe8ff', '#8fd8c8', '#ffffff']}
            alphaParticles
            particleBaseSize={120}
            sizeRandomness={1.2}
            cameraDistance={18}
            moveParticlesOnHover
          />
        </Section>

        {/* 3. MagicRings 魔法光环 */}
        <Section
          enLabel="REACT BITS · ANIMATIONS"
          title="MagicRings 魔法光环"
          desc="扩散式发光同心环（three shader）：持续向外绽放、跟随鼠标视差、点击爆发。青绿 → 蓝紫渐变，与星系页轨道主题呼应"
        >
          <MagicRings
            color="#6ee1a0"
            colorTwo="#4a9ad8"
            ringCount={6}
            speed={1.1}
            baseRadius={0.25}
            radiusStep={0.09}
            scaleRate={0.06}
            opacity={0.85}
            attenuation={11}
            followMouse
            mouseInfluence={0.22}
            clickBurst
            parallax={0.06}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 16, pointerEvents: 'none' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)' }}>移动鼠标 · 点击爆发</div>
          </div>
        </Section>

        {/* 4. Nivo 雷达图 vs 项目现有 SVG 版 */}
        <Section
          enLabel="NIVO · RADAR"
          title="Nivo 雷达图对比（左：Nivo / 右：项目现有 SVG 版）"
          desc="Nivo 内置 react-spring 动画与渐变配色，切换数据时雷达图平滑过渡；右为 GalaxyPage 现用的手写 SVG（实色填充 + 地球虚线）"
          height={340}
        >
          <div style={{ display: 'flex', height: '100%' }}>
            <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.08)', padding: 8 }}>
              <ResponsiveRadar
                data={RADAR_DATA}
                keys={['K2-18b', '地球']}
                indexBy="指标"
                maxValue={100}
                margin={{ top: 34, right: 44, bottom: 34, left: 44 }}
                colors={['rgba(110,225,160,0.55)']}
                blendMode="normal"
                borderColor={{ from: 'color' }}
                dotSize={5}
                dotBorderWidth={1}
                dotBorderColor={{ from: 'color' }}
                fillOpacity={0.25}
                gridLevels={4}
                gridShape="circular"
                gridLabelOffset={14}
                enableDots
                theme={{
                  text: { fill: '#888899', fontSize: 10 },
                  axis: { domain: { line: { stroke: 'rgba(255,255,255,0.1)' } } },
                  grid: { line: { stroke: 'rgba(255,255,255,0.12)' } },
                  dots: { text: { fill: 'rgba(255,255,255,0.7)' } },
                  tooltip: { container: { background: '#0a0c16', color: '#fff', fontSize: 12, borderRadius: 4 } },
                }}
              />
            </div>
            <div style={{ flex: 1, padding: 8 }}>
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <svg width={230} height={230} viewBox="0 0 230 230">
                  <circle cx={115} cy={115} r={85} fill="none" stroke="rgba(255,255,255,0.1)" />
                  <circle cx={115} cy={115} r={63.75} fill="none" stroke="rgba(255,255,255,0.1)" />
                  <circle cx={115} cy={115} r={42.5} fill="none" stroke="rgba(255,255,255,0.1)" />
                  <circle cx={115} cy={115} r={21.25} fill="none" stroke="rgba(255,255,255,0.1)" />
                  {[0, 72, 144, 216, 288].map((deg) => {
                    const rad = (deg * Math.PI) / 180
                    return <line key={deg} x1={115} y1={115} x2={115 + 85 * Math.cos(rad)} y2={115 + 85 * Math.sin(rad)} stroke="rgba(255,255,255,0.08)" />
                  })}
                  {/* 现有版：实色多边形（示意 K2-18b 数据形状） */}
                  <polygon
                    points={[
                      [115, 115 - 85 * 0.74],
                      [115 + 85 * 0.84 * 0.95, 115 - 85 * 0.84 * 0.31],
                      [115 + 85 * 0.61 * 0.59, 115 + 85 * 0.61 * 0.81],
                      [115 - 85 * 0.48 * 0.59, 115 + 85 * 0.48 * 0.81],
                      [115 - 85 * 0.73 * 0.95, 115 - 85 * 0.73 * 0.31],
                    ].map((p) => p.join(',')).join(' ')}
                    fill="rgba(74,154,216,0.27)"
                    stroke="#4a9ad8"
                    strokeWidth={2}
                  />
                </svg>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}>
                  现有 GalaxyPage 风格：圆形网格 + 实色多边形
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* 结论说明 */}
        <div style={{
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '14px 18px',
          fontSize: '0.68rem',
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.7,
          letterSpacing: '0.03em',
          background: 'rgba(255,255,255,0.015)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>评估要点</div>
          · 数据形式实验室（GlowRadar / OrbitGauges / Nightingale / RadialBars）全部手写 SVG、零新依赖，数据即形态，可直接替换 GalaxyPage 雷达图<br />
          · Aurora / Particles / MagicRings 均为复制源码本地化（未引入额外运行时依赖，Particles/Aurora 用 ogl，MagicRings 用 three——项目已有）<br />
          · 三者都是「氛围层」，可叠加在现有面板上而无需改动数据逻辑<br />
          · Nivo 雷达图带切换动画，但需要引入 @nivo/radar（约 50KB gzip），现有 SVG 版零依赖<br />
          · 演示页独立于主站路由（/viz-demo），评估完成后可整体删除，不影响主站
        </div>
      </div>
    </div>
  )
}
