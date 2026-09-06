// 星表页（层级一 · 全景）：筛选器 + 搜索框 + 3D 探索星场 + 行星详情弹窗
// 3D 视图：OrbitControls 拖拽旋转 / 滚轮推拉缩放 / 右键平移，点击星球飞近并打开详情
// 全量数据到达后，筛选逻辑只需把数据源从 keyPlanets 换成后端 JSON 即可

import { useMemo, useState } from 'react'
import Catalog3D, { CatalogFilter } from '../components/Catalog3D'
import PlanetDetailModal from '../components/PlanetDetailModal'
import { keyPlanets, PlanetData } from '../data/planets'
import { THEME } from '../config/visuals'
import { useIsMobile } from '../lib/useIsMobile'

const categoryOptions = ['全部', '主角', '候选宜居', '已否决', '一般']

export default function CatalogPage() {
  const isMobile = useIsMobile()
  const [habitableOnly, setHabitableOnly] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<PlanetData | null>(null)
  const [mode, setMode] = useState<'explore' | 'gallery'>('explore')

  const filter: CatalogFilter = useMemo(
    () => ({ habitableOnly, category }),
    [habitableOnly, category],
  )

  // 当前筛选命中的行星数量（用于面板提示）
  const matchCount = useMemo(() => {
    return keyPlanets.filter(p => {
      if (habitableOnly && !p.isHabitable) return false
      if (category && p.category !== category) return false
      if (searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false
      return true
    }).length
  }, [habitableOnly, category, searchQuery])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Catalog3D
        filter={filter}
        searchQuery={searchQuery}
        selectedName={selected?.name ?? null}
        onSelect={setSelected}
        mode={mode}
      />

      {/* 探索 / 展陈 模式切换 */}
      <div style={{
        position: 'absolute', top: isMobile ? 62 : 76, right: isMobile ? 12 : 20, zIndex: 50, display: 'flex',
        border: `1px solid ${THEME.panelBorder}`, borderRadius: THEME.cardRadius,
        overflow: 'hidden', background: THEME.panelBg,
      }}>
        {([['explore', '探索模式'], ['gallery', '展陈模式']] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: isMobile ? '6px 10px' : '8px 18px', border: 'none', cursor: 'pointer',
              background: mode === m ? 'rgba(32,235,243,0.14)' : 'transparent',
              color: mode === m ? THEME.accentCyan : THEME.textSecondary,
              fontFamily: THEME.monoFont, fontSize: isMobile ? '0.6rem' : '0.68rem', letterSpacing: isMobile ? '0.06em' : '0.12em',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 筛选面板 */}
      <div style={{
        position: 'absolute',
        top: isMobile ? 104 : 76,
        left: isMobile ? 12 : 20,
        width: isMobile ? 'calc(100vw - 24px)' : 244,
        maxWidth: isMobile ? 320 : undefined,
        background: THEME.panelBg,
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: THEME.cardRadius,
        padding: isMobile ? 14 : 18,
        zIndex: 50,
      }}>
        <div style={{
          color: THEME.accentCyan,
          fontSize: '0.66rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontFamily: THEME.displayFont,
          textShadow: THEME.labelGlow,
          marginBottom: 12,
        }}>
          Catalog · 筛选
        </div>

        {/* 搜索框 */}
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索行星名称，如 K2-18b"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.03)',
            color: THEME.textPrimary,
            fontSize: '0.78rem',
            fontWeight: 300,
            outline: 'none',
            marginBottom: 14,
          }}
        />

        {/* 宜居带开关 */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: THEME.textSecondary,
          fontSize: '0.78rem',
          fontWeight: 300,
          cursor: 'pointer',
          marginBottom: 14,
        }}>
          <input
            type="checkbox"
            checked={habitableOnly}
            onChange={e => setHabitableOnly(e.target.checked)}
            style={{ accentColor: THEME.accentGreen }}
          />
          只看宜居带行星
        </label>

        {/* 类别按钮组 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {categoryOptions.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c === '全部' ? null : c)}
              style={{
                padding: '4px 11px',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.1)',
                background: category === c ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: category === c ? THEME.textPrimary : THEME.textSecondary,
                fontSize: '0.7rem',
                fontWeight: 300,
                cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 命中数量 */}
        <div style={{
          color: THEME.textFaint,
          fontSize: '0.7rem',
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          当前显示 <span className="mono" style={{ color: THEME.textPrimary }}>{matchCount}</span> / {keyPlanets.length} 颗
        </div>
      </div>

      {/* 操作提示（两种模式通用）*/}
      <div style={{
        position: 'absolute',
        bottom: isMobile ? 16 : 22,
        left: '50%',
        transform: 'translateX(-50%)',
        width: isMobile ? '90vw' : undefined,
        textAlign: 'center',
        color: THEME.textFaint,
        fontSize: isMobile ? '0.62rem' : '0.7rem',
        letterSpacing: '0.1em',
        pointerEvents: 'none',
        whiteSpace: isMobile ? 'normal' : 'nowrap',
        lineHeight: 1.6,
      }}>
        {isMobile ? '拖拽旋转 · 双指缩放 · 点击星球查看档案' : '拖拽旋转 · 滚轮推拉缩放 · 右键平移 · 点击星球查看档案'}
      </div>

      {/* 回到总览（选中后出现，两种模式通用）*/}
      {selected && (
        <button
          onClick={() => setSelected(null)}
          style={{
            position: 'absolute',
            bottom: 56,
            right: 28,
            padding: '8px 16px',
            background: THEME.panelBg,
            border: '1px solid rgba(186,198,232,0.3)',
            borderRadius: 3,
            color: THEME.textPrimary,
            fontSize: '0.68rem',
            letterSpacing: '0.2em',
            fontFamily: THEME.monoFont,
            cursor: 'pointer',
            zIndex: 50,
          }}
        >
          ⟲ 回到总览
        </button>
      )}

      {/* 详情弹窗 */}
      {selected && (
        <PlanetDetailModal planet={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
