// 时间卷轴页（层级四 · 穿透）：恒星演化 + 宜居带移动 —— 3D 立体版
// 中心是程序化恒星（fbm 对流米粒组织），随进度连续变形、变色、变大小（对数压缩显示真实尺度）。
// 交互：空闲时缓慢自转；拖动进度条时自转加速，同时恒星形态连续变化。
// 呼应：每个演化阶段对应星表中真实（或最接近）的行星系统，可一键跳转星系页 —— 演化贯穿整个星表。
// 3D 渲染交给 StarEvolution3D，本页负责 DOM chrome（读数 / 滑块 / 对比条 / 呼应面板 / 文案）。

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StarEvolution3D from '../components/StarEvolution3D'
import { interpolateStage, evolutionStages } from '../data/evolution'
import PageHeader from '../components/PageHeader'
import { THEME } from '../config/visuals'
import { useIsMobile } from '../lib/useIsMobile'

const GOLD = '#ffd76e'
const n = evolutionStages.length

// ── 数字格式化：跨数量级也保持可读 ──
function fmtNum(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 100) return v.toFixed(0)
  if (abs >= 10) return v.toFixed(1)
  if (abs >= 1) return v.toFixed(2)
  if (abs >= 0.1) return v.toFixed(2)
  if (abs >= 0.01) return v.toFixed(3)
  if (abs >= 0.001) return v.toFixed(4)
  return v.toExponential(1)
}

// ── 对比条圆点直径：真实半径对数压缩（0.009 ~ 180 R☉ → 8 ~ 38 px）──
const R_LOG_MIN = Math.log10(0.009)
const R_LOG_MAX = Math.log10(180)
const dotSize = (r: number) => 8 + ((Math.log10(r) - R_LOG_MIN) / (R_LOG_MAX - R_LOG_MIN)) * 30

