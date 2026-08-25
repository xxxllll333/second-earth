// Planet3D：真实感 3D 行星球体（Three.js / react-three-fiber）
// 用于旅程首页的大尺寸特写——NASA 公共领域真实贴图 + 球面光照 + 云层 + 大气菲涅尔边缘光
// 贴图来源：three.js 官方仓库（NASA 衍生）、Solar System Scope（CC BY 4.0）、planetpixelemporium
// 与星表页的"高级平面光点"形成分工：小光点平面、大特写立体

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { PlanetData } from '../data/planets'

// ── 行星贴图配置 ──
export interface PlanetTextureSet {
  map?: string           // 表面贴图（等距柱投影）；缺省时主体为 tint 纯色球（海洋世界基底）
  clouds?: string        // 云层贴图（可选）
  normal?: string        // 法线贴图（可选，岩质行星用）
  tint?: string          // 表面乘色——艺术家演绎（海洋世界/热木星偏色）
  cloudOpacity?: number  // 云层不透明度
  roughness?: number     // 表面粗糙度：岩质低（有高光）/ 气态云层高（柔光）
}

interface Planet3DProps {
  planet: PlanetData
  textures: PlanetTextureSet
  size?: number
  rotationSpeed?: number
  beat?: PlanetBeat  // 叙事拍状态：驱动曝光/主体色/大气色联动（希望提亮、证伪褪色）
}

// ── 叙事拍：发现 / 希望 / 证伪 / 悬置 ──
export type PlanetBeat = 'discovery' | 'hope' | 'rejected' | 'disputed'

// 曝光映射：希望拍更饱满，证伪拍暗沉
const EXPOSURE: Record<PlanetBeat, number> = {
  discovery: 1.1,
  hope: 1.5,
  rejected: 0.55,
  disputed: 0.85,
}

// 自转速度系数：证伪拍近乎停止（死寂），希望拍加快（生机）
const BEAT_SPEED: Record<PlanetBeat, number> = {
  discovery: 1,
  hope: 1.3,
  rejected: 0.12,
  disputed: 0.55,
}

// 状态环配置：围绕球体的叙事状态色环（Sprite 贴图，永远面向相机）
const RING: Record<PlanetBeat, { color: string; opacity: number }> = {
  discovery: { color: '#9fb6d8', opacity: 0.4 },   // 蓝环：发现时的数据扫描感
  hope: { color: '#7fe0b0', opacity: 0.62 },        // 浅绿环：希望与生机
  disputed: { color: '#e8b13a', opacity: 0.66 },    // 黄环：悬而未决（呼吸闪烁）
  rejected: { color: '#fc503c', opacity: 0.75 },    // 红环：证伪警示
}

// 大气边缘光强度：希望拍光晕增强，证伪拍熄灭
const BEAT_ATMOS_INTENSITY: Record<PlanetBeat, number> = {
  discovery: 0.55,
  hope: 0.8,
  rejected: 0.18,
  disputed: 0.42,
}

const RADIUS = 1.55

