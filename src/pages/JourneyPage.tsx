// 旅程首页（滚动叙事）：参考 Solar Journey 的"滚动旅程"体验
// 结构：Hero → 「为什么寻找第二地球」序章 → 5 颗重点行星特写（3D 球体 + 三拍交互时间轴 + 状态徽章）→ 结尾引导进入星表
// 动画：framer-motion 的 whileInView / onViewportEnter（进入视口触发），无额外滚动库

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { keyPlanets, PlanetData } from '../data/planets'
import Planet3D, { PlanetBeat, PlanetTextureSet } from '../components/Planet3D'
import StatusBadge from '../components/StatusBadge'
import BgmPlayer from '../components/BgmPlayer'
import { THEME } from '../config/visuals'
import earthDay from '../assets/textures/earth_day_4096.jpg'
import earthClouds from '../assets/textures/earth_clouds_1024.png'
import earthNormal from '../assets/textures/earth_normal_2048.jpg'
import venusAtmos from '../assets/textures/venus_atmosphere_2k.jpg'
import neptuneMap from '../assets/textures/neptune_2k.jpg'

// ── 旅程故事三拍：发现 → 希望 → 证伪/悬置 ──
interface JourneyBeat {
  year: string
  title: string
  text: string
  tone: PlanetBeat
}

// ── 旅程主角：五类故事的典型行星 ──
interface JourneyPlanet {
  name: string
  tag: string
  headline: string
  textures: PlanetTextureSet
  beats: JourneyBeat[]
}

