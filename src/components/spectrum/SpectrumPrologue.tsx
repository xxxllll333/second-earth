// ═══════════════════════════════════════════════════════════════
// 光谱页序章：三幕漫游式导入（凌星 → 指纹 → 档案）
//
// 用故事/逻辑链把观众带进光谱图，而非静态说明卡：
//   第一幕 恒星盘 + 行星剪影缓缓凌星
//   第二幕 红外色带上逐个浮现分子吸收指纹（DMS 红色高亮）
//   第三幕 指纹之上叠加 JWST 散点与误差棒 → 交接到真实图表
//
// 用户自主节奏翻页；看完或跳过后收起为一条细栏（sessionStorage 记忆），
// 保持页面简洁；"进入档案"平滑滚动到真实图表锚点 #k218b-chart。
// ═══════════════════════════════════════════════════════════════

import { useState, type CSSProperties } from 'react'
import { THEME } from '../../config/visuals'

const ACTS = [
  { label: '第一幕 · 凌星', text: '行星从恒星面前经过——一部分恒星光，会擦过它的大气层边缘。' },
  { label: '第二幕 · 指纹', text: '大气中的分子只偷走特定颜色的光，在光谱上留下吸收指纹。' },
  { label: '第三幕 · 档案', text: '把 JWST 的真实测量与误差棒叠在指纹之上——你眼前的这张图由此诞生。' },
]

// 吸收指纹位置（色带宽度百分比）与标签，DMS 为争议焦点
const BANDS = [
  { x: 16, label: 'CH₄', dms: false },
  { x: 36, label: 'CH₄', dms: false },
  { x: 60, label: 'DMS?', dms: true },
  { x: 82, label: 'CO₂', dms: false },
]

// 第三幕示意散点（x: 百分比, y: 像素偏移）
const DOTS: [number, number][] = [
  [8, 62], [16, 36], [24, 56], [36, 32], [44, 54], [52, 58],
  [60, 38], [68, 56], [76, 60], [82, 34], [90, 58],
]

const COLLAPSE_KEY = 'se_spec_prologue_collapsed'

const sceneBase: CSSProperties = {
  position: 'absolute', inset: 0, transition: 'opacity 0.6s ease', pointerEvents: 'none',
}

