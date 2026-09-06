// 顶部导航栏：NASA 风格——细字重宽字距、克制的灰、青色高亮当前项
// 左侧品牌区：青色竖条 + 中文名 + 英文微标签

import { NavLink } from 'react-router-dom'
import { useStarStore } from '../store/useStarStore'
import { THEME } from '../config/visuals'
import { useIsMobile } from '../lib/useIsMobile'

const navItems = [
  { path: '/', label: '旅程', en: 'JOURNEY' },
  { path: '/catalog', label: '星表', en: 'CATALOG' },
  { path: '/galaxy', label: '星系', en: 'SYSTEMS' },
  { path: '/spectrum', label: '光谱', en: 'SPECTRA' },
  { path: '/evolution', label: '演化', en: 'EVOLUTION' },
  { path: '/mystars', label: '我的星表', en: 'MY STARS' },
]

export default function NavBar() {
  const favoriteCount = useStarStore(s => s.favorites.length)
  const isMobile = useIsMobile()

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: isMobile ? 50 : 54,
      display: 'flex',
      alignItems: 'center',
      justifyContent: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? 0 : 4,
      paddingLeft: isMobile ? 12 : 0,
      background: 'rgba(6,7,11,0.78)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      zIndex: 100,
    }}>
      {/* 品牌区 */}
      <div style={{
        position: isMobile ? 'static' : 'absolute',
        left: isMobile ? undefined : 22,
        flexShrink: 0,
        marginRight: isMobile ? 6 : 0,
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 8 : 12,
      }}>
        {/* 品牌青色竖条 */}
        <div style={{
          width: 2,
          height: isMobile ? 22 : 30,
          background: THEME.accentCyan,
          borderRadius: 1,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{
            fontSize: isMobile ? '0.76rem' : '0.88rem',
            fontWeight: 300,
            letterSpacing: isMobile ? '0.14em' : '0.3em',
            color: THEME.textPrimary,
            lineHeight: 1.2,
          }}>
            第二地球
          </span>
          {!isMobile && (
            <span style={{
              fontSize: '0.64rem',
              letterSpacing: '0.16em',
              color: THEME.accentCyan,
              textTransform: 'uppercase',
              fontFamily: THEME.displayFont,
              textShadow: THEME.labelGlow,
            }}>
              Exoplanet Atlas
            </span>
          )}
        </div>
      </div>

      {/* 导航项（移动端横向滚动） */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 0 : 4,
        flex: isMobile ? 1 : undefined,
        overflowX: isMobile ? 'auto' : 'visible',
        WebkitOverflowScrolling: 'touch',
      }}>
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          style={({ isActive }) => ({
            padding: isMobile ? '6px 9px' : '6px 14px',
            fontSize: isMobile ? '0.74rem' : '0.8rem',
            fontWeight: 300,
            letterSpacing: isMobile ? '0.04em' : '0.12em',
            textDecoration: 'none',
            color: isActive ? THEME.textPrimary : THEME.textSecondary,
            position: 'relative',
            transition: 'color 0.2s',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          })}
        >
          {({ isActive }) => (
            <>
              {item.label}
              {item.path === '/mystars' && favoriteCount > 0 && (
                <span style={{
                  marginLeft: 5,
                  padding: '0px 6px',
                  borderRadius: 8,
                  background: THEME.accentCyan,
                  color: '#061018',
                  fontSize: '0.62rem',
                  fontWeight: 500,
                  fontFamily: THEME.monoFont,
                }}>
                  {favoriteCount}
                </span>
              )}
              {/* 当前项：青色下划线 */}
              {isActive && (
                <span style={{
                  position: 'absolute',
                  bottom: -2,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 14,
                  height: 2,
                  background: THEME.accentCyan,
                  borderRadius: 1,
                }} />
              )}
            </>
          )}
        </NavLink>
      ))}
      </div>
    </nav>
  )
}
