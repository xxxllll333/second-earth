// 旅程页宇宙背景 —— 多层星云，纯 CSS 动画（transform/opacity，GPU 加速，不卡）
// 层次（由远及近）：星系贴图 Ken Burns 极慢漂移 → 彩色星云云 screen 叠加漂移呼吸
//   → 视差星点两层不同速率闪烁 → 中央压暗 + 四周暗角（保证标题/正文可读）
// fixed 固定于视口、zIndex 0；页面内容用 zIndex 1 的相对定位层覆盖其上
import type { CSSProperties } from 'react'
import { THEME } from '../config/visuals'

// 星点层 A：小尺寸平铺、星点较密（远景）
const STAR_A: CSSProperties = {
  backgroundImage: [
    'radial-gradient(1px 1px at 25px 35px, rgba(255,255,255,0.85), transparent)',
    'radial-gradient(1px 1px at 78px 58px, rgba(255,255,255,0.55), transparent)',
    'radial-gradient(1.3px 1.3px at 112px 22px, rgba(200,225,255,0.8), transparent)',
    'radial-gradient(1px 1px at 48px 96px, rgba(255,255,255,0.5), transparent)',
    'radial-gradient(1px 1px at 142px 104px, rgba(255,255,255,0.68), transparent)',
  ].join(', '),
  backgroundRepeat: 'repeat',
  backgroundSize: '160px 130px',
}

// 星点层 B：大尺寸平铺、星点较疏较大（近景）→ 与 A 形成视差
const STAR_B: CSSProperties = {
  backgroundImage: [
    'radial-gradient(1.6px 1.6px at 60px 44px, rgba(255,255,255,0.9), transparent)',
    'radial-gradient(1.2px 1.2px at 168px 126px, rgba(190,215,255,0.7), transparent)',
    'radial-gradient(1.8px 1.8px at 226px 66px, rgba(255,240,220,0.8), transparent)',
  ].join(', '),
  backgroundRepeat: 'repeat',
  backgroundSize: '260px 200px',
}

export default function CosmicBackground() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden',
      pointerEvents: 'none', background: THEME.bg,
    }}>
      {/* 层1：星系贴图，极慢 Ken Burns 缩放 + 平移（浩瀚纵深） */}
      <div className="nebula-image" style={{
        position: 'absolute', inset: '-8%',
        backgroundImage: "url('/nebula.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.4,
      }} />

      {/* 层2：彩色星云云（青 / 紫 / 暖橙），screen 叠加发光，缓慢漂移呼吸 */}
      <div className="nebula-clouds" style={{
        position: 'absolute', inset: 0,
        backgroundImage: [
          'radial-gradient(ellipse 62% 52% at 24% 30%, rgba(32,120,243,0.32), transparent 70%)',
          'radial-gradient(ellipse 52% 46% at 76% 26%, rgba(126,60,220,0.26), transparent 70%)',
          'radial-gradient(ellipse 58% 42% at 60% 80%, rgba(243,140,60,0.15), transparent 72%)',
        ].join(', '),
        mixBlendMode: 'screen',
      }} />

      {/* 层3：视差星点，两层不同速率闪烁 */}
      <div className="nebula-stars" style={{ position: 'absolute', inset: 0, ...STAR_A }} />
      <div className="nebula-stars-2" style={{ position: 'absolute', inset: 0, ...STAR_B }} />

      {/* 层4：中央压暗（标题可读）+ 四周暗角（聚焦中心） */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: [
          'radial-gradient(ellipse 58% 44% at 50% 44%, rgba(6,7,11,0.66), transparent 78%)',
          'radial-gradient(ellipse at 50% 50%, transparent 42%, rgba(6,7,11,0.5) 84%, rgba(6,7,11,0.9) 100%)',
        ].join(', '),
      }} />
    </div>
  )
}
