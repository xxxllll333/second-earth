// EarthReference3D —— 地球参照系 · 3D 真实比例球体对比（星系页右栏顶部）
// 正交投影消除透视误差：球半径 = 相对地球的半径倍数，尺寸本身即数据
// 地球固定为白色基准球（"尺子"），切星时行星球半径弹簧过渡、地球不动——万物在变，尺子不变
// 基线每 1 R⊕ 一刻度；数字顶置标签继承条形图"数值在柱顶"的语言
// 真实比例默认（诚实呈现跨量级震撼），对数档照顾小行星可读性
// 防抖架构：全场景由两个阻尼标量 sim.e / sim.p 逐帧派生——球体、基线、刻度、标签、相机 zoom
// 全部读"当前半径"而非目标半径，切星/切档时没有任何元素瞬移（旧版构图瞬跳导致初期抖动）
import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { THEME } from '../config/visuals'
import type { PlanetData } from '../data/planets'

const GAP = 0.9 // 两球表面间距（世界单位）
// 对数档：把 0.05~20 R⊕ 压到约 0.3~1.0，TRAPPIST-1d 这类小行星仍可读
const logR = (r: number) => Math.log10(Math.max(r, 0.05) * 10) / Math.log10(200)
// 刻度池范围：真实档最大行星 Kepler-7b 16.6 R⊕ → 右界约 34；左界地球侧约 -3
const TICK_MIN = -3
const TICK_MAX = 34

// ── 磨砂发光玻璃球 shader：Fresnel 边缘发光 + 中心半透明磨砂絮状填充（additive 混合）──
const HOLO_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vNo;
void main() {
  vNo = normalize(normal);
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`
const HOLO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
uniform float uFill;
uniform float uSpin;
varying vec3 vN;
varying vec3 vV;
varying vec3 vNo;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
  // 磨砂云斑：定义在物体空间（固着球面），随模型自转整体扫过 = 可见旋转
  // （旧版用视空间法线：正交投影下屏幕每像素的视空间法线恒定，图案钉死在屏幕上不转）
  float n = sin(vNo.x * 3.5 + uSpin) * sin(vNo.y * 3.0 - uSpin * 0.6) * sin(vNo.z * 4.0 + uSpin * 0.3);
  float fill = uFill * max(n, 0.0);
  float a = clamp(f * 0.6 + fill, 0.0, 1.0);
  gl_FragColor = vec4(uColor, a);
}
`
// hex → sRGB 0-1 Vector3（不经 THREE.Color 的 linear 转换，避免 shader 双重压暗）
const hexRgb = (hex: string): THREE.Vector3 => {
  const n = parseInt(hex.slice(1), 16)
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

// 单一帧内仿真：阻尼收敛当前半径 → 派生全部布局与相机（无瞬移）
function Scene({ rE, rP, planetRadius, color, showTicks }: { rE: number; rP: number; planetRadius: number; color: string; showTicks: boolean }) {
  const earthRef = useRef<THREE.Group>(null)
  const planetRef = useRef<THREE.Group>(null)
  const labelERef = useRef<THREE.Group>(null)
  const labelPRef = useRef<THREE.Group>(null)
  const baseRef = useRef<THREE.Mesh>(null)
  const tickRefs = useRef<(THREE.Mesh | null)[]>([])
  // 初值即目标：首帧静止，切星/切档才开始弹簧过渡
  const sim = useRef({ e: rE, p: rP })
  // 磨砂絮状相位（恒定 0：絮状固着球面，只随模型自转移动 = 可见旋转）
  const spin = useRef({ value: 0 })
  const uniE = useMemo(() => ({ uColor: { value: new THREE.Vector3(1, 1, 1) }, uPower: { value: 2.2 }, uFill: { value: 0.25 }, uSpin: spin.current }), [])
  const uniP = useMemo(() => ({ uColor: { value: hexRgb(color) }, uPower: { value: 2.2 }, uFill: { value: 0.25 }, uSpin: spin.current }), [color])

  useFrame((state, dt) => {
    const s = sim.current
    s.e = THREE.MathUtils.damp(s.e, rE, 5, dt)
    s.p = THREE.MathUtils.damp(s.p, rP, 5, dt)
    // 布局全部由当前半径派生（与旧版目标值公式一致，只是输入换成阻尼值）
    const xE = -(GAP / 2 + s.e)
    const xP = GAP / 2 + s.p
    const left = xE - s.e
    const right = xP + s.p
    const cx = (left + right) / 2
    const top = Math.max(2 * s.e, 2 * s.p) + 0.75 // 顶置标签留白
    const bottom = -0.32
    const cy = (top + bottom) / 2
    const worldW = right - left + 0.8
    const worldH = top - bottom

    if (earthRef.current) {
      earthRef.current.scale.setScalar(s.e)
      earthRef.current.position.set(xE, s.e, 0)
      earthRef.current.rotation.y += dt * 0.45
    }
    if (planetRef.current) {
      planetRef.current.scale.setScalar(s.p)
      planetRef.current.position.set(xP, s.p, 0)
      planetRef.current.rotation.y += dt * 0.45
    }
    if (labelERef.current) {
      labelERef.current.position.set(xE, 2 * s.e + 0.34, 0)
      labelERef.current.updateMatrixWorld() // 立即更新，drei Html 同帧读到当帧矩阵，消除标签一帧滞后
    }
    if (labelPRef.current) {
      labelPRef.current.position.set(xP, 2 * s.p + 0.34, 0)
      labelPRef.current.updateMatrixWorld()
    }
    if (baseRef.current) {
      baseRef.current.scale.x = worldW
      baseRef.current.position.set(cx, -0.015, 0)
    }
    // 刻度池：按距基线两端距离淡入淡出（切换时跨过阈值渐变而非硬 pop = 抖动感来源之一）
    for (let i = 0; i <= TICK_MAX - TICK_MIN; i++) {
      const v = TICK_MIN + i
      const m = tickRefs.current[i]
      if (!m) continue
      const t = showTicks ? THREE.MathUtils.clamp(Math.min(v - (left + 0.4), right - 0.4 - v) / 0.5, 0, 1) : 0
      m.visible = t > 0.01
      ;(m.material as THREE.MeshBasicMaterial).opacity = t
    }
    // 正交 zoom 自适应：宽高两方向取小者，保证双球 + 基线完整入画
    const cam = state.camera as THREE.OrthographicCamera
    const { width, height } = state.size
    cam.zoom = Math.min(width / worldW, height / worldH)
    cam.updateProjectionMatrix()
    cam.position.set(cx, cy, 10)
  })

  return (
    <group>
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 5]} intensity={0.9} />
      {/* 基线（单位盒逐帧拉伸）+ R⊕ 刻度池 */}
      <mesh ref={baseRef}>
        <boxGeometry args={[1, 0.02, 0.02]} />
        <meshBasicMaterial color="#39415a" />
      </mesh>
      {Array.from({ length: TICK_MAX - TICK_MIN + 1 }, (_, i) => {
        const v = TICK_MIN + i
        return (
          <mesh key={v} ref={(el) => { tickRefs.current[i] = el }} position={[v, 0.07, 0]} visible={false}>
            <boxGeometry args={[0.02, 0.14, 0.02]} />
            <meshBasicMaterial color="#59627a" transparent />
          </mesh>
        )
      })}
      <group ref={earthRef}>
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={uniE} vertexShader={HOLO_VERT} fragmentShader={HOLO_FRAG} />
        </mesh>
      </group>
      {/* 系外行星：与地球同质感的磨砂发光玻璃球，仅色不同 */}
      <group ref={planetRef}>
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={uniP} vertexShader={HOLO_VERT} fragmentShader={HOLO_FRAG} />
        </mesh>
      </group>
      {/* 顶置倍数标签：挂在逐帧移动的 group 上，跟随球顶不瞬移 */}
      <group ref={labelERef}>
        <Html center style={{ pointerEvents: 'none' }}>
          <div key={`e-${rE}`} className="mono metric-value-swap" style={{ fontSize: '0.62rem', color: THEME.textSecondary, whiteSpace: 'nowrap' }}>
            1 R⊕
          </div>
        </Html>
      </group>
      <group ref={labelPRef}>
        <Html center style={{ pointerEvents: 'none' }}>
          <div key={`${planetRadius}-${showTicks}`} className="mono metric-value-swap" style={{ fontSize: '0.62rem', color, whiteSpace: 'nowrap', textShadow: `0 0 8px ${color}66` }}>
            {planetRadius} R⊕
          </div>
        </Html>
      </group>
    </group>
  )
}

