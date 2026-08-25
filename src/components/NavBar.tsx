// 顶部导航栏：NASA 风格——细字重宽字距、克制的灰、红色高亮当前项
// 左侧品牌区：NASA 红竖条 + 中文名 + 英文微标签

import { NavLink } from 'react-router-dom'
import { useStarStore } from '../store/useStarStore'
import { THEME } from '../config/visuals'

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

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 54,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      background: 'rgba(6,7,11,0.78)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      zIndex: 100,
    }}>
      {/* 品牌区 */}
      <div style={{
        position: 'absolute',
        left: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* NASA 红竖条 */}
        <div style={{
          width: 3,
          height: 22,
          background: THEME.accentRed,
          borderRadius: 1,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{
            fontSize: '0.88rem',
            fontWeight: 300,
            letterSpacing: '0.3em',
            color: THEME.textPrimary,
            lineHeight: 1.2,
          }}>
            第二地球
          </span>
          <span style={{
            fontSize: '0.55rem',
            letterSpacing: '0.34em',
            color: THEME.textFaint,
            textTransform: 'uppercase',
            fontFamily: THEME.monoFont,
          }}>
            Exoplanet Atlas
          </span>
        </div>
      </div>

      {/* 导航项 */}
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          style={({ isActive }) => ({
            padding: '6px 14px',
            fontSize: '0.8rem',
            fontWeight: 300,
            letterSpacing: '0.12em',
            textDecoration: 'none',
            color: isActive ? THEME.textPrimary : THEME.textSecondary,
            position: 'relative',
            transition: 'color 0.2s',
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
                  background: THEME.accentRed,
                  color: '#ffffff',
                  fontSize: '0.62rem',
                  fontWeight: 500,
                  fontFamily: THEME.monoFont,
                }}>
                  {favoriteCount}
                </span>
              )}
              {/* 当前项：红色下划线 */}
              {isActive && (
                <span style={{
                  position: 'absolute',
                  bottom: -2,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 14,
                  height: 2,
                  background: THEME.accentRed,
                  borderRadius: 1,
                }} />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
