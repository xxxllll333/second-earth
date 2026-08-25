// 星表页（层级一 · 全景）：筛选器 + 搜索框 + 3D 探索星场 + 行星详情弹窗
// 3D 视图：OrbitControls 拖拽旋转 / 滚轮推拉缩放 / 右键平移，点击星球飞近并打开详情
// 全量数据到达后，筛选逻辑只需把数据源从 keyPlanets 换成后端 JSON 即可

import { useMemo, useState } from 'react'
import Catalog3D, { CatalogFilter } from '../components/Catalog3D'
import PlanetDetailModal from '../components/PlanetDetailModal'
import { keyPlanets, PlanetData } from '../data/planets'
import { THEME } from '../config/visuals'

const categoryOptions = ['全部', '主角', '候选宜居', '已否决', '一般']

export default function CatalogPage() {
  const [habitableOnly, setHabitableOnly] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<PlanetData | null>(null)

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
      />

      {/* 筛选面板 */}
      <div style={{
        position: 'absolute',
        top: 76,
        left: 20,
        width: 244,
        background: THEME.panelBg,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: 8,
        padding: 18,
        zIndex: 50,
      }}>
        <div style={{
          color: THEME.textFaint,
          fontSize: '0.58rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          fontFamily: THEME.monoFont,
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

      {/* 操作提示 */}
      <div style={{
        position: 'absolute',
        bottom: 22,
        left: '50%',
        transform: 'translateX(-50%)',
        color: THEME.textFaint,
        fontSize: '0.7rem',
        letterSpacing: '0.1em',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        拖拽旋转 · 滚轮推拉缩放 · 右键平移 · 点击星球查看档案
      </div>

      {/* 回到总览（选中后出现） */}
      {selected && (
        <button
          onClick={() => setSelected(null)}
          style={{
            position: 'absolute',
            bottom: 56,
            right: 28,
            padding: '8px 16px',
            background: THEME.panelBg,
            backdropFilter: 'blur(8px)',
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