// ── 球体主体 + 云层 ──
function PlanetBody({ textures, rotationSpeed, beat }: { textures: PlanetTextureSet; rotationSpeed: number; beat: PlanetBeat }) {
  const planetRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  const urls = useMemo(() => {
    const arr: string[] = []
    if (textures.map) arr.push(textures.map)
    if (textures.clouds) arr.push(textures.clouds)
    if (textures.normal) arr.push(textures.normal)
    return arr
  }, [textures])

  const loaded = useLoader(THREE.TextureLoader, urls) as unknown as THREE.Texture[]

  // 按配置字段顺序对应取回贴图；map 可缺省（纯色球体基底）
  const [mapTex, cloudsTex, normalTex] = useMemo(() => {
    let i = 0
    const m = textures.map ? loaded[i++] : undefined
    const c = textures.clouds ? loaded[i++] : undefined
    const n = textures.normal ? loaded[i++] : undefined
    return [m, c, n] as [THREE.Texture | undefined, THREE.Texture | undefined, THREE.Texture | undefined]
  }, [textures, loaded])

  // 颜色空间与各向异性过滤：sRGB 用于颜色贴图，法线贴图保持线性
  useEffect(() => {
    if (mapTex) {
      mapTex.colorSpace = THREE.SRGBColorSpace
      mapTex.anisotropy = 16
    }
    if (cloudsTex) {
      cloudsTex.colorSpace = THREE.SRGBColorSpace
      cloudsTex.anisotropy = 16
    }
    if (normalTex) {
      normalTex.colorSpace = THREE.NoColorSpace
      normalTex.anisotropy = 16
    }
  }, [mapTex, cloudsTex, normalTex])

  // 各叙事拍的目标主体色（在 tint 基础上偏移）：希望拍提亮，证伪拍彻底灰化，悬置拍降饱和
  const beatTargetColor = useMemo(() => {
    const base = new THREE.Color(textures.tint ?? '#ffffff')
    if (beat === 'hope') return base.clone().lerp(new THREE.Color('#ffffff'), 0.22)
    if (beat === 'rejected') return base.clone().lerp(new THREE.Color('#4a4c54'), 0.85)
    if (beat === 'disputed') return base.clone().lerp(new THREE.Color('#8a8a94'), 0.35)
    return base
  }, [beat, textures])

  // 自转速度随叙事拍平滑过渡
  const speedRef = useRef(rotationSpeed)
  useFrame((_, delta) => {
    const targetSpeed = rotationSpeed * BEAT_SPEED[beat]
    speedRef.current += (targetSpeed - speedRef.current) * Math.min(1, delta * 2)
    if (planetRef.current) planetRef.current.rotation.y += delta * speedRef.current
    // 云层略快于地表，制造大气流动感
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * speedRef.current * 1.35
    // 主体色向叙事拍目标色平滑过渡
    if (matRef.current) matRef.current.color.lerp(beatTargetColor, Math.min(1, delta * 3))
  })

  return (
    <group rotation={[-0.05, 0.25, 0]}>
      {/* 主体 */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[RADIUS, 128, 128]} />
        <meshStandardMaterial
          ref={matRef}
          map={mapTex ?? null}
          normalMap={normalTex ?? undefined}
          normalScale={new THREE.Vector2(0.8, 0.8)}
          color={textures.tint ?? '#ffffff'}
          roughness={textures.roughness ?? 0.7}
          metalness={0}
        />
      </mesh>
      {/* 云层：略大的透明球壳，独立自转（初始相位错开，避免与基底纹路重叠） */}
      {cloudsTex && (
        <mesh ref={cloudsRef} scale={1.035} rotation={[0, 1.1, 0]}>
          <sphereGeometry args={[RADIUS, 128, 128]} />
          <meshStandardMaterial
            map={cloudsTex}
            transparent
            opacity={textures.cloudOpacity ?? 0.5}
            roughness={0.9}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

// ── 大气：背面球壳 + 菲涅尔衰减，模拟边缘散射光 ──
// 壳完整落在视口内（壳半径 1.67，相机 z=5.2 时角直径约 36° < 视口 42°），
// 不会再被画布矩形硬切出"正方形黑边"
function Atmosphere({ color, beat }: { color: string; beat: PlanetBeat }) {
  // 证伪拍大气转为冷灰（生机褪去），希望拍提亮；大气色向白色淡化 62%：绿色系行星的纯色光晕会显脏，淡彩才高级
  const uniforms = useMemo(() => {
    let base = new THREE.Color(color)
    if (beat === 'rejected') base = new THREE.Color('#8a8f99')
    else if (beat === 'hope') base = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.12)
    return {
      uColor: { value: base.clone().lerp(new THREE.Color('#f0f5ff'), 0.62) },
      uPower: { value: 3.0 },
      uIntensity: { value: BEAT_ATMOS_INTENSITY[beat] },
    }
  }, [color, beat])

  return (
    <mesh scale={1.08}>
      <sphereGeometry args={[RADIUS, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uColor;
          uniform float uPower;
          uniform float uIntensity;
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float rim = 1.0 - abs(dot(vView, normalize(vNormal)));
            rim = pow(max(rim, 0.0), uPower) * uIntensity;
            gl_FragColor = vec4(uColor, rim);
          }
        `}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

// ── 叙事状态特效：状态环 + 证伪红叉 ──
// 环：Sprite 环形渐变贴图，永远面向相机；悬置拍呼吸闪烁，发现拍缓慢旋转（扫描感）
// 红叉：证伪拍"盖章"落下——快速放大回弹 + 淡入，像给星球画上红叉
const CROSS_SCALE = 4.4

function makeRingTexture(hex: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const col = new THREE.Color(hex)
  const r = Math.round(col.r * 255)
  const g = Math.round(col.g * 255)
  const b = Math.round(col.b * 255)
  const grad = ctx.createRadialGradient(128, 128, 100, 128, 128, 128)
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`)
  grad.addColorStop(0.74, `rgba(${r},${g},${b},0)`)
  grad.addColorStop(0.84, `rgba(${r},${g},${b},0.9)`)
  grad.addColorStop(0.92, `rgba(${r},${g},${b},0.3)`)
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeCrossTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.strokeStyle = 'rgba(252,80,60,0.92)'
  ctx.lineWidth = 13
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(70, 70)
  ctx.lineTo(186, 186)
  ctx.moveTo(186, 70)
  ctx.lineTo(70, 186)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function BeatStatusFX({ beat }: { beat: PlanetBeat }) {
  const ringRef = useRef<THREE.Sprite>(null)
  const crossRef = useRef<THREE.Sprite>(null)
  const prevBeat = useRef<PlanetBeat>(beat)

  const ringTex = useMemo(() => makeRingTexture(RING[beat].color), [beat])
  // 红叉纹理始终创建、首帧就挂到 map 上：若 map 从无到有动态切换，
  // three.js 不会自动重编译 SpriteMaterial 的 shader 变体，会退化成白色方块遮住整颗星球。
  // 显隐完全由 opacity 控制（非证伪拍 opacity 为 0，不参与画面）
  const crossTex = useMemo(() => makeCrossTexture(), [])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    // 悬置拍呼吸闪烁：透明度正弦摆动，制造"悬而未决"的不安感
    const pulse = beat === 'disputed' ? 0.66 + Math.sin(t * 3) * 0.22 : 1
    if (ringRef.current) {
      const m = ringRef.current.material as THREE.SpriteMaterial
      m.opacity += (RING[beat].opacity * pulse - m.opacity) * Math.min(1, delta * 3)
      if (beat === 'discovery') m.rotation += delta * 0.25 // 发现拍：环缓慢旋转，扫描感
    }
    if (crossRef.current) {
      const m = crossRef.current.material as THREE.SpriteMaterial
      m.opacity += ((beat === 'rejected' ? 0.88 : 0) - m.opacity) * Math.min(1, delta * 3.5)
      // 盖章回弹：刚进入证伪拍时 scale 从 1.45 倍回落，像红叉砸在球面上
      if (beat === 'rejected' && prevBeat.current !== 'rejected') {
        crossRef.current.scale.setScalar(CROSS_SCALE * 1.45)
      }
      const s = crossRef.current.scale.x
      const ns = s + (CROSS_SCALE - s) * Math.min(1, delta * 5)
      crossRef.current.scale.setScalar(ns)
    }
    prevBeat.current = beat
  })

  return (
    <>
      <sprite ref={ringRef} scale={[3.55, 3.55, 1]}>
        <spriteMaterial map={ringTex} transparent opacity={0} depthWrite={false} />
      </sprite>
      <sprite ref={crossRef} scale={[CROSS_SCALE, CROSS_SCALE, 1]} position={[0, 0, 1.62]}>
        <spriteMaterial map={crossTex} transparent opacity={0} depthWrite={false} />
      </sprite>
    </>
  )
}

export default function Planet3D({
  planet,
  textures,
  size = 420,
  rotationSpeed = 0.1,
  beat = 'discovery',
}: Planet3DProps) {
  return (
    <div style={{ width: size, height: size, maxWidth: '88vw', maxHeight: '88vw' }}>
      <Canvas
        camera={{ position: [0, 0, 4.7], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, toneMappingExposure: EXPOSURE[beat] }}
        style={{ background: 'transparent' }}
      >
        {/* 主光（左上）+ 中性冷白轮廓光（右后）——低环境光加大明暗对比，层次更锐；主光强度/色温随叙事拍变化 */}
        <ambientLight intensity={beat === 'rejected' ? 0.16 : 0.28} color="#aab8d0" />
        <directionalLight
          position={[6, 3, 4]}
          intensity={beat === 'hope' ? 4.3 : beat === 'rejected' ? 2.0 : 3.4}
          color={beat === 'hope' ? '#fff6e8' : '#ffffff'}
        />
        <directionalLight position={[-5, -2, -3]} intensity={0.35} color="#bfcfe8" />
        <Suspense fallback={null}>
          <PlanetBody textures={textures} rotationSpeed={rotationSpeed} beat={beat} />
        </Suspense>
        <Atmosphere color={planet.color} beat={beat} />
        <BeatStatusFX beat={beat} />
      </Canvas>
    </div>
  )
}
