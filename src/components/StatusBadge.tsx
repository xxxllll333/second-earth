// StatusBadge —— 数据状态徽章（旅程页行星卡 + 我的星表回访共用）
// 三态：绿=稳健 / 黄=争议中 / 红=已否决，附"更新至 YYYY.MM"数据新鲜度钩子
// 无 status 字段的行星不渲染（老数据向后兼容）
import { PlanetData } from '../data/planets'

const TONE = {
  stable:   { color: '#44cc88', label: '稳健' },
  disputed: { color: '#e8b13a', label: '争议中' },
  rejected: { color: '#fc503c', label: '已否决' },
} as const

export default function StatusBadge({ planet, compact = false }: { planet: PlanetData; compact?: boolean }) {
  if (!planet.status) return null
  const t = TONE[planet.status]
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: compact ? '4px 12px' : '6px 14px',
      borderRadius: 3,
      border: `1px solid ${t.color}44`,
      background: `${t.color}0d`,
      fontFamily: "'Cascadia Code', 'Consolas', monospace",
      fontSize: compact ? '0.62rem' : '0.68rem',
      letterSpacing: '0.06em',
      color: t.color,
      whiteSpace: 'nowrap',
    }}>
      {/* 状态灯：呼吸脉冲 */}
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: t.color,
          boxShadow: `0 0 6px ${t.color}`,
          animation: 'statusPulse 2.4s ease-in-out infinite',
          flexShrink: 0,
        }}
      />
      <span>{t.label}</span>
      {planet.statusNote && (
        <span style={{ opacity: 0.85, color: 'rgba(220,220,235,0.75)' }}>{planet.statusNote}</span>
      )}
      {planet.lastUpdated && (
        <span style={{ opacity: 0.6, marginLeft: 2 }}>更新至 {planet.lastUpdated}</span>
      )}
      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}
