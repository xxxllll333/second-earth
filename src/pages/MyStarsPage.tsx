// 我的星表页：收藏的行星列表 + 回访提示横幅
// 回访机制原型：系统模拟"NASA/MAST 发布了新数据"——
// 若收藏中包含 K2-18b，顶部显示更新横幅，点击跳转光谱页对比。

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keyPlanets } from '../data/planets'
import { useStarStore } from '../store/useStarStore'
import PageHeader from '../components/PageHeader'
import { THEME } from '../config/visuals'

// ── 模拟数据更新记录（回访机制原型） ──
const fakeUpdates: Record<string, string> = {
  'K2-18b': 'MAST 于 2026-08 发布了 K2-18b 的新一期 JWST 光谱数据',
}

export default function MyStarsPage() {
  const navigate = useNavigate()
  const favorites = useStarStore(s => s.favorites)
  const toggleFavorite = useStarStore(s => s.toggleFavorite)
  const [dismissed, setDismissed] = useState(false)

  const favoritePlanets = keyPlanets.filter(p => favorites.includes(p.name))
  const updateName = favoritePlanets.find(p => fakeUpdates[p.name])?.name

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: 76,
      paddingBottom: 40,
      background: THEME.bg,
      color: THEME.textPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <PageHeader
        enLabel="My Collection"
        title="我的星表"
        subtitle="收藏的世界 · 持续追踪它们的新发现"
      />

      {/* 回访提示横幅 */}
      {updateName && !dismissed && (
        <div style={{
          width: 640,
          maxWidth: '92vw',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          borderRadius: 8,
          border: '1px solid rgba(68,204,136,0.35)',
          background: 'rgba(68,204,136,0.08)',
          marginBottom: 22,
        }}>
          <span style={{ fontSize: '1.1rem' }}>🔭</span>
          <div style={{ flex: 1, fontSize: '0.8rem', color: '#c8f0d8', lineHeight: 1.6, fontWeight: 300 }}>
            你收藏的 <b style={{ color: '#44cc88' }}>{updateName}</b> 有新数据发布了——
            <br />
            {fakeUpdates[updateName]}
          </div>
          <button
            onClick={() => navigate(`/spectrum/${updateName}`)}
            style={{
              padding: '7px 14px',
              borderRadius: 4,
              border: 'none',
              background: THEME.accentGreen,
              color: '#06070B',
              fontSize: '0.76rem',
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            去看对比 →
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666677',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 空状态 */}
      {favoritePlanets.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: '#555566',
          marginTop: 80,
        }}>
          <div style={{ fontSize: '2.6rem', marginBottom: 12, color: THEME.textFaint }}>☆</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 300, letterSpacing: '0.1em', marginBottom: 6 }}>还没有收藏任何行星</div>
          <div style={{ fontSize: '0.76rem', marginBottom: 20 }}>去星表逛一逛，点亮你感兴趣的世界</div>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 26px',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.16)',
              background: 'transparent',
              color: THEME.textSecondary,
              fontSize: '0.8rem',
              fontWeight: 300,
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            去星表 →
          </button>
        </div>
      )}

      {/* 收藏列表 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 14,
        width: 820,
        maxWidth: '92vw',
      }}>
        {favoritePlanets.map(p => (
          <div key={p.name} style={{
            padding: '16px 18px',
            borderRadius: 8,
            border: `1px solid ${THEME.panelBorder}`,
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: p.color,
                boxShadow: `0 0 12px ${p.color}`,
              }} />
              <span style={{ fontSize: '0.92rem', fontWeight: 300, letterSpacing: '0.06em' }}>{p.name}</span>
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.66rem',
                color: p.isRejected ? THEME.accentRed : p.isHabitable ? THEME.accentGreen : THEME.textSecondary,
              }}>
                {p.isRejected ? '已否决' : p.isHabitable ? '宜居带' : p.category}
              </span>
            </div>

            <div className="mono" style={{ color: THEME.textFaint, fontSize: '0.68rem', lineHeight: 1.6 }}>
              {p.distance} ly · {p.temp} K · P {p.period} d
              {fakeUpdates[p.name] && <div style={{ color: THEME.accentGreen, marginTop: 2 }}>● 有新数据</div>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => navigate(`/galaxy/${p.name}`)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'transparent',
                  color: THEME.textSecondary,
                  fontSize: '0.7rem',
                  fontWeight: 300,
                  cursor: 'pointer',
                }}
              >
                星系
              </button>
              {p.hasSpectrum && (
                <button
                  onClick={() => navigate(`/spectrum/${p.name}`)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 4,
                    border: '1px solid rgba(102,217,255,0.4)',
                    background: 'transparent',
                    color: THEME.accentBlue,
                    fontSize: '0.7rem',
                    fontWeight: 300,
                    cursor: 'pointer',
                  }}
                >
                  光谱
                </button>
              )}
              <button
                onClick={() => toggleFavorite(p.name)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: '1px solid rgba(252,61,33,0.35)',
                  background: 'transparent',
                  color: '#ff8878',
                  fontSize: '0.7rem',
                  fontWeight: 300,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 回访机制说明 */}
      {favoritePlanets.length > 0 && (
        <div style={{
          marginTop: 26,
          color: THEME.textFaint,
          fontSize: '0.7rem',
          maxWidth: 640,
          textAlign: 'center',
          lineHeight: 1.7,
          fontWeight: 300,
          letterSpacing: '0.04em',
        }}>
          回访机制：系统会定期检查 NASA / MAST 的最新发布，若你收藏的行星有数据更新，
          这里就会出现提示——探索不因离开而结束。
        </div>
      )}
    </div>
  )
}
