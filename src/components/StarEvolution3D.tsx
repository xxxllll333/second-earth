// StarEvolution3D —— 演化页 3D 场景（时间卷轴 · 立体版）
// 中心：程序化恒星（fbm 对流米粒组织 + 临边昏暗 + 按温度变色），随进度连续变形、随拖动加速自转。
// 环绕：宜居带环（对数压缩到真实 AU）+ 1 AU「测试行星」（地球轨道），宜居状态随恒星演化改变。
// 与全站共用视觉语言：proceduralPlanet 的 GLSL 噪声 / 光晕纹理 + Bloom/ACES 后处理链。

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { NOISE_GLSL, glowTexture, spikeTexture } from './proceduralPlanet'
import { type EvolutionState, sceneR, RSUN_IN_AU } from '../data/evolution'

// ── 恒星表面 shader：自发光。三层对流（米粒组织 + 大尺度湍流 + 亮光斑）+ 黑子 + 临边昏暗 + 色球边缘增亮 ──
const STAR_VERT = /* glsl */ `
varying vec3 vDir;
varying vec3 vNormalW;
varying vec3 vViewW;
void main() {
  vDir = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewW = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const STAR_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uTime;
uniform float uTurb;
uniform float uFreq;
uniform vec3 uSeed;
uniform float uIntensity;
varying vec3 vDir;
varying vec3 vNormalW;
varying vec3 vViewW;
${NOISE_GLSL}

void main() {
  vec3 dir = normalize(vDir);
  float t = uTime * 0.05;
  vec3 p = dir * uFreq + uSeed;

  // 大尺度对流（supergranulation）：缓慢翻涌的明暗区，给表面“结构”
  float macro = fbm(p * 0.45 + vec3(t * 0.5, -t * 0.3, t * 0.2));
  macro = clamp(macro * 0.5 + 0.5, 0.0, 1.0);

  // 米粒组织：双层域扭曲 fbm（翻涌的对流胞）
  float n = fbm(p + vec3(t, t * 0.7, -t * 0.5));
  n = fbm(p + n * (0.7 + uTurb * 1.3) + vec3(-t * 0.4, t * 0.25, t * 0.6));
  float gran = clamp(n * 0.5 + 0.5, 0.0, 1.0);
  // 细米粒：高频 snoise 叠加，让表面更粗糙（廉价：单次 snoise）
  float fine = snoise(p * 3.1 + vec3(-t * 0.9, t * 0.7, t * 1.1));
  gran = clamp(gran * 0.8 + (fine * 0.5 + 0.5) * 0.3, 0.0, 1.0);
  // 增强明暗对比：米粒更分明
  gran = smoothstep(0.12, 0.94, gran);

  // 综合亮度：米粒为主，叠加大尺度结构
  float lum = clamp(gran * 0.7 + macro * 0.35, 0.0, 1.0);

  // 黑子：大黑子（低频 fbm）+ 小黑子群（单次 snoise），随湍流增多、变大变暗
  float spotBig = fbm(p * 0.26 + vec3(-t * 0.15, t * 0.1, t * 0.08) + 11.3);
  float spotSmall = snoise(p * 1.05 + vec3(t * 0.2, -t * 0.12, 0.0) + 5.7);
  float spot = smoothstep(0.06 + uTurb * 0.14, 0.48, spotBig) * (0.45 + uTurb * 0.5);
  spot += smoothstep(0.28 + uTurb * 0.2, 0.72, spotSmall) * (0.16 + uTurb * 0.24);
  spot = clamp(spot, 0.0, 1.0);

  // 临边昏暗：中心亮、边缘暗
  float mu = clamp(dot(normalize(vNormalW), normalize(vViewW)), 0.0, 1.0);
  float limb = pow(mu, 0.55);
  // 色球增亮：靠近轮廓处泛起一层热辉（日面边缘的“大气”）
  float rim = pow(1.0 - mu, 2.6);

  // 色彩：暗部（冷却下沉气流，深冷）→ 光球基色 → 亮米粒（炽热）→ 极亮核心（略提白）
  vec3 cool = uColor * vec3(0.34, 0.22, 0.20);
  vec3 col = mix(cool, uColor, smoothstep(0.04, 0.46, lum));
  col = mix(col, uHot, smoothstep(0.52, 0.95, lum));
  col += uHot * pow(smoothstep(0.64, 1.0, gran), 2.2) * (0.2 + uTurb * 0.32);
  col = mix(col, vec3(1.0), pow(smoothstep(0.9, 1.0, gran), 2.0) * 0.1);

  // 黑子压暗（更明显）
  col *= 1.0 - spot * 0.82;
  // 临边昏暗 + 色球边缘热辉
  col *= (0.40 + 0.94 * limb);
  col += uHot * rim * (0.5 + uTurb * 0.5);
  // 饱和度提升：让光球颜色更浓郁（避免被亮度冲淡成惨白）
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.3);
  col *= uIntensity;

  gl_FragColor = vec4(col, 1.0);
}
`

