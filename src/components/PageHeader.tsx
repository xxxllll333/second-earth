// 统一页面标题：英文微标签 + 中文细字重标题 + 细分隔线
// NASA 风格的核心排版：大写宽字距的英文小标签，搭配克制的正文标题

import type { ReactNode } from 'react'
import { THEME } from '../config/visuals'
import { useIsMobile } from '../lib/useIsMobile'

interface PageHeaderProps {
  enLabel: string      // 英文微标签，如 "EXOPLANET CATALOG"
  title: string        // 中文标题
  subtitle?: ReactNode // 副标题说明（支持多行）
}

export default function PageHeader({ enLabel, title, subtitle }: PageHeaderProps) {
  const isMobile = useIsMobile()
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: isMobile ? 16 : 22,
      padding: isMobile ? '0 16px' : 0,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: isMobile ? '0.6rem' : '0.72rem',
        letterSpacing: isMobile ? '0.14em' : '0.2em',
        color: THEME.accentCyan,
        fontWeight: 400,
        textTransform: 'uppercase',
        fontFamily: THEME.displayFont,
        textShadow: THEME.labelGlow,
        marginBottom: 10,
      }}>
        {enLabel}
      </div>
      <h2 style={{
        fontWeight: 200,
        letterSpacing: isMobile ? '0.14em' : '0.22em',
        fontSize: isMobile ? '1.12rem' : '1.35rem',
        color: THEME.textPrimary,
        margin: 0,
        transform: `scaleY(${THEME.cjkFlatten})`,
        textShadow: THEME.titleGlow,
      }}>
        {title}
      </h2>
      {subtitle && (
        <div style={{
          fontSize: isMobile ? '0.66rem' : '0.72rem',
          color: THEME.textFaint,
          marginTop: 8,
          letterSpacing: '0.06em',
          lineHeight: 1.5,
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
