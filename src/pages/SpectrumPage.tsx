// ═══════════════════════════════════════════════════════════════
// 光谱档案页（层级三 · 近景）
//
// · K2-18b        → 真实 JWST 观测数据 + 三团队 DMS 争议模拟器
//                    （实时后端优先，离线自动回退静态镜像，带 LIVE 徽标）
// · WASP-96b / HD 189733b → 演示光谱（大气强度滑块），后端补齐后可平滑升级
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { spectra } from '../data/spectra'
import { K218B_COMPARE_STATIC, K218B_FITS_STATIC } from '../data/k218bReal'
import {
  fetchSpectrumCompare,
  fetchSpectrumFits,
  type BackendCompare,
  type BackendFits,
} from '../lib/api'
import PageHeader from '../components/PageHeader'
import SpectrumPrologue from '../components/spectrum/SpectrumPrologue'
import K218bDisputeView from '../components/spectrum/K218bDisputeView'
import DemoSpectrumView from '../components/spectrum/DemoSpectrumView'
import { THEME } from '../config/visuals'
import { useIsMobile } from '../lib/useIsMobile'

// 行星选择器：real=true 走真实数据争议视图
const PLANET_TABS = [
  { key: 'K2-18b', label: 'K2-18b', real: true },
  { key: 'WASP-96b', label: 'WASP-96b', real: false },
  { key: 'HD 189733b', label: 'HD 189733b', real: false },
]

export default function SpectrumPage() {
  const { name } = useParams()
  const isMobile = useIsMobile()
  const initial = PLANET_TABS.some(t => t.key === name) ? (name as string) : 'K2-18b'
  const [selected, setSelected] = useState(initial)

  // K2-18b 真实数据：先用静态镜像瞬时渲染（无加载闪烁），后端在线则升级为 LIVE
  const [compare, setCompare] = useState<BackendCompare>(K218B_COMPARE_STATIC)
  const [fits, setFits] = useState<BackendFits>(K218B_FITS_STATIC)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [c, f] = await Promise.all([
        fetchSpectrumCompare('K2-18b'),
        fetchSpectrumFits('K2-18b'),
      ])
      if (cancelled) return
      if (c.data) setCompare(c.data)
      if (f.data) setFits(f.data)
      setLive(c.live || f.live)
    })()
    return () => { cancelled = true }
  }, [])

  const demoSpectrum = spectra.find(s => s.planet === selected)

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: isMobile ? 64 : 76,
      paddingBottom: isMobile ? 32 : 40,
      background: THEME.bg,
      color: THEME.textPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <PageHeader
        enLabel="Spectral Archive"
        title="光谱档案"
        subtitle="K2-18b 为真实 JWST 观测数据 · 多团队科学争议可视化"
      />

      {/* 序章：三幕漫游式导入（凌星 → 指纹 → 档案），看完/跳过后收起为细栏 */}
      <SpectrumPrologue />

      {/* 行星切换按钮组 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', justifyContent: 'center', padding: '0 12px' }}>
        {PLANET_TABS.map(t => {
          const on = selected === t.key
          return (
            <button
              key={t.key}
              onClick={() => setSelected(t.key)}
              style={{
                padding: '6px 16px',
                borderRadius: 2,
                border: `1px solid ${on ? 'rgba(102,217,255,0.35)' : 'rgba(255,255,255,0.12)'}`,
                background: on ? 'rgba(102,217,255,0.1)' : 'transparent',
                color: on ? THEME.accentBlue : THEME.textSecondary,
                fontSize: '0.76rem',
                fontWeight: 300,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              {t.label}
              {t.real && (
                <span style={{
                  fontSize: '0.56rem',
                  padding: '1px 5px',
                  borderRadius: 2,
                  letterSpacing: '0.04em',
                  background: on ? 'rgba(68,204,136,0.18)' : 'rgba(68,204,136,0.1)',
                  color: THEME.accentGreen,
                  border: '1px solid rgba(68,204,136,0.3)',
                }}>真实数据</span>
              )}
            </button>
          )
        })}
      </div>

      {selected === 'K2-18b'
        ? <K218bDisputeView compare={compare} fits={fits} live={live} />
        : demoSpectrum
          ? <DemoSpectrumView spectrum={demoSpectrum} />
          : null}
    </div>
  )
}