export default function EvolutionPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  // 时间进度 0~1，初始停在“壮年主序星”（第二个阶段）
  const [progress, setProgress] = useState(1 / 3)
  const [dragging, setDragging] = useState(false)
  const dragTimer = useRef<number | null>(null)
  const state = interpolateStage(progress)
  const activeStage = Math.min(n - 1, Math.round(progress * (n - 1)))

  // 拖动进度条 → 触发加速自转；停止 220ms 后回到缓慢自转（点击对比条跳转同样触发一次加速）
  const scrub = (v: number) => {
    setProgress(v)
    setDragging(true)
    if (dragTimer.current) window.clearTimeout(dragTimer.current)
    dragTimer.current = window.setTimeout(() => setDragging(false), 220)
  }
  useEffect(() => () => { if (dragTimer.current) window.clearTimeout(dragTimer.current) }, [])

  // 固定在 1 AU 的“测试行星”此刻的宜居状态（与 3D 场景中的行星颜色一致）
  const planetStatus = 1 < state.habInnerAU ? '炙热' : 1 > state.habOuterAU ? '冰封' : '宜居'
  const planetColor = planetStatus === '宜居' ? '#4fd08d' : planetStatus === '炙热' ? '#ff7a4d' : '#82b4ff'
  const echo = state.echo

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: isMobile ? 64 : 76,
      paddingBottom: isMobile ? 32 : 48,
      paddingLeft: isMobile ? 14 : 0,
      paddingRight: isMobile ? 14 : 0,
      background: THEME.bg,
      color: THEME.textPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <PageHeader
        enLabel="Stellar Evolution"
        title="时间卷轴"
        subtitle={<>一颗类太阳恒星的一生<span style={{ display: 'block', marginTop: 4 }}>借恒星来看行星的生命</span></>}
      />

      {/* 当前阶段名 + 年龄 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 300, letterSpacing: '0.12em', color: GOLD }}>
          {state.stageName}
        </span>
        <span style={{ fontSize: '0.72rem', color: THEME.textSecondary, fontFamily: THEME.monoFont }}>
          {state.ageLabel}
        </span>
      </div>

      {/* 3D 场景 + 右栏（星表呼应）：画布收窄、星系连接入口移到恒星右侧，页面更均衡 */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        gap: 16, alignItems: 'stretch',
        width: '100%', maxWidth: THEME.contentWidth,
      }}>
        <div style={{
          position: 'relative',
          flex: isMobile ? 'none' : '1 1 auto',
          minWidth: 0,
          aspectRatio: isMobile ? '16 / 9' : undefined,
          height: isMobile ? undefined : 640,
          border: `1px solid ${THEME.panelBorder}`,
          background: '#05060c',
          overflow: 'hidden',
        }}>
        <StarEvolution3D state={state} dragging={dragging} />

        {/* 左上：物理量读数（指针事件穿透，不挡住拖拽旋转） */}
        <div style={{
          position: 'absolute', top: isMobile ? 8 : 14, left: isMobile ? 8 : 14, pointerEvents: 'none',
          background: 'rgba(6,7,11,0.55)',
          padding: isMobile ? '7px 10px' : '10px 14px', fontFamily: THEME.monoFont, fontSize: isMobile ? '0.62rem' : '0.72rem',
          lineHeight: isMobile ? 1.7 : 1.9, minWidth: isMobile ? 0 : 210,
        }}>
          <Readout label="半径" value={`${fmtNum(state.radiusRSun)} R☉`} />
          <Readout label="表面温度" value={`${fmtNum(state.tempK)} K`} />
          <Readout label="光度" value={`${fmtNum(state.luminosity)} L☉`} />
          <Readout label="宜居带" value={`${fmtNum(state.habInnerAU)} – ${fmtNum(state.habOuterAU)} AU`} />
          <Readout label="测试行星 1 AU" value={planetStatus} valueColor={planetColor} />
        </div>

        {/* 底部：交互提示 */}
        <div style={{
          position: 'absolute', bottom: isMobile ? 8 : 12, left: 0, right: 0, textAlign: 'center',
          pointerEvents: 'none', fontSize: isMobile ? '0.6rem' : '0.68rem', color: THEME.textFaint, letterSpacing: '0.04em',
          padding: isMobile ? '0 12px' : 0, lineHeight: 1.5,
        }}>
          {isMobile
            ? <>拖拽旋转 · 双指缩放 · <span style={{ color: THEME.textSecondary }}>拖动下方进度条看恒星演化</span></>
            : <>拖拽旋转视角 · 滚轮缩放 · <span style={{ color: THEME.textSecondary }}>拖动下方进度条：恒星加速自转并改变形态</span></>}
        </div>
        </div>

        {/* 右栏：星表呼应（星系页连接入口）+ 口径脚注，高度与画布齐平 */}
        <aside style={{
          flex: isMobile ? 'none' : '0 0 340px',
          display: 'flex', flexDirection: 'column',
          border: `1px solid ${THEME.panelBorder}`,
          background: 'rgba(6,7,11,0.5)',
          padding: isMobile ? '16px 14px' : '16px 18px',
        }}>
          <div style={{ height: 1, background: 'linear-gradient(to right, rgba(255,255,255,0.16), rgba(255,255,255,0))', marginBottom: 14 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.68rem', letterSpacing: '0.16em', color: THEME.accentCyan,
              textTransform: 'uppercase', fontFamily: THEME.displayFont, textShadow: THEME.labelGlow,
            }}>Catalog Echo</span>
            <span style={{ fontSize: '0.82rem', color: THEME.textPrimary, fontWeight: 300 }}>
              此刻 · 星表里的对应
            </span>
          </div>
          {echo.planets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              {echo.planets.map(p => (
                <button
                  key={p}
                  onClick={() => navigate(`/galaxy/${encodeURIComponent(p)}`)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: THEME.accentCyan, fontSize: '0.82rem',
                    fontFamily: THEME.monoFont, letterSpacing: '0.02em',
                  }}
                >
                  <span style={{ borderBottom: '1px solid rgba(32,235,243,0.4)' }}>{p}</span>
                  <span style={{ opacity: 0.7, fontSize: '0.74rem' }}>星系页 →</span>
                </button>
              ))}
            </div>
          )}
          <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.8, color: THEME.textSecondary, fontWeight: 300 }}>
            {echo.note}
          </p>
          {/* 口径脚注钉在侧栏底部：填满纵向留白，页面下方少一块更均衡 */}
          <p style={{
            margin: 0, marginTop: 'auto', paddingTop: 14, fontSize: '0.64rem', lineHeight: 1.6,
            color: THEME.textFaint, fontFamily: THEME.monoFont,
          }}>
            宜居带口径与「星系」页判决同款：Kopparapu 保守边界，内外边界 ∝ √恒星光度（0.9–1.7 × √L☉）——全站一套模型，前后一致。
          </p>
        </aside>
      </div>

      {/* A · 时间锚点：去框——细分隔线 + 留白（旅程页同款） */}
      <div style={{ width: '100%', maxWidth: THEME.contentWidth, marginTop: 30 }}>
        <div style={{ height: 1, background: 'linear-gradient(to right, rgba(255,255,255,0.16), rgba(255,255,255,0))', marginBottom: 16 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.66rem', letterSpacing: '0.16em', color: THEME.accentCyan,
            textTransform: 'uppercase', fontFamily: THEME.displayFont, whiteSpace: 'nowrap',
            textShadow: THEME.labelGlow,
          }}>You Are Here</span>
          <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.7, color: THEME.textSecondary, fontWeight: 300 }}>
            这条时间轴是<b style={{ color: THEME.textPrimary, fontWeight: 400 }}>太阳</b>的一生，此刻停在
            <b style={{ color: THEME.textPrimary, fontWeight: 400 }}> {state.stageName} · {state.ageLabel}</b>。
            你在旅程、星表、星系里翻过的每一颗行星，都绕着某颗处在演化路上的恒星——有的正当壮年，有的正在膨胀老去，有的只剩余烬。这一页，就是它们共同的时间轴。
          </p>
        </div>
      </div>

      {/* 时间滑块 */}
      <div style={{ width: '100%', maxWidth: THEME.contentWidth, marginTop: 18 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem',
          color: THEME.textFaint, marginBottom: 6, fontFamily: THEME.monoFont,
        }}>
          <span>恒星诞生</span>
          <span>演化终点</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={e => scrub(Number(e.target.value))}
          style={{ width: '100%', accentColor: THEME.accentCyan, cursor: 'pointer' }}
        />
      </div>

      {/* 真实大小对比条（对数刻度，可点击跳转阶段） */}
      <div style={{ width: '100%', maxWidth: THEME.contentWidth, marginTop: 24 }}>
        <div style={{
          fontSize: '0.68rem', color: THEME.textFaint, marginBottom: 14,
          fontFamily: THEME.monoFont, letterSpacing: '0.04em',
        }}>
          真实大小对比 · 对数刻度（红巨星 : 太阳 : 白矮星 ≈ 200 : 1 : 0.009）
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
          {evolutionStages.map((s, i) => {
            const active = i === activeStage
            const d = dotSize(s.radiusRSun)
            return (
              <button
                key={s.name}
                onClick={() => scrub(i / (n - 1))}
                style={{
                  flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '8px 4px', color: 'inherit', fontFamily: 'inherit',
                }}
              >
                <div style={{
                  width: d, height: d, borderRadius: '50%',
                  background: `rgb(${s.color[0]},${s.color[1]},${s.color[2]})`,
                  boxShadow: active
                    ? `0 0 10px rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.55)`
                    : 'none',
                  opacity: active ? 1 : 0.5,
                  transition: 'box-shadow 0.2s, opacity 0.2s',
                }} />
                <div style={{
                  fontSize: '0.74rem', color: active ? GOLD : THEME.textSecondary,
                  letterSpacing: '0.04em', transition: 'color 0.2s',
                }}>{s.name}</div>
                <div style={{ fontSize: '0.66rem', color: THEME.textFaint, fontFamily: THEME.monoFont }}>
                  {fmtNum(s.radiusRSun)} R☉
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 科普文案 */}
      <p style={{
        width: '100%', maxWidth: 880, color: THEME.textSecondary, fontSize: '0.82rem', lineHeight: 1.85,
        textAlign: 'left', marginTop: 16, fontWeight: 300,
      }}>
        {state.description}
      </p>
    </div>
  )
}

// ── 读数行：左标签（弱）右数值（金色 / 状态色）──
function Readout({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18 }}>
      <span style={{ color: THEME.textFaint }}>{label}</span>
      <span style={{ color: valueColor ?? THEME.textPrimary }}>{value}</span>
    </div>
  )
}
