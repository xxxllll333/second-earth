// BgmPlayer：氛围背景音乐，按页面切曲（星表 / 演化 各有专属曲，旅程与我的星表共用 COBALT）
// 星系页与光谱页无配乐：这两页靠 3D 视差与光谱动画自身的节奏叙事，叠音乐会抢注意力，SOUND 按钮也一并隐藏
// 曲目为 CC BY 4.0 素材，署名见 README
// 自动播放：加载后立即尝试；被浏览器策略拦截时，等待第一次用户交互（滚动/点击等）自动开始
// 指示器：导航栏右侧 SOUND 按钮——播放中 3 条跳动波形，点击可暂停/恢复（手动关声后不再自动起播）
// 切页换曲：淡出 0.45s → 换源 → 淡入 0.9s，避免硬切的突兀感；同曲不重启
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import cobalt from '../assets/audio/cobalt.ogg'
import voyager from '../assets/audio/voyager.ogg'
import sunriseOnMars from '../assets/audio/sunrise-on-mars.ogg'

const VOLUME = 0.32   // 目标音量

interface Track { src: string; loopStart: number; label: string }
// 默认曲：COBALT（跳过约 20 秒前奏，播至曲目结尾后无缝跳回循环）
const T_DEFAULT: Track = { src: cobalt, loopStart: 20, label: 'COBALT' }
// 星表：VOYAGER —— 远航巡天感，曲目最长，耐得住长时间翻阅卡片
const T_CATALOG: Track = { src: voyager, loopStart: 0, label: 'VOYAGER' }
// 演化：SUNRISE ON MARS —— 日出/新生意象，呼应恒星从诞生到死亡的时间轴
const T_EVOLUTION: Track = { src: sunriseOnMars, loopStart: 0, label: 'SUNRISE ON MARS' }

