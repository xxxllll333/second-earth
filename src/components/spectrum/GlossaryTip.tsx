// ═══════════════════════════════════════════════════════════════
// 微辞典层：把知识锚在提问发生的地方
//
// · TermTip    —— HTML 文本中的虚线下划线术语，hover/点按浮现一句平实解释
// · TipBubble  —— 呈现层气泡；SVG 内锚点（D3 事件驱动）也复用它
//
// 原则：默认隐形、不进主栏；每条解释只一句话，
//       更深的叙述归 AI 解读条（点击展开），二者不重复。
// ═══════════════════════════════════════════════════════════════

import { useState, type CSSProperties, type ReactNode } from 'react'
import { THEME } from '../../config/visuals'

export const GLOSSARY = {
  transitDepth:
    '凌星深度（ppm）：行星在某个波长上多挡住多少恒星的光，以百万分比计。吸收指纹出现的地方，这个值会升高——所以指纹在曲线上表现为小峰。',
  wavelength:
    '波长（μm）：可以理解为光的"颜色"。JWST 测的是红外波段——人眼看不见，但仪器能记录。',
  errorBar:
    '误差棒（±1σ）：想成一次测量的"秤的精度"——读数 2400、精度 ±30，意思是真值大概率藏在这条竖线范围内。悬停任意散点可看它自己的读数与精度。若两个读数的差异比各自误差棒还小，这个差异就不可信。',
  dms:
    'DMS（二甲基硫醚）：在地球上这种气体主要由生命（如海洋藻类）产生，因此被视为潜在生命信号——但它只是假设，不是结论。',
  ch4:
    'CH₄（甲烷）：常见的大气分子。它的吸收指纹是"基线指纹"，用来衬托争议焦点 DMS。',
  co2:
    'CO₂（二氧化碳）：常见的大气分子。它的指纹存在，说明大气确实存在且可被测量。',
  biosignature:
    '生物标志解读：愿意考虑生命可能性的读法（如 DMS 来自生物），置信度最低、争议最大。',
  abiotic:
    '非生物解读：只用非生命过程（地质、大气化学来源）解释全部特征，不引入生命。',
  baseline:
    '保守基线：尽量少下结论，只拟合最确定的成分——科学在证据不足时的克制。',
  threshold:
    '科学置信度门槛：每个团队的解读都有一个置信度分数，门槛是你设定的录取线——线以上的解读暂时站得住，线以下的先退场。它是你的立场，不是数据的属性。',
} as const

export type GlossaryKey = keyof typeof GLOSSARY

// 呈现层气泡：绝对定位，由宿主提供位置
export function TipBubble({ text, style }: { text: string; style: CSSProperties }) {
  return (
    <div style={{
      position: 'absolute', zIndex: 40, pointerEvents: 'none',
      // width max-content：绝对定位 shrink-to-fit 会被窄父级（术语 span）挤成竖字柱，
      // 显式取内容宽后只受 maxWidth 约束——修复气泡可读性
      width: 'max-content', maxWidth: 'min(300px, 92vw)', padding: '9px 12px',
      background: 'rgba(10,12,18,0.96)',
      border: `1px solid ${THEME.panelBorder}`,
      borderRadius: THEME.cardRadius,
      boxShadow: '0 4px 18px rgba(0,0,0,0.5)',
      fontSize: '0.72rem', lineHeight: 1.75, fontWeight: 300,
      color: THEME.textSecondary, textAlign: 'left',
      ...style,
    }}>{text}</div>
  )
}

// HTML 文本锚点：青色下划线 + 上标 ? 标记（可发现性），hover/键盘 focus/点按浮现
export function TermTip({ k, children }: { k: GlossaryKey; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        tabIndex={0}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        style={{
          cursor: 'help', outline: 'none',
          borderBottom: `1px solid ${open ? THEME.accentCyan : 'rgba(32,235,243,0.5)'}`,
          transition: 'border-color 0.2s',
        }}
      >
        {children}
        <sup style={{
          marginLeft: 1, fontSize: '0.7em', color: THEME.accentCyan,
          opacity: open ? 1 : 0.55, transition: 'opacity 0.2s',
        }}>?</sup>
      </span>
      {open && (
        <TipBubble
          text={GLOSSARY[k]}
          style={{ left: '50%', top: -6, transform: 'translate(-50%, -100%)' }}
        />
      )}
    </span>
  )
}