const journeyPlanets: JourneyPlanet[] = [
  {
    name: 'K2-18b',
    tag: 'THE HYCEAN CANDIDATE',
    headline: '一颗有海的世界？',
    textures: { clouds: earthClouds, tint: '#1a4a78', cloudOpacity: 0.85, roughness: 0.9 },
    beats: [
      { year: '2015', title: 'K2 掠影', tone: 'discovery', text: '开普勒 K2 任务在 124 光年外的狮子座方向，捕捉到一颗行星周期性掠过恒星的身影——2.37 倍地球半径、8.9 倍质量，一颗被氢气海包裹的"亚海王星"。当时几乎没有人把它和宜居联系在一起。' },
      { year: '2019', title: '水蒸气信号', tone: 'hope', text: '哈勃望远镜两次凌星光谱叠加，在它的大气里发现了水蒸气——这是人类第一次在宜居带行星的大气中找到水。K2-18b 从"数据表里的一行"，变成了"一颗有海的世界"的候选。' },
      { year: '2023–今', title: 'DMS 之争', tone: 'disputed', text: '韦伯进一步测到甲烷与二氧化碳，甚至出现二甲基硫醚（DMS）的痕迹——在地球上，这种分子只由生命产生。但多个团队的复测结果并不一致：信号可能是真的，也可能是仪器噪声。这场"光谱辩论"至今仍在继续。' },
    ],
  },
  {
    name: 'TRAPPIST-1d',
    tag: 'THE FALSIFIED EARTH',
    headline: '曾是"最像地球"的星球',
    textures: { tint: '#6a6a72', roughness: 0.95 },
    beats: [
      { year: '2016', title: '七颗行星', tone: 'discovery', text: '斯皮策空间望远镜在 39 光年外，发现七颗岩石行星环绕一颗红矮星。其中 TRAPPIST-1d 的 ESI 地球相似指数高达 0.90——七颗里最接近地球的候选，媒体头条的宠儿。' },
      { year: '2016–19', title: '液态水候选', tone: 'hope', text: '0.77 倍地球半径、平衡温度 286K——液态水理论上可以在表面存在。它和 1e、1f 一起，被列为韦伯望远镜的重点大气观测目标。' },
      { year: '2025', title: '韦伯宣判', tone: 'rejected', text: '韦伯实测结果：它没有大气层。没有气压、没有温室、没有海洋——只是一颗被恒星风吹蚀的裸露岩球。ESI 0.90 的"第二地球"，被画上了红叉。' },
    ],
  },
  {
    name: 'TRAPPIST-1e',
    tag: 'EARTH-LIKE IN SIZE',
    headline: '与地球最接近的大小',
    textures: { map: earthDay, clouds: earthClouds, normal: earthNormal, cloudOpacity: 0.6, roughness: 0.7 },
    beats: [
      { year: '2017', title: '宜居带三胞胎', tone: 'discovery', text: 'NASA 宣布：TRAPPIST-1 的七颗行星中，有三颗位于宜居带。其中 1e 的半径、质量与密度，都和地球惊人地相似。' },
      { year: '2017–今', title: '另一个地球？', tone: 'hope', text: 'ESI 0.85——太阳系外最接近"另一个地球"大小的世界之一。红矮星的光微弱而冷，但 1e 恰好处在那个不冷不热的位置上。' },
      { year: '进行时', title: '等待宣判', tone: 'disputed', text: '韦伯正在逐一分析七颗行星的大气。1d 已经出局，1e 是下一个等待实测结果的候选——希望还在，证据未到。' },
    ],
  },
  {
    name: 'WASP-96b',
    tag: 'THE SPECTRAL LANDMARK',
    headline: '光谱里程碑',
    textures: { map: venusAtmos, tint: '#ffb98a', roughness: 0.92 },
    beats: [
      { year: '2013', title: '炽热标靶', tone: 'discovery', text: '一颗 1285K 的炽热气态巨行星。热得不可能有生命，但它大、亮、凌星深——是练习"读谱辨大气"的理想标靶。' },
      { year: '2022.07.12', title: '韦伯首张光谱', tone: 'hope', text: '韦伯望远镜公开发布的第一张系外行星光谱，就是它。水分子的吸收指纹清晰得不可思议——"透过大气看行星"从概念变成了日常。' },
      { year: '此后', title: '技术标尺', tone: 'discovery', text: '它不适合生命，却为所有后来的类地行星测量立下标尺。今天人们争论 K2-18b 的 DMS 信号，用的正是从 WASP-96b 开始校准的技术。' },
    ],
  },
  {
    name: 'WD 1856b',
    tag: 'THE SURVIVOR',
    headline: '白矮星旁的幸存者',
    textures: { map: neptuneMap, roughness: 0.92 },
    beats: [
      { year: '2020', title: '巨行星伴矮星', tone: 'discovery', text: 'TESS 发现一颗木星大小的行星，环绕着一颗白矮星——那恒星的残骸只有地球大小。行星比恒星大七倍，仍在稳定地公转。' },
      { year: '2020–今', title: '终局非终结', tone: 'hope', text: '恒星死亡时行星可以幸存。这意味着 50 亿年后太阳变为白矮星，木星与土星或许仍能存续——宇宙的终局，并非万物的终结。' },
      { year: '未解', title: '幸存之谜', tone: 'disputed', text: '它如何从红巨星的膨胀中活下来？轨道又是如何迁移到今天的位置？至今没有完美解释。它是行星系统的"考古现场"。' },
    ],
  },
]

// ── 每颗行星的档案参数 ──
function planetParams(name: string) {
  const p = keyPlanets.find(x => x.name === name)!
  return [
    { label: '距离', value: `${p.distance} ly` },
    { label: '半径', value: `${p.radius} R⊕` },
    { label: '平衡温度', value: `${p.temp} K` },
    { label: '公转周期', value: `${p.period} d` },
    { label: 'ESI 相似指数', value: `${p.esi}` },
    { label: '发现', value: `${p.discoveryYear} · ${p.discoveryMethod}` },
  ]
}

// ── 淡入上浮动画（滚动触发） ──
const fadeUp = {
  initial: { opacity: 0, y: 56 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.9, ease: 'easeOut' as const },
}

// 过渡段逐行浮现的文案（strong 为强调句，浮现前多停半拍）
const introLines = [
  { text: '每一颗系外行星，都是从望远镜数据里“读”出来的世界——' },
  { text: '凌星时的一丝变暗，光谱里的一道吸收谷，' },
  { text: '恒星摆动中的一次微移。' },
  { text: '我们从其中挑出几个故事，开始这段旅程。', strong: true },
]