export default function EarthReference3D({ planet }: { planet: PlanetData }) {
  const [mode, setMode] = useState<'true' | 'log'>('true')
  const rE = mode === 'true' ? 1 : logR(1)
  const rP = mode === 'true' ? planet.radius : logR(planet.radius)
  // 注脚用目标值（文本无需跟帧）：真实比例刻度每 1 R⊕ 一刻；对数档刻度无物理意义，隐藏
  const xE = -(GAP / 2 + rE)
  const xP = GAP / 2 + rP
  const worldW = xP + rP - (xE - rE) + 0.8
  const worldH = Math.max(2 * rE, 2 * rP) + 0.75 + 0.32
  const earthPct = Math.round((2 * rE / worldH) * 100)

  return (
    <div style={{ borderBottom: `1px solid ${THEME.panelBorder}`, padding: '10px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: THEME.displayFont, fontSize: '0.62rem', letterSpacing: '0.2em', color: THEME.accentCyan, textShadow: THEME.labelGlow, whiteSpace: 'nowrap' }}>
            EARTH REFERENCE
          </span>
          <span style={{ fontSize: '0.66rem', letterSpacing: '0.1em', color: THEME.textFaint, whiteSpace: 'nowrap' }}>地球参照系</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['true', 'log'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="cta-textlink"
              style={{
                padding: '2px 1px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '0.6rem', letterSpacing: '0.08em', whiteSpace: 'nowrap',
                color: mode === m ? THEME.accentCyan : THEME.textFaint,
                borderBottom: `1px solid ${mode === m ? THEME.accentCyan : 'transparent'}`,
              }}
            >
              {m === 'true' ? '真实比例' : '对数'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', height: 196, marginTop: 6 }}>
        <Canvas orthographic dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 10], zoom: 30 }}>
          <Scene rE={rE} rP={rP} planetRadius={planet.radius} color={planet.color} showTicks={mode === 'true'} />
        </Canvas>
      </div>

      <div className="mono" style={{ fontSize: '0.56rem', color: THEME.textFaint, letterSpacing: '0.06em', marginTop: 4 }}>
        白 = 地球基准（不动） · 彩球 = 本行星（同下方指标条色） · 刻度 = 1 R⊕
        {mode === 'true' && earthPct <= 12 ? ` · 真实比例下地球 ≈ 画面高 ${earthPct}%` : ''}
      </div>
    </div>
  )
}