// ── 色球/日冕薄壳：菲涅尔边缘辉光（比光球略大的加性球壳，强化“立体大气”轮廓）──
const RIM_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewW;
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewW = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const RIM_FRAG = /* glsl */ `
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimStrength;
uniform float uTime;
uniform float uTurb;
uniform vec3 uSeed;
varying vec3 vNormalW;
varying vec3 vViewW;
varying vec3 vDir;
${NOISE_GLSL}

void main() {
  vec3 dir = normalize(vDir);
  float f = 1.0 - clamp(dot(normalize(vNormalW), normalize(vViewW)), 0.0, 1.0);
  float glow = pow(f, uRimPower);
  // 日珥/耀斑：噪声调制边缘辉光，形成不规则亮舌，随时间翻涌、随自转漂移
  float prom = fbm(dir * (2.6 + uTurb * 2.2) + uSeed + vec3(uTime * 0.09, uTime * 0.06, -uTime * 0.07));
  prom = smoothstep(0.15, 0.8, prom * 0.5 + 0.5);
  float rimGlow = glow * (0.55 + prom * (0.9 + uTurb * 1.3));
  gl_FragColor = vec4(uRimColor * rimGlow * uRimStrength, rimGlow);
}
`

// ── 深空星场（参考星表探索页：多色温星点 + 衍射芒 + 银河带，营造“星光璀璨”纵深）──
function Stars() {
  const { positions, colors } = useMemo(() => {
    const n = 2600
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    // 色温调色板：冷白为主，点缀蓝白 / 淡黄 / 橙红（真实星场配色）
    const cool: [number, number, number][] = [[0.70, 0.80, 1.0], [0.82, 0.88, 1.0], [1.0, 1.0, 1.0]]
    const warm: [number, number, number][] = [[1.0, 0.95, 0.84], [1.0, 0.87, 0.68], [1.0, 0.76, 0.58]]
    for (let i = 0; i < n; i++) {
      const r = 40 + Math.random() * 72
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      const pal = Math.random() < 0.72 ? cool : warm
      const c = pal[Math.floor(Math.random() * pal.length)]!
      const b = 0.5 + Math.random() * 0.5 // 明暗抖动：多数偏暗，少数亮眼
      col[i * 3] = c[0] * b
      col[i * 3 + 1] = c[1] * b
      col[i * 3 + 2] = c[2] * b
    }
    return { positions: pos, colors: col }
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.17} sizeAttenuation vertexColors transparent opacity={0.92} depthWrite={false} />
    </points>
  )
}

// ── 银河带：一条倾斜的密集暗星带，呼应星表探索页的银河 ──
function MilkyWay() {
  const positions = useMemo(() => {
    const n = 1600
    const arr = new Float32Array(n * 3)
    const tiltX = 0.62, tiltZ = 0.35
    const cx = Math.cos(tiltX), sx = Math.sin(tiltX)
    const cz = Math.cos(tiltZ), sz = Math.sin(tiltZ)
    for (let i = 0; i < n; i++) {
      const r = 58 + Math.random() * 46
      const theta = Math.random() * Math.PI * 2
      const lat = (Math.random() + Math.random() + Math.random() - 1.5) * 0.3 // 纬度集中在银道面
      const y0 = lat * r
      const ring = Math.sqrt(Math.max(0.0001, r * r - y0 * y0))
      const x0 = ring * Math.cos(theta)
      const z0 = ring * Math.sin(theta)
      const y1 = y0 * cx - z0 * sx
      const z1 = y0 * sx + z0 * cx
      arr[i * 3] = x0 * cz - y1 * sz
      arr[i * 3 + 1] = x0 * sz + y1 * cz
      arr[i * 3 + 2] = z1
    }
    return arr
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.12} sizeAttenuation color="#aebcdf" transparent opacity={0.5} depthWrite={false} />
    </points>
  )
}