// ── 序章文案：为什么寻找第二地球（strong 为收束句）──
const whyLines = [
  { text: '1990 年，旅行者 1 号在 60 亿公里外回望——' },
  { text: '地球，只是一个 0.12 像素的淡蓝色点。' },
  { text: '约 50 亿年后，太阳将膨胀为红巨星，吞没这粒微尘。' },
  { text: '我们寻找第二颗地球，是在问：人类是否只有这一扇窗。', strong: true },
]

// ── 拍状态配色与标签 ──
const BEAT_COLOR: Record<PlanetBeat, string> = {
  discovery: '#9fb6d8',
  hope: '#44cc88',
  rejected: '#fc503c',
  disputed: '#e8b13a',
}
const BEAT_LABEL: Record<PlanetBeat, string> = {
  discovery: '发现',
  hope: '希望',
  rejected: '证伪',
  disputed: '悬置',
}

// ── 交互时间轴：竖排三节点，自动逐拍点亮，点击节点跳拍/展开详情 ──
function BeatTimeline({ beats, active, onSelect }: {
  beats: JourneyBeat[]
  active: number
  onSelect: (i: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {beats.map((b, i) => {
        const isActive = i === active
        const passed = i < active
        const c = BEAT_COLOR[b.tone]
        return (
          <div key={b.year + b.title} style={{ position: 'relative', paddingLeft: 24, paddingBottom: i < beats.length - 1 ? 16 : 0 }}>
            {/* 节点间连线 */}
            {i < beats.length - 1 && (
              <div style={{ position: 'absolute', left: 4.5, top: 16, bottom: -2, width: 1, background: 'rgba(255,255,255,0.14)' }} />
            )}
            {/* 圆点：当前拍放大发光，已播放实心，未播放空心 */}
            <motion.button
              onClick={() => onSelect(i)}
              animate={{ scale: isActive ? 1.35 : 1 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                left: 0,
                top: 6,
                width: 10,
                height: 10,
                borderRadius: '50%',
                cursor: 'pointer',
                border: passed || isActive ? 'none' : '1px solid rgba(255,255,255,0.35)',
                background: passed || isActive ? c : 'transparent',
                boxShadow: isActive ? `0 0 8px ${c}` : 'none',
                padding: 0,
              }}
            />
            {/* 年份 + 标题（整行可点，hover 高亮背景 + 文字变白） */}
            <motion.button
              onClick={() => onSelect(i)}
              animate={{ color: isActive ? '#ffffff' : 'rgba(200,200,215,0.62)', background: 'rgba(255,255,255,0)' }}
              whileHover={{ x: 4, color: '#ffffff', background: 'rgba(255,255,255,0.06)' }}
              transition={{ duration: 0.2 }}
              style={{
                cursor: 'pointer',
                border: 'none',
                padding: '4px 8px 4px 0',
                marginLeft: -8,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span
                className="mono"
                style={{
                  fontFamily: THEME.monoFont,
                  fontSize: '0.78rem',
                  letterSpacing: '0.04em',
                  color: isActive ? '#ffffff' : 'inherit',
                  minWidth: 62,
                }}
              >
                {b.year}
              </span>
              <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: isActive ? c : 'inherit' }}>
                {b.title}
              </span>
            </motion.button>
          </div>
        )
      })}
    </div>
  )
}

// ── 单颗行星故事章节：自动逐拍播放 + 点击接管 + 3D 球状态联动 ──
function PlanetStory({ item, planet, reversed }: { item: JourneyPlanet; planet: PlanetData; reversed: boolean }) {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [started, setStarted] = useState(false)
  const [manual, setManual] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // 进入视口自动逐拍播放（2.6s/拍）；用户点击时间轴后永久接管
  useEffect(() => {
    if (!started || manual) return
    setActive(0)
    const t = setInterval(() => setActive((a) => Math.min(a + 1, item.beats.length - 1)), 2600)
    return () => clearInterval(t)
  }, [started, manual, item.beats.length])

  const beat = item.beats[Math.min(active, item.beats.length - 1)]
  const beatColor = BEAT_COLOR[beat.tone]

  function handleSelect(i: number) {
    setManual(true)
    // 再次点击当前拍：收起详情；否则跳拍并展开详情
    if (i === active && expanded) {
      setExpanded(false)
      return
    }
    setActive(i)
    setExpanded(true)
  }

  return (
    <motion.section
      onViewportEnter={() => setStarted(true)}
      viewport={{ once: true, amount: 0.4 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: reversed ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 'clamp(32px, 7vw, 110px)',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 1180,
      }}>
        {/* 3D 球体：随当前拍变化（希望提亮 / 证伪褪色） */}
        <motion.div
          initial={{ opacity: 0, scale: 0.86 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ position: 'relative' }}
        >
          <Planet3D planet={planet} size={420} textures={item.textures} beat={beat.tone} />
        </motion.div>

        {/* 文字与交互时间轴 */}
        <div style={{ maxWidth: 480, minWidth: 300 }}>
          <motion.div
            {...fadeUp}
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.38em',
              color: THEME.textFaint,
              textTransform: 'uppercase',
              fontFamily: THEME.monoFont,
              marginBottom: 10,
            }}
          >
            {item.tag} · {planet.discoveryYear}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            style={{
              fontFamily: "'Jost Variable', 'Jost', Futura, 'Segoe UI', sans-serif",
              fontWeight: 340,
              letterSpacing: '0.18em',
              fontSize: 'clamp(1.7rem, 3.8vw, 2.5rem)',
              margin: '0 0 4px',
            }}
          >
            {item.name}
          </motion.h2>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            style={{
              color: planet.isHabitable ? THEME.accentGreen : THEME.textSecondary,
              fontSize: '0.82rem',
              fontWeight: 300,
              letterSpacing: '0.16em',
              marginBottom: 20,
            }}
          >
            {item.headline}
          </motion.div>

          {/* 三拍交互时间轴 */}
          <BeatTimeline beats={item.beats} active={active} onSelect={handleSelect} />

          {/* 首次引导：自动播放阶段呼吸闪烁，用户点击任意节点后消失 */}
          {!manual && (
            <motion.div
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                marginTop: 12,
                fontSize: '0.68rem',
                letterSpacing: '0.08em',
                color: THEME.accentBlue,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: '0.85rem', color: beatColor }}>↳</span>
              点击时间轴任意节点，展开完整故事
            </motion.div>
          )}

          {/* 当前拍详情卡：整卡可点展开/收起，左侧状态色条 + 右侧展开按钮 */}
          <div style={{ marginTop: 16 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${active}-${expanded ? 'open' : 'brief'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                onClick={() => setExpanded(expanded ? false : true)}
                style={{
                  border: `1px solid ${expanded ? `${beatColor}55` : 'rgba(255,255,255,0.12)'}`,
                  background: expanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.028)',
                  borderRadius: 10,
                  padding: '14px 16px 14px 18px',
                  position: 'relative',
                  cursor: 'pointer',
                  minHeight: 96,
                }}
              >
                {/* 左侧状态色条 */}
                <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, background: beatColor }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      className="mono"
                      style={{ fontSize: '0.58rem', letterSpacing: '0.28em', color: beatColor, fontFamily: THEME.monoFont }}
                    >
                      {BEAT_LABEL[beat.tone]}
                    </span>
                    <span style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: THEME.textSecondary }}>{beat.title}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      letterSpacing: '0.12em',
                      color: expanded ? THEME.textFaint : beatColor,
                      border: `1px solid ${expanded ? 'rgba(255,255,255,0.2)' : `${beatColor}66`}`,
                      borderRadius: 4,
                      padding: '3px 10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {expanded ? '收起 ▴' : '展开全文 ▾'}
                  </span>
                </div>
                <p style={{ color: '#c8c8d4', fontSize: '0.88rem', fontWeight: 300, lineHeight: 2, margin: 0 }}>
                  {expanded ? beat.text : beat.text.slice(0, 46) + '…'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 参数条：逐条滑入 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            marginTop: 10,
          }}>
            {planetParams(item.name).map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, x: -26 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.55, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 10,
                  fontSize: '0.72rem',
                  padding: '9px 2px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <span style={{ color: THEME.textFaint }}>{p.label}</span>
                <span className="mono" style={{ color: THEME.textPrimary }}>{p.value}</span>
              </motion.div>
            ))}
          </div>

          {/* 数据状态徽章：常驻数据新鲜度钩子 */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
          >
            <StatusBadge planet={planet} />
          </motion.div>

          {/* 快捷入口 */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.7 }}
            style={{ display: 'flex', gap: 12, marginTop: 24 }}
          >
            <button
              onClick={() => navigate(`/spectrum/${item.name}`)}
              style={{
                padding: '9px 22px',
                borderRadius: 4,
                border: '1px solid rgba(102,217,255,0.4)',
                background: 'rgba(102,217,255,0.06)',
                color: THEME.accentBlue,
                fontSize: '0.78rem',
                fontWeight: 300,
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              光谱档案 →
            </button>
            <button
              onClick={() => navigate(`/galaxy/${item.name}`)}
              style={{
                padding: '9px 22px',
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'transparent',
                color: THEME.textSecondary,
                fontSize: '0.78rem',
                fontWeight: 300,
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              星系视图 →
            </button>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}

export default function JourneyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ background: THEME.bg, color: THEME.textPrimary, overflowX: 'hidden' }}>
      {/* 宇宙氛围背景音乐（右上角开关，浏览器策略要求用户手势触发） */}
      <BgmPlayer />
      {/* ═══════════ HERO ═══════════ */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '0 24px',
      }}>
        {/* 背景轨道弧线装饰 */}
        <svg
          viewBox="0 0 1200 700"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5, pointerEvents: 'none' }}
          preserveAspectRatio="xMidYMid slice"
        >
          <circle cx="600" cy="700" r="420" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <circle cx="600" cy="700" r="620" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
          <circle cx="600" cy="700" r="840" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="0" y1="560" x2="1200" y2="560" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          {/* 三颗星点 */}
          <circle cx="320" cy="300" r="1.6" fill="rgba(255,255,255,0.8)" />
          <circle cx="860" cy="210" r="1.2" fill="rgba(255,255,255,0.6)" />
          <circle cx="1020" cy="420" r="1.8" fill="rgba(255,255,255,0.75)" />
        </svg>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, delay: 0.2 }}
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.5em',
            color: THEME.accentRed,
            textTransform: 'uppercase',
            fontFamily: THEME.monoFont,
            marginBottom: 22,
          }}
        >
          Exoplanet Journey
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40, letterSpacing: '0.42em' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '0.26em' }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.5 }}
          style={{
            fontFamily: "'Jost Variable', 'Jost', Futura, 'Segoe UI', sans-serif",
            fontWeight: 300,
            fontSize: 'clamp(1.8rem, 5.6vw, 3.8rem)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          SECOND EARTH
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.1 }}
          style={{
            color: THEME.textSecondary,
            fontSize: '0.85rem',
            fontWeight: 300,
            letterSpacing: '0.14em',
            marginTop: 26,
            textAlign: 'center',
            lineHeight: 2,
          }}
        >
          5000+ 颗系外行星已被确认 · 这是一段寻找另一个地球的旅程
          <br />
          从数据到故事，认识太阳系之外的世界
        </motion.div>

        {/* 向下滚动指示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 2 }}
          style={{ position: 'absolute', bottom: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
        >
          <span style={{ fontSize: '0.58rem', letterSpacing: '0.4em', color: THEME.textFaint, textTransform: 'uppercase', fontFamily: THEME.monoFont }}>
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ color: THEME.textSecondary, fontSize: '1rem' }}
          >
            ↓
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════ 序章：为什么寻找第二地球 ═══════════ */}
      <section
        style={{
          minHeight: '100vh',
          padding: '140px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ width: 48, height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 36 }} />
        <motion.div
          {...fadeUp}
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.44em',
            color: THEME.accentRed,
            textTransform: 'uppercase',
            fontFamily: THEME.monoFont,
            marginBottom: 34,
          }}
        >
          Why A Second Earth
        </motion.div>
        <p style={{ maxWidth: 640, fontSize: '1.05rem', fontWeight: 300, lineHeight: 2.2, letterSpacing: '0.08em', margin: 0 }}>
          {whyLines.map((line, i) => (
            <motion.span
              key={line.text}
              initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
              whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1.9, delay: i * 1.05 + (line.strong ? 0.8 : 0), ease: 'easeOut' }}
              style={{ display: 'block', color: line.strong ? THEME.textPrimary : THEME.textSecondary }}
            >
              {line.text}
            </motion.span>
          ))}
        </p>
        <motion.div
          {...fadeUp}
          transition={{ duration: 1.2, delay: 5.4 }}
          className="mono"
          style={{ marginTop: 46, fontSize: '0.62rem', letterSpacing: '0.3em', color: THEME.textFaint, fontFamily: THEME.monoFont }}
        >
          50 亿年 · 5000+ 颗已确认行星 · 2026 地球 2.0 计划推进中
        </motion.div>
      </section>

      {/* ═══════════ 过渡段 1 ═══════════ */}
      <section
        style={{
          padding: '140px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{
          width: 48, height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 36,
        }} />
        {/* 逐行慢速浮现：blur→清晰，方便细读 */}
        <p style={{
          maxWidth: 620,
          fontSize: '1.05rem',
          fontWeight: 300,
          lineHeight: 2.1,
          letterSpacing: '0.08em',
          margin: 0,
        }}>
          {introLines.map((line, i) => (
            <motion.span
              key={line.text}
              initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
              whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                duration: 1.9,
                delay: i * 1.05 + (line.strong ? 0.8 : 0),
                ease: 'easeOut',
              }}
              style={{
                display: 'block',
                color: line.strong ? THEME.textPrimary : THEME.textSecondary,
              }}
            >
              {line.text}
            </motion.span>
          ))}
        </p>
      </section>

      {/* ═══════════ 行星特写 ×5 ═══════════ */}
      {journeyPlanets.map((item, idx) => {
        const planet = keyPlanets.find(x => x.name === item.name)!
        return <PlanetStory key={item.name} item={item} planet={planet} reversed={idx % 2 === 1} />
      })}

      {/* ═══════════ 结尾 CTA ═══════════ */}
      <motion.section
        {...fadeUp}
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px',
        }}
      >
        <div style={{
          fontSize: '0.6rem',
          letterSpacing: '0.44em',
          color: THEME.accentRed,
          textTransform: 'uppercase',
          fontFamily: THEME.monoFont,
          marginBottom: 18,
        }}>
          Continue The Journey
        </div>
        <h2 style={{
          fontWeight: 200,
          letterSpacing: '0.2em',
          fontSize: 'clamp(1.5rem, 4vw, 2.4rem)',
          margin: '0 0 18px',
        }}>
          旅程才刚刚开始
        </h2>
        <p style={{
          color: THEME.textSecondary,
          fontSize: '0.9rem',
          fontWeight: 300,
          lineHeight: 2,
          letterSpacing: '0.06em',
          maxWidth: 520,
          margin: '0 0 44px',
        }}>
          图鉴收录了 30 颗重点系外行星——宜居候选、气态巨行星、已证伪的陷阱。
          进入星表，筛选、搜索、收藏属于你的世界。
        </p>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/catalog')}
          style={{
            padding: '15px 52px',
            borderRadius: 4,
            border: 'none',
            background: THEME.accentRed,
            color: '#ffffff',
            fontSize: '0.92rem',
            fontWeight: 400,
            letterSpacing: '0.24em',
            cursor: 'pointer',
          }}
        >
          进入星表
        </motion.button>
        <div style={{ marginTop: 20, color: THEME.textFaint, fontSize: '0.7rem', letterSpacing: '0.1em' }}>
          数据持续更新 · 收藏目标有新增数据时提醒你
        </div>
      </motion.section>
    </div>
  )
}