// 返回 null 表示该页无配乐（星系 / 光谱）
const trackFor = (pathname: string): Track | null => {
  if (pathname.startsWith('/catalog')) return T_CATALOG
  if (pathname.startsWith('/evolution')) return T_EVOLUTION
  if (pathname.startsWith('/galaxy')) return null
  if (pathname.startsWith('/spectrum')) return null
  return T_DEFAULT
}

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 14px',
  background: 'rgba(10,11,18,0.82)',
  border: '1px solid rgba(186,198,232,0.24)',
  borderRadius: 3,
  color: 'rgba(216,224,244,0.92)',
  fontSize: '0.6rem',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  fontFamily: "'Jost Variable', 'Jost', 'Segoe UI', sans-serif",
  fontWeight: 450,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export default function BgmPlayer() {
  const { pathname } = useLocation()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const playingRef = useRef(false)
  const readyRef = useRef(false)
  const mutedRef = useRef(false)                   // 用户手动关过 SOUND：不再自动起播
  const trackRef = useRef<Track | null>(T_DEFAULT) // 当前曲目，null = 无配乐页
  const srcRef = useRef('')                        // 已赋给 audio.src 的资源
  const timerRef = useRef(0)                       // 换曲/停播延时器
  const [playing, setPlaying] = useState(false)
  const track = trackFor(pathname)                 // 本页曲目（null 时不渲染 SOUND 按钮）

  // 音量渐变（走 GainNode：元素接 MediaElementSource 后音量由增益控制）
  const rampVolume = (target: number, time: number) => {
    const g = gainRef.current
    const ctx = audioCtxRef.current
    if (!g || !ctx) return
    g.gain.cancelScheduledValues(ctx.currentTime)
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime)
    g.gain.linearRampToValueAtTime(target, ctx.currentTime + time)
  }

  const setPlay = (v: boolean) => {
    playingRef.current = v
    setPlaying(v)
  }

  const onStarted = () => {
    setPlay(true)
    rampVolume(VOLUME, 1.1)
  }

  // 确保音频就绪后从当前曲目的循环起点开始播放；无配乐页或用户已关声则什么都不做
  const ensureAndPlay = () => {
    const audio = audioRef.current
    const t = trackRef.current
    if (!audio || !t || mutedRef.current || playingRef.current) return
    const ctx = audioCtxRef.current
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    if (srcRef.current !== t.src) {
      srcRef.current = t.src
      audio.src = t.src
      readyRef.current = false
    }
    if (!readyRef.current) {
      const once = () => {
        audio.removeEventListener('loadedmetadata', once)
        readyRef.current = true
        audio.currentTime = t.loopStart
        audio.play().then(onStarted).catch(() => {})
      }
      audio.addEventListener('loadedmetadata', once)
      audio.load()
      return
    }
    audio.currentTime = t.loopStart
    audio.play().then(onStarted).catch(() => {})
  }

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor()
    audioCtxRef.current = ctx
    const source = ctx.createMediaElementSource(audio)
    const gain = ctx.createGain()
    gain.gain.value = 0
    source.connect(gain)
    gain.connect(ctx.destination)
    gainRef.current = gain

    const onEnded = () => {
      // 循环：跳回本曲循环起点无缝续播
      const t = trackRef.current
      if (!t) return
      audio.currentTime = t.loopStart
      audio.play().catch(() => {})
    }
    audio.addEventListener('ended', onEnded)

    // 预加载，不等手势（按当前路由选曲；无配乐页不加载）
    trackRef.current = trackFor(pathname)
    if (trackRef.current) {
      srcRef.current = trackRef.current.src
      audio.src = trackRef.current.src
    }

    // 直接尝试播放；被拦截则等首次用户交互
    ensureAndPlay()
    const gestureEvents = ['pointerdown', 'wheel', 'keydown', 'touchstart']
    gestureEvents.forEach((e) => window.addEventListener(e, ensureAndPlay, { passive: true }))

    return () => {
      gestureEvents.forEach((e) => window.removeEventListener(e, ensureAndPlay))
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      audioRef.current = null
      playingRef.current = false
      window.clearTimeout(timerRef.current)
      ctx.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 路由变化 → 换曲（淡出换源淡入）；同曲不重启；进入无配乐页则淡出停住
  useEffect(() => {
    const next = trackFor(pathname)
    if (next === trackRef.current) return // 同一曲目（含两页都无配乐）
    trackRef.current = next
    const audio = audioRef.current
    if (!audio) return
    window.clearTimeout(timerRef.current)

    // 正在出声先淡出再执行；本就静默则立即执行
    const afterFadeOut = (fn: () => void) => {
      if (!playingRef.current) {
        fn()
        return
      }
      setPlay(false)
      rampVolume(0, 0.45)
      timerRef.current = window.setTimeout(fn, 480)
    }

    // 星系 / 光谱：无配乐，淡出后停住（源保留，回到有曲页可立即续）
    if (!next) {
      afterFadeOut(() => audioRef.current?.pause())
      return
    }

    afterFadeOut(() => {
      const a = audioRef.current
      if (!a || trackRef.current !== next) return
      const swapped = srcRef.current !== next.src
      if (swapped) {
        srcRef.current = next.src
        readyRef.current = false
        a.src = next.src
      }
      // 用户关着声：只换源不起播，等他按 SOUND
      if (mutedRef.current) return
      const go = () => {
        if (trackRef.current !== next || mutedRef.current) return
        a.currentTime = next.loopStart
        a.play()
          .then(() => {
            setPlay(true)
            rampVolume(VOLUME, 0.9)
          })
          .catch(() => {})
      }
      if (!swapped && a.readyState >= 1) go()
      else {
        a.addEventListener('loadedmetadata', go, { once: true })
        a.load()
      }
    })
    return () => window.clearTimeout(timerRef.current)
  }, [pathname])

  // 点击：暂停（快速淡出）或恢复
  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playingRef.current) {
      mutedRef.current = true // 手动关声：后续手势/切页都不再自作主张起播
      setPlay(false)
      rampVolume(0, 0.25)
      timerRef.current = window.setTimeout(() => {
        const a = audioRef.current
        if (a && !playingRef.current) a.pause()
      }, 280)
    } else {
      mutedRef.current = false
      ensureAndPlay()
    }
  }

  // 无配乐页不渲染 SOUND 按钮（没有可控的声音，摆个死按钮反而让人误以为坏了）
  if (!track) return null

  return (
    <>
      <style>{`
        .bgm-btn { transition: border-color 0.35s ease, color 0.35s ease, background 0.35s ease; }
        .bgm-btn:hover { border-color: rgba(206,220,255,0.55); color: #ffffff; background: rgba(12,13,22,0.82); }
        @keyframes bgmWave {
          0%, 100% { transform: scaleY(0.25); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      <button
        className="bgm-btn"
        style={{ ...btnStyle, position: 'fixed', top: 11, right: 24, zIndex: 101 }}
        onClick={toggle}
        aria-label={playing ? 'pause sound' : 'play sound'}
        title={`BGM · ${track.label}`}
      >
        <span style={{ fontSize: '0.78em', lineHeight: 1 }}>{playing ? '❚❚' : '▶'}</span>
        SOUND
        {playing && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2.5,
              height: 10,
              marginLeft: 2,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: 1.5,
                  height: '100%',
                  background: 'rgba(206,220,255,0.9)',
                  transformOrigin: 'center',
                  animation: `bgmWave 1.1s ease-in-out ${i * 0.18}s infinite`,
                }}
              />
            ))}
          </span>
        )}
      </button>
    </>
  )
}
