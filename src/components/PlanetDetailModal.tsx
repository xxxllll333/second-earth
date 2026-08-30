// 行星详情弹窗：点击星图上的行星后弹出
// 包含：全字段参数、科普文案、收藏按钮、跳转按钮（光谱/星系）

import { useNavigate } from 'react-router-dom'
import { PlanetData } from '../data/planets'
import { useStarStore } from '../store/useStarStore'
import { THEME } from '../config/visuals'

// ── 按行星生成科普文案（特例 + 通用模板） ──
function getNarrative(planet: PlanetData): string {
  if (planet.name === 'K2-18b') {
    return '2023 年，韦伯望远镜在这颗行星的大气里发现了甲烷和二氧化碳——这是人类第一次在宜居带行星上确认含碳分子。更诱人的是：数据里还有二甲基硫醚（DMS）的痕迹，而在地球上，这种分子几乎只由生命产生。'
  }
  if (planet.name === 'WD 1856b') {
    return '一颗木星大小的行星，绕着一颗已经死去的恒星（白矮星）旋转。它竟然没被恒星死亡时的膨胀吞掉——这颗行星的幸存本身，就在提示我们太阳系的结局并不唯一。'
  }
  if (planet.isRejected) {
    return '它曾进入"潜在宜居"名单，但后续观测推翻了判断。科学就是这样：一条好消息要经得起反复检验才算数。保留它，是为了让你看到"纠错"本身的价值。'
  }
  if (planet.isHabitable) {
    return `这是一颗位于宜居带的候选行星，表面温度约 ${planet.temp} K，距离我们 ${planet.distance} 光年。它是否真的有海洋和大气？答案要等下一代望远镜来揭晓。`
  }
  if (planet.temp > 1000) {
    return '这是一颗离恒星极近的热行星，表面温度超过 1000 K，比烤炉还烫。它们不适合生命，却是研究极端大气的最佳实验室。'
  }
  return '一颗普通但独特的系外行星。图鉴里的每一颗，都代表人类视野向外拓展了一小步。'
}

interface PlanetDetailModalProps {
  planet: PlanetData
  onClose: () => void
}

export default function PlanetDetailModal({ planet, onClose }: PlanetDetailModalProps) {
  const navigate = useNavigate()
  const toggleFavorite = useStarStore(s => s.toggleFavorite)
  const isFavorite = useStarStore(s => s.isFavorite(planet.name))

  const rows: [string, string][] = [
    ['半径', `${planet.radius} R🜨`],
    ['质量', planet.mass >= 100 ? `${(planet.mass / 318).toFixed(2)} M♃` : `${planet.mass} M🜨`],
    ['温度', `${planet.temp} K`],
    ['距离', `${planet.distance} 光年`],
    ['轨道周期', `${planet.period} 天`],
    ['地球相似指数', `${planet.esi.toFixed(2)}`],
    ['发现年份', `${planet.discoveryYear}`],
    ['发现方法', planet.discoveryMethod],
  ]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
    }} onClick={onClose}>
      <div style={{
        width: 420,
        maxWidth: '92vw',
        maxHeight: '86vh',
        overflowY: 'auto',
        background: 'rgba(9,10,16,0.97)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 10,
        padding: '26px 28px',
      }} onClick={e => e.stopPropagation()}>
        {/* 档案微标签 */}
        <div style={{
          fontSize: '0.58rem',
          letterSpacing: '0.34em',
          color: THEME.textFaint,
          textTransform: 'uppercase',
          fontFamily: THEME.monoFont,
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>Exoplanet Archive</span>
          <span>{planet.discoveryYear}</span>
        </div>

        {/* 头部：名称 + 类别徽章 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: planet.color,
            boxShadow: `0 0 18px ${planet.color}`,
          }} />
          <h2 style={{ color: THEME.textPrimary, fontSize: '1.3rem', fontWeight: 300, letterSpacing: '0.08em', margin: 0 }}>
            {planet.name}
          </h2>
          <span style={{
            marginLeft: 'auto',
            padding: '3px 10px',
            borderRadius: 2,
            fontSize: '0.66rem',
            letterSpacing: '0.08em',
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.04)',
            color: THEME.textSecondary,
          }}>
            {planet.category}
          </span>
        </div>

        {/* 状态标签 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {planet.isHabitable && (
            <span style={{ color: THEME.accentGreen, fontSize: '0.75rem' }}>🌍 宜居带</span>
          )}
          {planet.hasSpectrum && (
            <span style={{ color: THEME.accentBlue, fontSize: '0.75rem' }}>📊 有光谱数据</span>
          )}
          {planet.isRejected && (
            <span style={{ color: THEME.accentRed, fontSize: '0.75rem' }}>✕ 宜居性已被否决</span>
          )}
        </div>

        {/* 科普文案 */}
        <p style={{
          color: '#c8c8d4',
          fontSize: '0.84rem',
          lineHeight: 1.8,
          fontWeight: 300,
          margin: '0 0 16px',
        }}>
          {getNarrative(planet)}
        </p>

        {/* 参数表：细线 + 等宽数字 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 16,
        }}>
          {rows.map(([label, value], i) => (
            <div key={label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
              padding: '7px 6px',
              borderBottom: i < rows.length - 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{ color: THEME.textFaint }}>{label}</span>
              <span className="mono" style={{ color: THEME.textPrimary }}>{value}</span>
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => toggleFavorite(planet.name)}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 6,
              border: `1px solid ${isFavorite ? THEME.accentGreen : 'rgba(255,255,255,0.14)'}`,
              background: isFavorite ? 'rgba(68,204,136,0.1)' : 'transparent',
              color: isFavorite ? THEME.accentGreen : THEME.textSecondary,
              fontSize: '0.8rem',
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            {isFavorite ? '★ 已收藏' : '☆ 收藏'}
          </button>
          {planet.hasSpectrum && (
            <button
              onClick={() => navigate(`/spectrum/${planet.name}`)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 6,
                border: '1px solid rgba(102,217,255,0.4)',
                background: 'rgba(102,217,255,0.08)',
                color: THEME.accentBlue,
                fontSize: '0.8rem',
                letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              查看光谱 →
            </button>
          )}
          <button
            onClick={() => navigate(`/galaxy/${planet.name}`)}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'transparent',
              color: THEME.textSecondary,
              fontSize: '0.8rem',
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            查看星系 →
          </button>
        </div>
      </div>
    </div>
  )
}
