// BgmPlayer：全局常驻氛围背景音乐，按页面切曲（星表 / 演化 各有专属曲，其余页面共用 COBALT）
// 曲目为 CC BY 4.0 素材，署名见 README
// 自动播放：加载后立即尝试；被浏览器策略拦截时，等待第一次用户交互（滚动/点击等）自动开始
// 指示器：导航栏右侧 SOUND 按钮——播放中 3 条跳动波形，点击可暂停/恢复
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

const trackFor = (pathname: string): Track => {
  if (pathname.startsWith('/catalog')) return T_CATALOG
  if (pathname.startsWith('/evolution')) return T_EVOLUTION
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
  const trackRef = useRef<Track>(T_DEFAULT) // 当前曲目
  const srcRef = useRef('')                 // 已赋给 audio.src 的资源
  const [playing, setPlaying] = useState(false)

  // 音量渐变（走 GainNode：元素接 MediaElementSource 后音量由增益控制）
  const rampVolume = (target: number, time: number) => {
    const g = gainRef.current
    const ctx = audioCtxRef.current
    if (!g || !ctx) return
    g.gain.cancelScheduledValues(ctx.currentTime)
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime)
    g.gain.linearRampToValueAtTime(target, ctx.currentTime + time)
  }

  const onStarted = () => {
    playingRef.current = true
    setPlaying(true)
    rampVolume(VOLUME, 1.1)
  }

  // 确保音频就绪后从当前曲目的循环起点开始播放
  const ensureAndPlay = () => {
    const audio = audioRef.current
    if (!audio || playingRef.current) return
    const ctx = audioCtxRef.current
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    const t = trackRef.current
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
      audio.currentTime = trackRef.current.loopStart
      audio.play().catch(() => {})
    }
    audio.addEventListener('ended', onEnded)

    // 预加载，不等手势（按当前路由选曲）
    trackRef.current = trackFor(pathname)
    srcRef.current = trackRef.current.src
    audio.src = trackRef.current.src

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
      ctx.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 路由变化 → 换曲（淡出换源淡入）；同曲不重启，避免切页打断音乐
  useEffect(() => {
    const next = trackFor(pathname)
    if (next.src === trackRef.current.src) return
    trackRef.current = next
    srcRef.current = next.src
    readyRef.current = false
    const audio = audioRef.current
    if (!audio) return
    // 已静音：只换源不起播，等用户按 SOUND 时再走 ensureAndPlay
    if (!playingRef.current) {
      audio.pause()
      audio.src = next.src
      return
    }
    rampVolume(0, 0.45)
    const timer = window.setTimeout(() => {
      const a = audioRef.current
      if (!a || trackRef.current.src !== next.src) return
      a.pause()
      a.src = next.src
      a.currentTime = next.loopStart
      const go = () => {
        if (!playingRef.current || trackRef.current.src !== next.src) return
        a.play().then(() => rampVolume(VOLUME, 0.9)).catch(() => {})
      }
      if (a.readyState >= 1) go()
      else a.addEventListener('loadedmetadata', go, { once: true })
      a.load()
    }, 470)
    return () => window.clearTimeout(timer)
  }, [pathname])

  // 点击：暂停（快速淡出）或恢复
  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playingRef.current) {
      playingRef.current = false
      setPlaying(false)
      rampVolume(0, 0.25)
      setTimeout(() => {
        const a = audioRef.current
        if (a && !playingRef.current) a.pause()
      }, 280)
    } else {
      ensureAndPlay()
    }
  }

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
        title={`BGM · ${trackRef.current.label}`}
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