export default function SpectrumPrologue() {
  const [collapsed, setCollapsed] = useState(() => sessionStorage.getItem(COLLAPSE_KEY) === '1')
  const [act, setAct] = useState(0)

  const close = () => { sessionStorage.setItem(COLLAPSE_KEY, '1'); setCollapsed(true) }
  const enterArchive = () => {
    close()
    document.getElementById('k218b-chart')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // 收起态：一条细栏，不占版面
  if (collapsed) {
    return (
      <button
        onClick={() => { setCollapsed(false); setAct(0) }}
        style={{
          width: 900, maxWidth: '94vw', marginBottom: 18,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
          padding: '8px 14px', border: `1px solid ${THEME.panelBorder}`, borderRadius: THEME.cardRadius,
          background: 'transparent', cursor: 'pointer',
        }}
      >
        <span style={{
          fontFamily: THEME.displayFont, fontSize: '0.6rem', letterSpacing: '0.2em',
          color: THEME.accentCyan, textShadow: THEME.labelGlow,
        }}>PROLOGUE · 三幕读懂这张图</span>
        <span style={{ fontSize: '0.66rem', color: THEME.textFaint }}>重看 ⌄</span>
      </button>
    )
  }

  return (
    <div style={{
      width: 900, maxWidth: '94vw', marginBottom: 18,
      border: `1px solid ${THEME.panelBorder}`, borderRadius: THEME.cardRadius,
      background: THEME.panelBg, overflow: 'hidden',
    }}>
      {/* ── 场景区 ── */}
      <div style={{ position: 'relative', height: 200 }}>
        {/* 第一幕 · 凌星 */}
        <div style={{ ...sceneBase, opacity: act === 0 ? 1 : 0 }}>
          <svg width="100%" height="100%" viewBox="0 0 900 200" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="pg-star">
                <stop offset="0%" stopColor="rgba(255,244,220,0.95)" />
                <stop offset="38%" stopColor="rgba(255,214,150,0.55)" />
                <stop offset="100%" stopColor="rgba(255,190,120,0)" />
              </radialGradient>
            </defs>
            <circle cx={450} cy={100} r={86} fill="url(#pg-star)" />
            <circle cx={450} cy={100} r={26} fill="#f5eede" opacity={0.92} />
            <g className="prologue-planet">
              <circle cx={330} cy={100} r={9.5} fill="none" stroke="rgba(102,217,255,0.5)" strokeWidth={1} />
              <circle cx={330} cy={100} r={7} fill="#07080d" />
            </g>
          </svg>
        </div>

        {/* 第二幕 · 指纹（key 触发重挂载，重播浮现动画） */}
        <div key={`s2-${act}`} style={{ ...sceneBase, opacity: act === 1 ? 1 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '76%' }}>
            <div style={{
              height: 56, borderRadius: 2, overflow: 'hidden',
              background: 'linear-gradient(90deg,#2b1616,#59301d,#7a4a26,#6b5a33,#3d3a2c)',
            }}>
              {BANDS.map((b, i) => (
                <div key={i} className="prologue-fade" style={{
                  position: 'absolute', left: `${b.x}%`, top: 0, bottom: 0, width: 10,
                  background: 'rgba(8,6,6,0.62)',
                  borderLeft: b.dms ? '1px solid rgba(252,61,33,0.65)' : undefined,
                  borderRight: b.dms ? '1px solid rgba(252,61,33,0.65)' : undefined,
                  boxShadow: b.dms ? 'inset 0 0 14px rgba(252,61,33,0.45)' : undefined,
                  animationDelay: `${0.25 + i * 0.35}s`,
                }} />
              ))}
            </div>
            {BANDS.map((b, i) => (
              <span key={i} className="prologue-fade" style={{
                position: 'absolute', left: `${b.x}%`, top: 62, transform: 'translateX(-50%)',
                fontSize: '0.6rem', fontFamily: THEME.monoFont, letterSpacing: '0.06em',
                color: b.dms ? THEME.accentRed : '#6a6a7e',
                animationDelay: `${0.25 + i * 0.35}s`,
              }}>{b.label}</span>
            ))}
          </div>
        </div>

        {/* 第三幕 · 档案（散点与误差棒逐个浮现） */}
        <div key={`s3-${act}`} style={{ ...sceneBase, opacity: act === 2 ? 1 : 0 }}>
          <svg width="100%" height="100%" viewBox="0 0 900 200" preserveAspectRatio="xMidYMid meet">
            {BANDS.map((b, i) => (
              <line key={i} x1={45 + b.x * 8.1} x2={45 + b.x * 8.1} y1={30} y2={150}
                stroke={b.dms ? 'rgba(252,61,33,0.4)' : 'rgba(255,255,255,0.1)'}
                strokeDasharray="3 3" strokeWidth={1} />
            ))}
            <line x1={45} x2={855} y1={150} y2={150} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            {DOTS.map(([x, y], i) => (
              <g key={i} className="prologue-fade" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                <line x1={45 + x * 8.1} x2={45 + x * 8.1} y1={y + 48} y2={y + 72}
                  stroke="rgba(207,214,228,0.5)" strokeWidth={1} />
                <circle cx={45 + x * 8.1} cy={y + 60} r={3.2} fill="#cfd6e4" stroke={THEME.bg} strokeWidth={0.8} />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* ── 字幕 + 控制 ── */}
      <div style={{
        padding: '12px 16px 14px', borderTop: `1px solid ${THEME.panelBorder}`,
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: THEME.displayFont, fontSize: '0.62rem', letterSpacing: '0.2em',
          color: THEME.accentCyan, textShadow: THEME.labelGlow, flexShrink: 0,
        }}>{ACTS[act].label}</span>
        <span style={{
          flex: 1, minWidth: 200, fontSize: '0.78rem', lineHeight: 1.6,
          color: THEME.textSecondary, fontWeight: 300, textAlign: 'left',
        }}>{ACTS[act].text}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {ACTS.map((_, i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === act ? THEME.accentCyan : 'rgba(255,255,255,0.18)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
        {act < 2 ? (
          <button
            onClick={() => setAct(a => a + 1)}
            style={{
              padding: '5px 12px', borderRadius: 2, cursor: 'pointer',
              border: '1px solid rgba(102,217,255,0.35)', background: 'rgba(102,217,255,0.08)',
              color: THEME.accentBlue, fontSize: '0.68rem', letterSpacing: '0.06em', flexShrink: 0,
            }}
          >下一幕 →</button>
        ) : (
          <button
            onClick={enterArchive}
            style={{
              padding: '5px 12px', borderRadius: 2, cursor: 'pointer',
              border: '1px solid rgba(102,217,255,0.35)', background: 'rgba(102,217,255,0.08)',
              color: THEME.accentBlue, fontSize: '0.68rem', letterSpacing: '0.06em', flexShrink: 0,
            }}
          >进入档案 ↓</button>
        )}
        <button
          onClick={close}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: THEME.textFaint, fontSize: '0.66rem', flexShrink: 0,
          }}
        >跳过导入</button>
      </div>
    </div>
  )
}
