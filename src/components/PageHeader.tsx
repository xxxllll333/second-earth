// 统一页面标题：英文微标签 + 中文细字重标题 + 细分隔线
// NASA 风格的核心排版：大写宽字距的英文小标签，搭配克制的正文标题

import { THEME } from '../config/visuals'

interface PageHeaderProps {
  enLabel: string      // 英文微标签，如 "EXOPLANET CATALOG"
  title: string        // 中文标题
  subtitle?: string    // 副标题说明
}

export default function PageHeader({ enLabel, title, subtitle }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: 22,
    }}>
      <div style={{
        fontSize: '0.62rem',
        letterSpacing: '0.42em',
        color: THEME.accentRed,
        fontWeight: 400,
        textTransform: 'uppercase',
        fontFamily: THEME.monoFont,
        marginBottom: 10,
      }}>
        {enLabel}
      </div>
      <h2 style={{
        fontWeight: 200,
        letterSpacing: '0.22em',
        fontSize: '1.35rem',
        color: THEME.textPrimary,
        margin: 0,
      }}>
        {title}
      </h2>
      {subtitle && (
        <div style={{
          fontSize: '0.72rem',
          color: THEME.textFaint,
          marginTop: 8,
          letterSpacing: '0.06em',
        }}>
          {subtitle}
        </div>
      )}
      {/* 细分隔线 */}
      <div style={{
        width: 48,
        height: 1,
        background: 'rgba(255,255,255,0.18)',
        marginTop: 14,
      }} />
    </div>
  )
}
