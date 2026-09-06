// ═══════════════════════════════════════════════════════════════
// K2-18b · 争议行星 3D 窗口（层级三 · 近景）
//
// 交互形态（对齐演化页手感）：
//   · OrbitControls 拖转 / 滚轮缩放，星点 + 星云宇宙背景
//   · 拖动"置信度门槛"滑块 → 星球【形态】连续渐变（不止换色）：
//     海平面线退去（海洋→干陆）、噪声扭成湍流涡旋、云层加厚至全覆、
//     （富氢海洋 → 非生物霾 → 保守苍白）；且星球随拖动自转加速，
//     形成"逐渐旋转切换形态"的手感；松手后回落为缓慢自转。
//
// 诚实前提：这不是照片。K2-18b 在望远镜里始终只是一个像素；
// 你看到的模样是同一批光谱容许的大气假设随门槛的连续演绎。
//
// 复用：ProceduralPlanet（球+云+瑞利大气）· nebulaTexture / mulberry32（宇宙背景）
//       · glowTexture / spikeTexture（宿主星辉光与衍射芒）
//       · StarEvolution3D 的"拖动→自转加速"模式。无新增 raymarch。
// 宿主星：K2-18 为 M2.5V 红矮星（Teff ≈ 3450 K）——入画并提供光照方向，
//       行星受光半球朝向它，构成物理自洽的相位画面。
// 宜居带：以宿主星为圆心的真实环带切片（弥散加色弧带，无硬边），
//       弧段恰过行星位置——边界用全站同一公式 habitableZone(L)=[0.9√L, 1.7√L]。
// ═══════════════════════════════════════════════════════════════

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { BackendFitModel } from '../../lib/api'
import {
  ProceduralPlanet, seedOf, nebulaTexture, mulberry32, glowTexture, spikeTexture, type ProceduralStyle,
} from '../proceduralPlanet'
import { MODEL_COLOR } from '../../data/k218bReal'
import { starParams, habitableZone, orbitAU, keyPlanets } from '../../data/planets'
import { THEME } from '../../config/visuals'
import { useIsMobile } from '../../lib/useIsMobile'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// 显示校准：自定义 ShaderMaterial 不走渲染器输出 sRGB 编码，而 THREE.Color(hex)
// 输入时已做 sRGB→linear——地表色会被"双重压暗"（黑大理石观感的病根）。
// 把调色板目标值反编码进 hex，shader 吐出的才正好是配的颜色。
const l2s = (x: number) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)
function disp(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(255 * Math.min(1, Math.max(0, l2s(v)))).toString(16).padStart(2, '0')
  return `#${ch(((n >> 16) & 255) / 255)}${ch(((n >> 8) & 255) / 255)}${ch((n & 255) / 255)}`
}

// ── 宿主星 K2-18（M2.5V 红矮星）──
// 位置取画面左上远景：深度足够进画框，又偏离行星主轴不夺主体。
const STAR_POS = new THREE.Vector3(-7.1, 3.8, -13.2)
// 共享模块约定 uSunDir = 行星位置 − sunPos（照亮背向 sunPos 的半球）；
// 要让受光面朝向画面里的宿主星，需传其关于行星的镜像点。
const STAR_LIGHT_ARG = STAR_POS.clone().negate()

// ── 宜居带环带几何：恒星→行星方向为环局部 +X（行星在 θ=0），环面绕该轴倾 35° ──
const SP_K218 = starParams['K2-18'] ?? { luminosity: 0.0234, mass: 0.495, temp: 3450, spectral: 'M2.5V' }
const HZ_AU = habitableZone(SP_K218.luminosity)
const A_AU = orbitAU(keyPlanets.find(p => p.name === 'K2-18b')?.period ?? 32.94, SP_K218.mass)
const HZ_SCALE = STAR_POS.length() / A_AU // 行星轨道半径映射到 |STAR_POS|
const HZ_IN = HZ_AU.inner * HZ_SCALE
const HZ_OUT = HZ_AU.outer * HZ_SCALE
const HZ_QUAT = (() => {
  const X = STAR_POS.clone().negate().normalize()
  const n0 = new THREE.Vector3().crossVectors(X, new THREE.Vector3(0, 1, 0)).normalize()
  const m0 = new THREE.Vector3().crossVectors(X, n0)
  const phi = THREE.MathUtils.degToRad(35)
  const Z = n0.multiplyScalar(Math.cos(phi)).add(m0.multiplyScalar(Math.sin(phi))).normalize()
  const Y = new THREE.Vector3().crossVectors(Z, X)
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z))
})()

