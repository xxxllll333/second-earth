// BgmPlayer：旅程页宇宙氛围背景音乐（COBALT · Kevin MacLeod，CC BY 4.0，署名见 README）
// 自动播放：加载后立即尝试；被浏览器策略拦截时，等待第一次用户交互（滚动/点击等）自动开始
// 指示器：右上角 SOUND 按钮——播放中 3 条跳动波形，点击可暂停/恢复
// 裁剪：跳过约 20 秒前奏，播至曲目结尾后无缝跳回循环
import { useEffect, useRef, useState } from 'react'
import cobalt from '../assets/audio/cobalt.ogg'

const LOOP_START = 20 // 循环起点（钢琴进入点）
const VOLUME = 0.32   // 目标音量

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 14px',
  background: 'rgba(12,13,22,0.62)',
  border: '1px solid rgba(186,198,232,0.24)',
  borderRadius: 3,
  color: 'rgba(216,224,244,0.92)',
  fontSize: '0.6rem',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  fontFamily: "'Jost Variable', 'Jost', 'Segoe UI', sans-serif",
  fontWeight: 450,
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  whiteSpace: 'nowrap',
}

export default function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const playingRef = useRef(false)
  const readyRef = useRef(false)
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

  // 确保音频就绪后从循环起点开始播放
  const ensureAndPlay = () => {
    const audio = audioRef.current
    if (!audio || playingRef.current) return
    const ctx = audioCtxRef.current
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    if (!readyRef.current) {
      const once = () => {
        audio.removeEventListener('loadedmetadata', once)
        readyRef.current = true
        audio.currentTime = LOOP_START
        audio.play().then(onStarted).catch(() => {})
      }
      audio.addEventListener('loadedmetadata', once)
      if (!audio.src) audio.src = cobalt
      return
    }
    audio.currentTime = LOOP_START
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
      // 循环：跳回钢琴段起点无缝续播
      audio.currentTime = LOOP_START
      audio.play().catch(() => {})
    }
    audio.addEventListener('ended', onEnded)

    // 预加载，不等手势
    audio.src = cobalt

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
        style={{ ...btnStyle, position: 'fixed', top: 84, right: 24, zIndex: 60 }}
        onClick={toggle}
        aria-label={playing ? 'pause sound' : 'play sound'}
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