// ── 背景亮星衍射芒（韦伯风格十字光芒，复用星表页纹理）──
function BrightSpikes() {
  const tex = useMemo(spikeTexture, [])
  const items = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number; opacity: number }[] = []
    for (let i = 0; i < 12; i++) {
      const r = 46 + Math.random() * 58
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr.push({
        pos: [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)],
        scale: 1.5 + Math.random() * 2.4,
        opacity: 0.2 + Math.random() * 0.3,
      })
    }
    return arr
  }, [])
  return (
    <group>
      {items.map((s, i) => (
        <sprite key={i} position={s.pos} scale={[s.scale, s.scale, 1]}>
          <spriteMaterial map={tex} color="#cfe0ff" blending={THREE.AdditiveBlending} transparent opacity={s.opacity} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

// ── 程序化恒星：自转 + 随进度变形 + 日冕光晕 ──
function StarBody({ state, dragging }: { state: EvolutionState; dragging: boolean }) {
  const spinRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const rimMatRef = useRef<THREE.ShaderMaterial>(null)
  const speedRef = useRef(0.16)
  const glowTex = useMemo(() => glowTexture(), [])
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(1, 0.85, 0.5) },
    uHot: { value: new THREE.Color(1, 0.97, 0.85) },
    uTime: { value: 0 },
    uTurb: { value: 0.5 },
    uFreq: { value: 8 },
    uSeed: { value: new THREE.Vector3(1.7, 4.3, 2.9) },
    uIntensity: { value: 1.3 },
  }), [])
  const rimUniforms = useMemo(() => ({
    uRimColor: { value: new THREE.Color(1, 0.9, 0.7) },
    uRimPower: { value: 2.4 },
    uRimStrength: { value: 1.0 },
    uTime: { value: 0 },
    uTurb: { value: 0.5 },
    uSeed: { value: new THREE.Vector3(3.1, 7.7, 1.3) },
  }), [])

  const starR = sceneR(state.radiusRSun * RSUN_IN_AU)

  // 用 state 更新 uniform 值（材质实例保持稳定，不触发 shader 重编译）
  useEffect(() => {
    const m = matRef.current
    if (!m) return
    const [r, g, b] = state.color
    const [hr, hg, hb] = state.hotColor
    m.uniforms.uColor.value.setRGB(r / 255, g / 255, b / 255)
    m.uniforms.uHot.value.setRGB(hr / 255, hg / 255, hb / 255)
    m.uniforms.uTurb.value = state.turb
    m.uniforms.uFreq.value = state.granFreq
    // 色球薄壳：取“热色向白偏移”作为边缘辉光色；湍流越强边缘越张扬
    const rim = rimMatRef.current
    if (rim) {
      rim.uniforms.uRimColor.value.setRGB(
        (hr / 255) * 0.55 + 0.45,
        (hg / 255) * 0.55 + 0.45,
        (hb / 255) * 0.55 + 0.45,
      )
      rim.uniforms.uRimStrength.value = 0.6 + state.turb * 0.35
      rim.uniforms.uTurb.value = state.turb
    }
  }, [state])

  useFrame((s, dt) => {
    // 拖动进度条 → 自转加速；空闲 → 缓慢自转（平滑过渡）
    const target = dragging ? 1.3 : 0.16
    speedRef.current += (target - speedRef.current) * Math.min(1, dt * 3.5)
    if (spinRef.current) spinRef.current.rotation.y += dt * speedRef.current
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = s.clock.elapsedTime
      matRef.current.uniforms.uIntensity.value = 1.05 + Math.sin(s.clock.elapsedTime * 1.6) * 0.05
    }
    if (rimMatRef.current) rimMatRef.current.uniforms.uTime.value = s.clock.elapsedTime
  })

  const [r, g, b] = state.color
  const [hr, hg, hb] = state.hotColor
  const glowColor = `rgb(${r},${g},${b})`
  // 日冕用更热、更白的颜色（内层），外层回落到光球色
  const coronaColor = `rgb(${Math.round(r * 0.4 + hr * 0.6)},${Math.round(g * 0.4 + hg * 0.6)},${Math.round(b * 0.4 + hb * 0.6)})`

  return (
    <group>
      <group ref={spinRef} scale={starR}>
        <mesh>
          <sphereGeometry args={[1, 128, 128]} />
          <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={STAR_VERT} fragmentShader={STAR_FRAG} />
        </mesh>
        {/* 色球薄壳：菲涅尔边缘辉光，强化立体大气轮廓 */}
        <mesh scale={1.22}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={rimMatRef}
            uniforms={rimUniforms}
            vertexShader={RIM_VERT}
            fragmentShader={RIM_FRAG}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.FrontSide}
          />
        </mesh>
      </group>
      {/* 日冕：内层热白亮晕 → 中层光球色 → 外层极淡弥散（加性混合） */}
      <sprite scale={[starR * 1.75, starR * 1.75, 1]}>
        <spriteMaterial map={glowTex} color={coronaColor} blending={THREE.AdditiveBlending} transparent opacity={0.8} depthWrite={false} />
      </sprite>
      <sprite scale={[starR * 2.9, starR * 2.9, 1]}>
        <spriteMaterial map={glowTex} color={glowColor} blending={THREE.AdditiveBlending} transparent opacity={0.24} depthWrite={false} />
      </sprite>
      <sprite scale={[starR * 5.2, starR * 5.2, 1]}>
        <spriteMaterial map={glowTex} color={glowColor} blending={THREE.AdditiveBlending} transparent opacity={0.08} depthWrite={false} />
      </sprite>
    </group>
  )
}