// ── 三种读法的世界外观（统一 terran 模式，便于逐通道连续插值）──
// 形态旋钮（不止换色）：sea=海平面线（海陆占比）· warp=湍流涡旋扭曲 ·
// freq/cloudFreq=图案尺度 · clouds=云覆盖率（阈值语义：越小云越多）。
// A 生物标志：富氢海洋世界 · B 非生物：厚有机霾 · C 保守基线：苍白全覆球
const WORLD_A: ProceduralStyle = {
  mode: 'terran',
  colors: ['#04264c', '#0c4a8a', '#1e6ab0', '#2f7fae', '#6fa3c8', '#e6f0fa'].map(disp),
  freq: 2.3, bands: 0, seed: seedOf('K2-18b'),
  sea: 0.56, warp: 0.12, cloudFreq: 2.2,
  ambient: 0.42, cloudAlpha: 0.8,
  clouds: 0.42, atmos: { rayleigh: '#4f9dff', intensity: 12 }, rim: '#6ea8ff',
}
const WORLD_B: ProceduralStyle = {
  mode: 'terran',
  colors: ['#3a2c16', '#5c4826', '#7d6236', '#98794a', '#b39462', '#dcc496'].map(disp),
  freq: 3.1, bands: 0, seed: seedOf('K2-18b'),
  sea: 0.16, warp: 0.3, cloudFreq: 3.0,
  ambient: 0.4, cloudAlpha: 0.55,
  clouds: 0.38, atmos: { rayleigh: '#c9873a', intensity: 16 }, rim: '#c89050',
}
const WORLD_C: ProceduralStyle = {
  mode: 'terran',
  colors: ['#3d4a60', '#54637c', '#6d7d94', '#8797ac', '#a3b1c2', '#c9d3de'].map(disp),
  freq: 2.6, bands: 0, seed: seedOf('K2-18b'),
  sea: 0.44, warp: 0.08, cloudFreq: 1.2,
  ambient: 0.45, cloudAlpha: 0.28,
  clouds: -0.45, atmos: { rayleigh: '#9fb0c8', intensity: 4 }, rim: '#8898b8',
}

const WORLD_LABEL: Record<string, string> = {
  biosignature: '富氢海洋世界 · 潜在生命',
  abiotic: '非生物光化学世界',
  flat: '保守薄雾基线世界',
}

function lerpColor(a: string, b: string, t: number): string {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()
}
// 两个世界外观的连续插值（terran 同构，颜色/云量/大气逐通道 lerp）
function blendStyle(A: ProceduralStyle, B: ProceduralStyle, t: number): ProceduralStyle {
  const k = clamp(t, 0, 1)
  return {
    mode: 'terran',
    colors: A.colors.map((c, i) => lerpColor(c, B.colors[i] ?? c, k)),
    freq: A.freq + (B.freq - A.freq) * k,
    bands: 0,
    seed: A.seed,
    clouds: (A.clouds ?? 0) + ((B.clouds ?? 0) - (A.clouds ?? 0)) * k,
    sea: (A.sea ?? 0.44) + ((B.sea ?? 0.44) - (A.sea ?? 0.44)) * k,
    warp: (A.warp ?? 0) + ((B.warp ?? 0) - (A.warp ?? 0)) * k,
    cloudFreq: (A.cloudFreq ?? 2.6) + ((B.cloudFreq ?? 2.6) - (A.cloudFreq ?? 2.6)) * k,
    ambient: (A.ambient ?? 0.15) + ((B.ambient ?? 0.15) - (A.ambient ?? 0.15)) * k,
    cloudAlpha: (A.cloudAlpha ?? 0.88) + ((B.cloudAlpha ?? 0.88) - (A.cloudAlpha ?? 0.88)) * k,
    atmos: {
      rayleigh: lerpColor(A.atmos?.rayleigh ?? '#88aaff', B.atmos?.rayleigh ?? '#88aaff', k),
      intensity: (A.atmos?.intensity ?? 16) + ((B.atmos?.intensity ?? 16) - (A.atmos?.intensity ?? 16)) * k,
    },
    rim: lerpColor(A.rim, B.rim, k),
  }
}

