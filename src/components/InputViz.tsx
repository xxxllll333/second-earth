// InputViz —— 录屏辅助：按键/点击可视化浮层（仅 URL 带 ?keys=1 时启用，评委正常访问不可见）
// 鼠标键 / 键盘 / 滚轮以主题风格浮chip显示在底部居中，1.4s 自动淡出；最多同屏 5 条。
// 点击同时在光标处扩散一圈青色涟漪环，让视频里的点击位置一目了然。
// 优势：页面内渲染，任何录屏方式（含 Playwright 自动化录屏只录浏览器画面）都能拍到。
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { THEME } from '../config/visuals'

interface VizItem { id: number; label: string }
interface Ripple { id: number; x: number; y: number }

const MOUSE_NAMES = ['左键', '中键', '右键', '侧键←', '侧键→']
const KEY_NAMES: Record<string, string> = {
  ' ': 'SPACE', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Escape: 'ESC', Control: 'CTRL', Shift: 'SHIFT', Alt: 'ALT', Enter: 'ENTER',
  Backspace: 'BACKSPACE', Tab: 'TAB', Meta: 'WIN',
}

export default function InputViz() {
  const [on, setOn] = useState(false)
  const [items, setItems] = useState<VizItem[]>([])
  const [ripples, setRipples] = useState<Ripple[]>([])

  useEffect(() => {
    // ?keys=1 开启并写入 sessionStorage（录屏中跳转/刷新不丢）；?keys=0 关闭并清除
    const v = new URLSearchParams(window.location.search).get('keys')
    if (v !== null) {
      if (v === '0') sessionStorage.removeItem('keysViz')
      else sessionStorage.setItem('keysViz', '1')
      setOn(v !== '0')
    } else {
      setOn(sessionStorage.getItem('keysViz') === '1')
    }
  }, [])

  useEffect(() => {
    if (!on) return
    let seq = 0
    const push = (label: string) => {
      const id = ++seq
      setItems((xs) => [...xs.slice(-4), { id, label }])
      window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 1400)
    }
    const md = (e: MouseEvent) => {
      push(MOUSE_NAMES[e.button] ?? `MOUSE ${e.button}`)
      const rid = ++seq
      setRipples((xs) => [...xs.slice(-2), { id: rid, x: e.clientX, y: e.clientY }])
      window.setTimeout(() => setRipples((xs) => xs.filter((r) => r.id !== rid)), 700)
    }
    const kd = (e: KeyboardEvent) => {
      if (e.repeat) return
      push(KEY_NAMES[e.key] ?? e.key.toUpperCase())
    }
    const wh = (e: WheelEvent) => push(e.deltaY > 0 ? '滚轮 ↓' : '滚轮 ↑')
    window.addEventListener('mousedown', md, true)
    window.addEventListener('keydown', kd, true)
    window.addEventListener('wheel', wh, true)
    return () => {
      window.removeEventListener('mousedown', md, true)
      window.removeEventListener('keydown', kd, true)
      window.removeEventListener('wheel', wh, true)
    }
  }, [on])

  if (!on) return null
  return (
    <>
      {/* 点击涟漪：光标处扩散一圈青色环（纯装饰，不吃指针事件） */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0.85, scale: 0.2 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.62, ease: 'easeOut' }}
            style={{
              position: 'fixed', left: r.x - 32, top: r.y - 32, width: 64, height: 64,
              border: `1.5px solid ${THEME.accentCyan}`, borderRadius: '50%',
              boxShadow: `0 0 14px ${THEME.accentCyan}55`,
              zIndex: 9998, pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>

      <div
        style={{
          position: 'fixed', left: '50%', bottom: 20, transform: 'translateX(-50%)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.div
              key={it.id}
              className="mono"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              style={{
                padding: '5px 14px',
                background: THEME.panelBg,
                border: `1px solid ${THEME.panelBorder}`,
                borderBottom: `2px solid ${THEME.accentCyan}`,
                color: THEME.textPrimary,
                fontSize: '0.74rem',
                letterSpacing: '0.16em',
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(6px)',
                boxShadow: `0 0 14px ${THEME.accentCyan}26`,
              }}
            >
              {it.label}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
