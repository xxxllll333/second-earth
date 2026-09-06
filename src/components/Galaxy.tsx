// Galaxy.tsx —— 程序化银河：约 10 万颗恒星的旋臂盘 + 核球 + 稀疏晕 + 银心光晕
// 复刻 Google「100,000 Stars」的浩瀚尺度：把星表 29 颗行星降级为银河盘中一隅的“本地邻域”。
// 设计（见 docs/星表 3D 视觉提升参考.md）：
//   1. 恒星分布：对数旋臂盘（72%）+ 中心核球（18%）+ 稀疏晕（10%），单 Points 一次绘制
//   2. 着色：按半径内暖外蓝（核球橙黄、旋臂蓝白、晕暗蓝），每颗带微弱闪烁相位
//   3. 性能：桌面 10 万 / 移动端 4.2 万；自定义 shader 柔和圆点 + 加色混合 + 近镜淡出
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32, glowTexture } from './proceduralPlanet'

// ── 太阳（本地邻域）在银河盘中的位置：约 0.41 倍盘半径处 ──
export const SUN_OFFSET = new THREE.Vector3(190, 5, 28)

// ── 银河尺度参数（集中调参：改这里即可改银河形态）──
export const GALAXY = {
  radiusMax: 460,        // 盘外缘半径
  radiusMin: 10,         // 盘内缘（中心留给核球）
  branches: 4,           // 旋臂数量
  spin: 0.0135,          // 旋臂缠绕强度（每单位半径的弧度，越大绕得越紧）
  diskThickness: 15,     // 盘中心厚度（向外变薄）
  randomness: 0.30,      // 旋臂散开程度（越大臂越模糊）
  bulgeRadius: 74,       // 核球半径
  coreGlowScale: 260,    // 银心光晕 sprite 尺寸
  rotationSpeed: 0.004,  // 整体缓慢自转（rad/s）
}

const DESKTOP_COUNT = 100000
const MOBILE_COUNT = 42000

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /Mobi|Android|iPhone|iPad/i.test(window.navigator.userAgent) || window.innerWidth < 820
}

// ── GLSL：柔和圆点 + 距离衰减 + 微弱闪烁 + 近镜淡出 ──
const GALAXY_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aTwinkle;
uniform float uTime;
uniform float uPixelRatio;
uniform float uSizeScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float dist = max(-mvPosition.z, 0.001);
  gl_PointSize = aSize * uSizeScale * uPixelRatio * (240.0 / dist);
  gl_PointSize = clamp(gl_PointSize, 0.6, 26.0);
  gl_Position = projectionMatrix * mvPosition;
  vColor = aColor;
  // 近镜淡出：避免贴近相机的恒星糊成大亮斑，保证行星近景干净
  float nearFade = smoothstep(6.0, 40.0, dist);
  float tw = 0.74 + 0.26 * sin(uTime * 1.4 + aTwinkle * 6.2831853);
  vAlpha = nearFade * tw;
}
`

const GALAXY_FRAG = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d2 = dot(uv, uv);
  if (d2 > 0.25) discard;
  float a = pow(smoothstep(0.25, 0.0, d2), 1.8);
  gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
}
`

interface GalaxyData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  twinkle: Float32Array
}

// ── 确定性生成整条银河（一次性，useMemo 缓存）──
function generateGalaxy(): GalaxyData {
  const count = isMobileDevice() ? MOBILE_COUNT : DESKTOP_COUNT
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const twinkle = new Float32Array(count)

  const rand = mulberry32(100000)
  const gauss = () => {
    let u = 0
    let v = 0
    while (u === 0) u = rand()
    while (v === 0) v = rand()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  const cInner = new THREE.Color('#ffcf94')   // 内盘/核球：暖橙
  const cOuter = new THREE.Color('#8fb4ff')   // 外盘：冷蓝
  const cArmHot = new THREE.Color('#d6e6ff')  // 旋臂年轻热星：蓝白
  const cBulge = new THREE.Color('#ffce93')   // 核球
  const cBulgeHot = new THREE.Color('#fff2da')
  const cHalo = new THREE.Color('#8fa2c6')    // 晕：暗蓝
  const tmp = new THREE.Color()

  const nDisk = Math.floor(count * 0.72)
  const nBulge = Math.floor(count * 0.18)
  const span = GALAXY.radiusMax - GALAXY.radiusMin

  for (let i = 0; i < count; i++) {
    let x: number
    let y: number
    let z: number

    if (i < nDisk) {
      // ── 盘 + 对数旋臂 ──
      const branch = i % GALAXY.branches
      const branchAngle = (branch / GALAXY.branches) * Math.PI * 2
      const radius = GALAXY.radiusMin + Math.pow(rand(), 0.62) * span
      const angle = branchAngle + radius * GALAXY.spin
      // pow3 散开：多数紧贴旋臂，少数远散填充臂间
      const spread = GALAXY.randomness * radius
      const rx = Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * spread
      const rz = Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * spread
      const thick = GALAXY.diskThickness * (1 - (radius / GALAXY.radiusMax) * 0.55)
      x = Math.cos(angle) * radius + rx
      z = Math.sin(angle) * radius + rz
      y = gauss() * thick * 0.5
      tmp.copy(cInner).lerp(cOuter, Math.min(1, radius / GALAXY.radiusMax))
      if (rand() < 0.18) tmp.lerp(cArmHot, 0.6)
      sizes[i] = 0.7 + Math.pow(rand(), 3) * 2.6
    } else if (i < nDisk + nBulge) {
      // ── 核球：压扁椭球，中心致密 ──
      const radius = Math.pow(rand(), 0.5) * GALAXY.bulgeRadius
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      x = radius * Math.sin(phi) * Math.cos(theta)
      z = radius * Math.sin(phi) * Math.sin(theta)
      y = radius * Math.cos(phi) * 0.55
      tmp.copy(cBulge)
      if (rand() < 0.3) tmp.lerp(cBulgeHot, 0.5)
      sizes[i] = 0.7 + Math.pow(rand(), 2.4) * 2.0
    } else {
      // ── 晕：稀疏球状，老年暗星 ──
      const radius = GALAXY.bulgeRadius + Math.pow(rand(), 0.7) * (GALAXY.radiusMax * 0.92)
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      x = radius * Math.sin(phi) * Math.cos(theta)
      y = radius * Math.cos(phi) * 0.8
      z = radius * Math.sin(phi) * Math.sin(theta)
      tmp.copy(cHalo)
      sizes[i] = 0.5 + Math.pow(rand(), 2.6) * 1.5
    }

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
    twinkle[i] = rand()
  }

  return { positions, colors, sizes, twinkle }
}

// ── 银河组件：恒星点云 + 银心光晕 ──
export function Galaxy() {
  const data = useMemo(generateGalaxy, [])
  const glowTex = useMemo(glowTexture, [])
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2) },
      uSizeScale: { value: 1.0 },
      uOpacity: { value: 0.92 },
    }),
    [],
  )

  useFrame((state, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    if (groupRef.current) groupRef.current.rotation.y += dt * GALAXY.rotationSpeed
  })

  return (
    <group ref={groupRef}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
          <bufferAttribute attach="attributes-aTwinkle" args={[data.twinkle, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={GALAXY_VERT}
          fragmentShader={GALAXY_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 银心光晕：柔和暖光核，缩放拉远时的视觉焦点 */}
      <sprite scale={[GALAXY.coreGlowScale, GALAXY.coreGlowScale, 1]}>
        <spriteMaterial
          map={glowTex}
          color="#ffdba8"
          blending={THREE.AdditiveBlending}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </sprite>
    </group>
  )
}