// ── 深空星点（确定性播种）──
function Stars() {
  const positions = useMemo(() => {
    const n = 900
    const arr = new Float32Array(n * 3)
    const rand = mulberry32(42)
    for (let i = 0; i < n; i++) {
      const r = 40 + rand() * 60
      const th = rand() * Math.PI * 2
      const ph = Math.acos(2 * rand() - 1)
      arr[i * 3] = r * Math.sin(ph) * Math.cos(th)
      arr[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
      arr[i * 3 + 2] = r * Math.cos(ph)
    }
    return arr
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.12} sizeAttenuation color="#a8bcd8" transparent opacity={0.8} depthWrite={false} />
    </points>
  )
}

// ── 远景星云（加色柔光，营造宇宙氛围）──
function Nebula() {
  const tex = useMemo(() => nebulaTexture(7), [])
  return (
    <group>
      <sprite position={[-16, 8, -60]} scale={[64, 64, 1]}>
        <spriteMaterial map={tex} blending={THREE.AdditiveBlending} transparent opacity={0.42} depthWrite={false} />
      </sprite>
      <sprite position={[18, -10, -66]} scale={[52, 52, 1]}>
        <spriteMaterial map={tex} blending={THREE.AdditiveBlending} transparent opacity={0.3} depthWrite={false} />
      </sprite>
    </group>
  )
}

// ── 宜居带弥散弧带：真实环带过行星位置的弧段；有机光团 + 软边 + 纯加色 ──
const HZ_VERT = /* glsl */`
varying float vR;
varying float vT;
void main() {
  vR = length(position.xy);
  vT = atan(position.y, position.x);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const HZ_FRAG = /* glsl */`
uniform float uTime;
uniform float uInner;
uniform float uOuter;
varying float vR;
varying float vT;
void main() {
  float w = uOuter - uInner;
  // 软边窗口：内外边界均羽化，无硬边
  float edge = smoothstep(uInner, uInner + w * 0.22, vR) * (1.0 - smoothstep(uOuter - w * 0.22, uOuter, vR));
  // 有机光团：低频 sin 叠乘，随时间缓慢流动
  float clump = 0.62 + 0.38 * sin(vT * 6.0 + uTime * 0.10) * sin(vT * 11.0 - uTime * 0.07 + vR * 0.6);
  float t = clamp((vR - uInner) / w, 0.0, 1.0);
  vec3 col = mix(vec3(0.42, 0.94, 0.66), vec3(0.29, 0.56, 0.82), smoothstep(0.15, 0.95, t));
  float a = edge * clump * 0.34;
  gl_FragColor = vec4(col * a, a);
}
`
function HabitableArc() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uInner: { value: HZ_IN },
    uOuter: { value: HZ_OUT },
  }), [])
  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })
  // 带内漂浮微光（环局部坐标，θ 限在弧段内）
  const motes = useMemo(() => {
    const n = 26
    const arr = new Float32Array(n * 3)
    const rand = mulberry32(7)
    for (let i = 0; i < n; i++) {
      const th = -0.7 + rand() * 1.4
      const r = HZ_IN + (0.15 + rand() * 0.7) * (HZ_OUT - HZ_IN)
      arr[i * 3] = r * Math.cos(th)
      arr[i * 3 + 1] = r * Math.sin(th)
      arr[i * 3 + 2] = 0
    }
    return arr
  }, [])
  const motesRef = useRef<THREE.Points>(null)
  useFrame((_, dt) => {
    if (motesRef.current) motesRef.current.rotation.z += dt * 0.01
  })
  return (
    <group position={STAR_POS} quaternion={HZ_QUAT}>
      <mesh>
        <ringGeometry args={[HZ_IN, HZ_OUT, 96, 1, -0.75, 1.5]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={HZ_VERT}
          fragmentShader={HZ_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <points ref={motesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[motes, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.09} color="#bff5d8" transparent opacity={0.65} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
    </group>
  )
}

// ── 宿主星 K2-18：红矮星橙红辉光（核 + 双层加色晕 + 衍射芒）──
function HostStar() {
  const glow = useMemo(() => glowTexture(), [])
  const spike = useMemo(() => spikeTexture(), [])
  return (
    <group position={STAR_POS}>
      <mesh>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshBasicMaterial color="#ffc9a3" />
      </mesh>
      <sprite scale={[2.8, 2.8, 1]}>
        <spriteMaterial map={glow} color="#ff8a54" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite scale={[6.5, 6.5, 1]}>
        <spriteMaterial map={glow} color="#ff5a30" transparent opacity={0.38} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite scale={[9, 9, 1]} rotation={0.4}>
        <spriteMaterial map={spike} color="#ff9a6a" transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  )
}

// ── 渐变行星：表面随 style 连续变形；拖动滑块时自转加速（松手回落）──
function MorphPlanet({ style, radius, threshold, sunPos }: {
  style: ProceduralStyle; radius: number; threshold: number; sunPos: THREE.Vector3
}) {
  const g = useRef<THREE.Group>(null)
  const spin = useRef(0.06)
  const lastT = useRef(threshold)
  useFrame((_, dt) => {
    const d = Math.abs(threshold - lastT.current)
    lastT.current = threshold
    // 拖动量 → 目标转速；无拖动时回落到缓慢自转
    const target = 0.06 + clamp(d * 14, 0, 2.4)
    spin.current += (target - spin.current) * Math.min(1, dt * 4)
    if (g.current) g.current.rotation.y += dt * spin.current
  })
  return (
    <group ref={g}>
      <ProceduralPlanet style={style} radius={radius} rotationSpeed={0} atmosIntensityScale={0.8} sunPos={sunPos} />
    </group>
  )
}

export default function K218bPlanet3D({ models, threshold, width }: {
  models: BackendFitModel[]
  threshold: number
  width: number | string
}) {
  const isMobile = useIsMobile()
  const H = isMobile ? 250 : 380
  const coreR = isMobile ? 0.95 : 1.2

  // 门槛 → 连续形变参数：0→A(海洋) 0.5→B(霾) 1→C(苍白)
  const style = useMemo(() => {
    if (threshold <= 0.5) return blendStyle(WORLD_A, WORLD_B, threshold / 0.5)
    return blendStyle(WORLD_B, WORLD_C, (threshold - 0.5) / 0.5)
  }, [threshold])

  // 存活读法（用于"并存/坍缩"提示与主导读法标签）
  const survivors = useMemo(
    () => models.filter(m => m.confidence_level >= threshold),
    [models, threshold],
  )
  const unsettled = survivors.length >= 2
  const reading = threshold < 0.34 ? 'biosignature' : threshold < 0.67 ? 'abiotic' : 'flat'

  return (
    <div style={{ width, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        position: 'relative', width: '100%', height: H,
        border: `1px solid ${THEME.panelBorder}`, borderRadius: THEME.cardRadius,
        overflow: 'hidden', background: THEME.bg,
      }}>
        <Canvas
          camera={{ position: [0, 0, 4.8], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <color attach="background" args={[THEME.bg]} />
          <Stars />
          <Nebula />
          <HostStar />
          <HabitableArc />
          <MorphPlanet style={style} radius={coreR} threshold={threshold} sunPos={STAR_LIGHT_ARG} />
          <OrbitControls
            enablePan={false}
            enableZoom={!isMobile}
            enableDamping
            dampingFactor={0.08}
            minDistance={2.6}
            maxDistance={10}
            rotateSpeed={0.6}
          />
        </Canvas>

        {/* 当前主导读法（与曲线/卡片同色）+ 操作提示 */}
        <div style={{
          position: 'absolute', top: 10, left: 12, right: 12, pointerEvents: 'none',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8,
        }}>
          <span style={{ fontSize: '0.7rem', color: THEME.textSecondary, letterSpacing: '0.03em' }}>
            此刻凝成的世界：
            <span style={{ color: MODEL_COLOR[reading], fontWeight: 500 }}>{WORLD_LABEL[reading]}</span>
            {unsettled && <span style={{ color: THEME.textFaint }}> · 多读法并存</span>}
          </span>
          <span style={{ fontSize: '0.6rem', color: THEME.textFaint, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            拖转 · 滚轮缩放
          </span>
        </div>

        {/* 宿主星注脚：红矮星身份是本页科学叙事的一部分 */}
        <div style={{
          position: 'absolute', left: 12, bottom: 10, pointerEvents: 'none',
          fontSize: '0.6rem', color: THEME.textFaint, letterSpacing: '0.05em',
        }}>
          宿主星 K2-18 · M2.5V 红矮星 · Teff ≈ 3450 K
        </div>
        <div style={{
          position: 'absolute', left: 12, bottom: 26, pointerEvents: 'none',
          fontSize: '0.6rem', letterSpacing: '0.05em', color: THEME.textFaint,
        }}>
          <span style={{ color: '#6ee1a0' }}>●</span> 宜居带 {HZ_AU.inner.toFixed(2)}–{HZ_AU.outer.toFixed(2)} AU · 本行星 {A_AU.toFixed(3)} AU · 带内
        </div>

        {survivors.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: '0.76rem', color: THEME.accentRed, letterSpacing: '0.04em',
              background: 'rgba(6,7,11,0.62)', padding: '6px 14px', borderRadius: 3,
              border: '1px solid rgba(252,61,33,0.3)',
            }}>
              门槛过高：没有任何模型能跨过它
            </span>
          </div>
        )}
      </div>

      {/* 诚实护栏 */}
      <div style={{
        fontSize: '0.66rem', color: THEME.textFaint, lineHeight: 1.65, textAlign: 'center',
        maxWidth: '100%', marginTop: 8, fontWeight: 300,
      }}>
        这不是照片。K2-18b 在望远镜里始终只是一个像素；
        <span style={{ color: THEME.textSecondary }}>滑块决定你接受哪几种大气，数据本身从未替你做这个选择。</span>
      </div>
    </div>
  )
}
