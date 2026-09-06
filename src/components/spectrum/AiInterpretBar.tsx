// ═══════════════════════════════════════════════════════════════
// AI 解读条：默认沉默的一条细栏，访客主动点击才展开解读。
//
// · 解读文本来自 src/data/aiInterpretation.ts（开发期大模型生成并存档）
// · 第三段随当前置信度门槛分段匹配，保证解读与屏幕状态同步
// · 展开区末尾固定免责声明：解读是参考叙述，数据仍是第一证据
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { AI_INTERPRET } from '../../data/aiInterpretation'
import { matchAnswer, SUGGESTED_QS } from '../../data/spectrumQA'
import { THEME } from '../../config/visuals'

interface Props {
  width: number | string
  // 屏幕实测数字（如 DMS 处三解读差 vs 典型误差棒），由宿主计算传入
  disputeNote?: string
}

export default function AiInterpretBar({ width, disputeNote }: Props) {
  const [open, setOpen] = useState(false)
  const [qaLog, setQaLog] = useState<{ q: string; a: string }[]>([])
  const [draft, setDraft] = useState('')

  const ask = (raw: string) => {
    const q = raw.trim()
    if (!q) return
    setQaLog(l => [...l, { q, a: matchAnswer(q) }])
    setDraft('')
  }

  return (
    <div style={{
      width, maxWidth: '94vw', marginTop: 10,
      border: `1px solid ${open ? 'rgba(32,235,243,0.35)' : THEME.panelBorder}`,
      borderRadius: THEME.cardRadius,
      background: 'rgba(32,235,243,0.03)',
      overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      {/* 折叠态：一条细栏，不占版面 */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{
          fontFamily: THEME.displayFont, fontSize: '0.6rem', letterSpacing: '0.2em',
          color: THEME.accentCyan, textShadow: THEME.labelGlow, flexShrink: 0,
        }}>✦ AI INTERPRET</span>
        <span style={{ fontSize: '0.68rem', color: THEME.textFaint, fontWeight: 300, textAlign: 'left' }}>
          为什么谁也否不掉谁？展开看深读 + 自由提问 · 不代表项目结论
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.66rem', color: THEME.textFaint, flexShrink: 0 }}>
          {open ? '收起 ⌃' : '展开 ⌄'}
        </span>
      </button>

      {/* 展开态：争议深读（概念框 + 真实数字）+ 免责声明 + 问答 */}
      {open && (
        <div style={{ padding: '2px 14px 12px', borderTop: `1px solid ${THEME.panelBorder}` }}>
          <p style={{
            margin: '10px 0 0', fontSize: '0.76rem', lineHeight: 1.85,
            color: THEME.textSecondary, fontWeight: 300, textAlign: 'left',
          }}>{AI_INTERPRET.dispute}</p>
          {/* 屏幕实测：把上面的"差异 vs 误差棒"落成真实数字 */}
          {disputeNote && (
            <p style={{
              margin: '10px 0 0', padding: '6px 10px',
              borderLeft: `2px solid rgba(102,217,255,0.4)`,
              fontSize: '0.7rem', lineHeight: 1.8, fontWeight: 300,
              color: THEME.textSecondary, textAlign: 'left',
              fontFamily: THEME.monoFont,
            }}>{disputeNote}</p>
          )}
          <div style={{
            marginTop: 12, paddingTop: 8, borderTop: `1px solid ${THEME.panelBorder}`,
            fontSize: '0.62rem', color: THEME.textFaint, lineHeight: 1.6, textAlign: 'left',
          }}>
            解读由大模型于开发期生成并随数据存档，仅供参考叙述；屏幕上的散点、误差棒与文献仍是第一证据。
          </div>

          {/* 内置问答：离线知识库匹配，确定性可复现 */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${THEME.panelBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: THEME.displayFont, fontSize: '0.58rem', letterSpacing: '0.18em',
                color: THEME.accentCyan, textShadow: THEME.labelGlow,
              }}>ASK · 问答</span>
              <span style={{ fontSize: '0.62rem', color: THEME.textFaint }}>问任何与这张光谱有关的问题 · 答案由离线知识库匹配</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {SUGGESTED_QS.map(q => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  style={{
                    padding: '3px 9px', borderRadius: 2, cursor: 'pointer',
                    border: '1px solid rgba(102,217,255,0.3)', background: 'rgba(102,217,255,0.06)',
                    color: THEME.accentBlue, fontSize: '0.62rem', letterSpacing: '0.02em',
                  }}
                >{q}</button>
              ))}
            </div>
            {qaLog.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
                {qaLog.map((pair, i) => (
                  <div key={i} style={{ marginTop: i === 0 ? 0 : 10 }}>
                    <div style={{ fontSize: '0.66rem', color: THEME.accentBlue, fontFamily: THEME.monoFont, textAlign: 'left' }}>
                      Q · {pair.q}
                    </div>
                    <div style={{ fontSize: '0.72rem', lineHeight: 1.8, color: THEME.textSecondary, fontWeight: 300, marginTop: 2, textAlign: 'left' }}>
                      {pair.a}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') ask(draft) }}
                placeholder="例如：为什么谁也否不掉谁？"
                style={{
                  flex: 1, minWidth: 0, padding: '6px 10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${THEME.panelBorder}`, borderRadius: 2,
                  color: THEME.textPrimary, fontSize: '0.7rem', outline: 'none',
                }}
              />
              <button
                onClick={() => ask(draft)}
                style={{
                  padding: '6px 14px', borderRadius: 2, cursor: 'pointer', flexShrink: 0,
                  border: '1px solid rgba(102,217,255,0.35)', background: 'rgba(102,217,255,0.08)',
                  color: THEME.accentBlue, fontSize: '0.68rem', letterSpacing: '0.06em',
                }}
              >提问</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