// ── 宜居带：只保留内外边界两条线（去掉半透明填充面）──
function HabitableRing({ inner, outer }: { inner: number; outer: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[inner, inner + 0.018, 128]} />
        <meshBasicMaterial color="#6ee1a0" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[outer - 0.018, outer, 128]} />
        <meshBasicMaterial color="#6ee1a0" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ── 轨道参考环（淡）──
function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.012, radius + 0.012, 160]} />
      <meshBasicMaterial color="#9fb4d8" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

// ── 同心参考网格（营造纵深 + 尺度感）──
function RefGrid() {
  const radii = [1.6, 3.2, 4.8, 6.4]
  return (
    <group>
      {radii.map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.007, 128]} />
          <meshBasicMaterial color="#5a6a8a" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// ── 测试行星（固定在地球轨道 1 AU，绕恒星缓慢公转；宜居状态决定颜色）──
function TestPlanet({ orbitR, status }: { orbitR: number; status: 'hot' | 'ok' | 'cold' }) {
  const orbitRef = useRef<THREE.Group>(null)
  const glowTex = useMemo(() => glowTexture(), [])
  useFrame((_, dt) => { if (orbitRef.current) orbitRef.current.rotation.y += dt * 0.12 })
  const color = status === 'ok' ? '#4fd08d' : status === 'hot' ? '#ff7a4d' : '#82b4ff'
  return (
    <group ref={orbitRef}>
      <mesh position={[orbitR, 0, 0]}>
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* 圆形辉光：必须带径向渐变贴图，否则 sprite 渲染成正方形遮罩 */}
      <sprite position={[orbitR, 0, 0]} scale={[0.62, 0.62, 1]}>
        <spriteMaterial map={glowTex} color={color} blending={THREE.AdditiveBlending} transparent opacity={0.55} depthWrite={false} />
      </sprite>
    </group>
  )
}

export default function StarEvolution3D({ state, dragging }: { state: EvolutionState; dragging: boolean }) {
  // 测试行星固定在 1 AU（地球轨道），判断它此刻是否落在宜居带内
  const status: 'hot' | 'ok' | 'cold' = 1 < state.habInnerAU ? 'hot' : 1 > state.habOuterAU ? 'cold' : 'ok'
  return (
    <Canvas
      camera={{ position: [0, 5, 13], fov: 45, near: 0.1, far: 220 }}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#05060c']} />
      <MilkyWay />
      <Stars />
      <BrightSpikes />
      <RefGrid />
      <StarBody state={state} dragging={dragging} />
      <HabitableRing inner={sceneR(state.habInnerAU)} outer={sceneR(state.habOuterAU)} />
      <OrbitRing radius={sceneR(1)} />
      <TestPlanet orbitR={sceneR(1)} status={status} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={7}
        maxDistance={26}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI * 0.82}
        target={[0, 0, 0]}
      />
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.82} luminanceThreshold={0.5} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette offset={0.3} darkness={0.6} />
        <Noise opacity={0.035} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  )
}
