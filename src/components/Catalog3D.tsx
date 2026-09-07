// Catalog3D —— 星表 3D 探索视图（SpaceEngine 风格视觉升级版）
// 视觉体系（见 docs/星表3D视觉提升参考.md）：
//   1. 程序化星球表面：fbm 噪声实时生成地貌/气态条纹，29 颗星各具唯一形态，特写依然锐利
//   2. 大气散射：瑞利/米氏散射 raymarching（主角 4 颗），边缘蓝晕 + 晨昏线暖光
//   3. 深空氛围：星云 sprite + 恒星体积光（发光核 + 衍射芒）+ 亮星十字芒
//   4. 后处理：Bloom + Vignette + ACES 色调映射 + 胶片颗粒
// 交互：OrbitControls 拖拽旋转 / 滚轮推拉缩放 / 右键平移；点击星球飞近并打开详情
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { THEME } from '../config/visuals'
import { keyPlanets, PlanetData, starCoords, equatorialToGalactic } from '../data/planets'
import {
  SUN_DIR, seededRandom, mulberry32, ballRadius, labelColor,
  proceduralStyleFor, glowTexture, spikeTexture, nebulaTexture,
  PlanetSurface, CloudMaterial, Atmosphere,
} from './proceduralPlanet'
import { motion, AnimatePresence } from 'framer-motion'
import { Galaxy, SUN_OFFSET } from './Galaxy'
import { systemOf } from './SystemView3D'
// 太阳系真实照片贴图（复用 Journey 页资源：NASA 公共领域 / Solar System Scope CC BY 4.0）
import earthDayTex from '../assets/textures/earth_day_4096.jpg'
import earthCloudsTex from '../assets/textures/earth_clouds_1024.png'
import earthNormalTex from '../assets/textures/earth_normal_2048.jpg'
import jupiterTex from '../assets/textures/jupiter_2k.jpg'
import neptuneTex from '../assets/textures/neptune_2k.jpg'
import venusTex from '../assets/textures/venus_atmosphere_2k.jpg'

// ── 筛选条件（与旧 2D 星场语义一致）──
export interface CatalogFilter {
  habitableOnly: boolean
  category: string | null // null = 全部
}

// ── 3D 分布：按真实天球坐标散布成“本地泡” ──
// 每颗行星取其寄主恒星的真实 J2000 赤道坐标 → 银道坐标(l,b) 定方向，
// 真实距离（4.2–3160 光年）经对数压缩映射为半径（保留远近次序、又能同屏浏览）。
// 于是真实的“选择效应”自然浮现：开普勒同一视场的行星聚在一起、TRAPPIST-1 六颗同点。
const BUBBLE = { rMin: 17, rMax: 48 }
// 星表内行星球的统一缩小系数：比共享 ballRadius 更小，凸显“行星在宇宙中只是微尘”；不影响星系页
const BALL_SCALE = 0.7
const DEG2RAD = Math.PI / 180
// 太阳→银心方向在场景 XZ 平面的方位角，使银经 l=0 指向银心（与银河背景对齐）
const PHI0 = Math.atan2(-SUN_OFFSET.x, -SUN_OFFSET.z)
function layoutPositions(): Map<string, THREE.Vector3> {
  const map = new Map<string, THREE.Vector3>()
  const dists = keyPlanets.map((p) => p.distance)
  const lnMin = Math.log(Math.min(...dists))
  const lnMax = Math.log(Math.max(...dists))
  // 同一恒星系统的多颗行星（如 TRAPPIST-1 六颗）真实位置重合，需微抖动才能各自可点
  const sysCount = new Map<string, number>()
  keyPlanets.forEach((p) => {
    const s = systemOf(p.name).trim()
    sysCount.set(s, (sysCount.get(s) ?? 0) + 1)
  })
  keyPlanets.forEach((p) => {
    const rand = seededRandom(p.name)
    const sys = systemOf(p.name).trim()
    const c = starCoords[sys]
    const t = Math.max(0, Math.min(1, (Math.log(p.distance) - lnMin) / (lnMax - lnMin)))
    const radius = BUBBLE.rMin + t * (BUBBLE.rMax - BUBBLE.rMin)
    const dir = new THREE.Vector3()
    if (c) {
      const { l, b } = equatorialToGalactic(c.ra, c.dec)
      const theta = PHI0 + l * DEG2RAD
      const bb = b * DEG2RAD
      dir.set(Math.cos(bb) * Math.sin(theta), Math.sin(bb), Math.cos(bb) * Math.cos(theta))
    } else {
      // 兜底：万一某系统缺坐标，按名散列球面示意
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      dir.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi) * 0.72, Math.sin(phi) * Math.sin(theta))
    }
    const multi = (sysCount.get(sys) ?? 0) > 1
    const jit = multi
      ? new THREE.Vector3((rand() - 0.5) * 5, (rand() - 0.5) * 5, (rand() - 0.5) * 5)
      : new THREE.Vector3()
    map.set(p.name, dir.multiplyScalar(radius).add(jit).add(SUN_OFFSET))
  })
  return map
}

// ── 展陈分布：单一黄金螺旋随机散布（不分类，与“之前的版本”一致）──
// 28 颗沿 2.3 圈螺旋由内向外铺开 + 确定性抖动，形成有机的星点云，中心在原点。
function layoutScatter(): Map<string, THREE.Vector3> {
  const map = new Map<string, THREE.Vector3>()
  const total = keyPlanets.length
  keyPlanets.forEach((p, i) => {
    const t = i / Math.max(total - 1, 1)
    const angle = t * Math.PI * 4.6 + 0.6
    const radius = 7 + t * 30
    const rand = seededRandom(p.name)
    const x = Math.cos(angle) * radius + (rand() - 0.5) * 1.6
    const z = Math.sin(angle) * radius + (rand() - 0.5) * 1.6
    const y = (rand() - 0.5) * 6 + (t - 0.5) * 2.5
    map.set(p.name, new THREE.Vector3(x, y, z))
  })
  return map
}

// ── 程序化外观样式（共享模块 proceduralPlanet）──
// ── 3D 分布见上，球体半径与外观样式见共享模块 ──


// ── 深空星点（展陈模式背景，确定性播种）──
function Stars() {
  const positions = useMemo(() => {
    const n = 2600
    const arr = new Float32Array(n * 3)
    const rand = mulberry32(777)
    for (let i = 0; i < n; i++) {
      const r = 55 + rand() * 75
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.16} sizeAttenuation color="#a8bcd8" transparent opacity={0.85} depthWrite={false} />
    </points>
  )
}

// ── 背景亮星衍射芒（韦伯风格十字光芒）──
function BrightSpikes() {
  const tex = useMemo(spikeTexture, [])
  const items = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number; opacity: number }[] = []
    const rand = mulberry32(2024)
    for (let i = 0; i < 12; i++) {
      const r = 55 + rand() * 70
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      arr.push({
        pos: [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)],
        scale: 1.6 + rand() * 2.6,
        opacity: 0.22 + rand() * 0.3,
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

// ── 星云 ──
function Nebulae() {
  const items = useMemo(() => {
    return [
      { pos: [-30, 2, -58] as [number, number, number], scale: 110, rot: 0.4, opacity: 0.55, color: '#6a7ac8', tex: nebulaTexture(11) },
      { pos: [-20, -10, -70] as [number, number, number], scale: 130, rot: 1.2, opacity: 0.5, color: '#4a8a9a', tex: nebulaTexture(47) },
      { pos: [28, 4, -46] as [number, number, number], scale: 100, rot: 2.1, opacity: 0.5, color: '#7a5a96', tex: nebulaTexture(83) },
    ]
  }, [])
  return (
    <group>
      {items.map((n, i) => (
        <sprite key={i} position={n.pos} scale={[n.scale, n.scale, 1]} rotation={[0, 0, n.rot]}>
          <spriteMaterial map={n.tex} color={n.color} blending={THREE.AdditiveBlending} transparent opacity={n.opacity} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

// ── 恒星体积光：光源方向的发光体（初始视角下位于画面右上角，光芒渗入感）──
function SunGlow() {
  const glowTex = useMemo(glowTexture, [])
  const spikeTex = useMemo(spikeTexture, [])
  // 沿“右上前方”光线方向布置：大光晕（渗入）→ 中光晕 → 亮核
  const items = useMemo(() => {
    const dir = new THREE.Vector3(0.7, -0.14, -0.67).normalize()
    return [
      { pos: dir.clone().multiplyScalar(62).add(new THREE.Vector3(0, 26, 42)), scale: 52, opacity: 0.26, color: '#ffdfb0', tex: glowTex },
      { pos: dir.clone().multiplyScalar(52).add(new THREE.Vector3(0, 26, 42)), scale: 15, opacity: 0.42, color: '#fff0d8', tex: glowTex },
      { pos: dir.clone().multiplyScalar(49).add(new THREE.Vector3(0, 26, 42)), scale: 22, opacity: 0.24, color: '#ffdfb0', tex: spikeTex },
      { pos: dir.clone().multiplyScalar(48.5).add(new THREE.Vector3(0, 26, 42)), scale: 2.6, opacity: 1, color: '#ffffff', tex: glowTex },
    ]
  }, [glowTex, spikeTex])
  return (
    <group>
      {items.map((s, i) => (
        <sprite key={i} position={s.pos} scale={[s.scale, s.scale, 1]}>
          <spriteMaterial map={s.tex} color={s.color} blending={THREE.AdditiveBlending} transparent opacity={s.opacity} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

// ── 太阳系（探索模式中心的锚点：太阳 + 八大行星真实照片贴图，已放大、非真实比例，可点击看详情）──
// 相位错开让行星散布在各轨道上（飞行冻结时也不成一线）；地球相位 0 → 位于太阳 +X，供开场取景。
// 真实照片贴图来自 Journey 页资源（NASA 公共领域 / Solar System Scope CC BY 4.0）：大家都认识太阳系行星的样子。
// 已有：地球（昼面+云+法线）/ 金星 / 木星 / 海王星；缺的指向 public/textures/planets/，放入同名 jpg 即自动启用，
// 缺失则由 useOptionalTexture 优雅回退为「受太阳点光源照射的写实基色球」（不报错、不崩溃）。

// 可选贴图加载器：成功→纹理；文件缺失（404）或未指定→null（回退）。用命令式 load 而非 useLoader，避免 404 抛错中断 Suspense。
function useOptionalTexture(url: string | undefined, srgb = true): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!url) { setTex(null); return }
    let alive = true
    new THREE.TextureLoader().load(
      url,
      (t) => { if (!alive) return; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; setTex(t) },
      undefined,
      () => { if (alive) setTex(null) },
    )
    return () => { alive = false }
  }, [url, srgb])
  return tex
}

type SolarPlanetDef = {
  cn: string; orbit: number; size: number; color: string; speed: number; phase: number
  tilt: number; roughness: number
  mapUrl?: string; cloudsUrl?: string; normalUrl?: string; ring?: boolean
}

const SOLAR_PLANETS: SolarPlanetDef[] = [
  { cn: '水星', orbit: 2.5, size: 0.15, color: '#9c8f84', speed: 4.15, phase: 0.9, tilt: 0.0, roughness: 0.95, mapUrl: '/textures/planets/mercury_2k.jpg' },
  { cn: '金星', orbit: 3.24, size: 0.22, color: '#e8cf9a', speed: 1.62, phase: 2.6, tilt: 0.05, roughness: 0.92, mapUrl: venusTex },
  { cn: '地球', orbit: 4.1, size: 0.24, color: '#4f97e0', speed: 1.0, phase: 0.0, tilt: 0.41, roughness: 0.7, mapUrl: earthDayTex, cloudsUrl: earthCloudsTex, normalUrl: earthNormalTex },
  { cn: '火星', orbit: 5.0, size: 0.17, color: '#c1553d', speed: 0.53, phase: 4.2, tilt: 0.44, roughness: 0.9, mapUrl: '/textures/planets/mars_2k.jpg' },
  { cn: '木星', orbit: 6.7, size: 0.66, color: '#d8a56c', speed: 0.084, phase: 1.7, tilt: 0.05, roughness: 0.85, mapUrl: jupiterTex },
  { cn: '土星', orbit: 8.4, size: 0.56, color: '#e3d3a3', speed: 0.034, phase: 3.5, tilt: 0.47, roughness: 0.85, ring: true, mapUrl: '/textures/planets/saturn_2k.jpg' },
  { cn: '天王星', orbit: 10.0, size: 0.36, color: '#9fe3e3', speed: 0.012, phase: 5.4, tilt: 1.71, roughness: 0.8, mapUrl: '/textures/planets/uranus_2k.jpg' },
  { cn: '海王星', orbit: 11.6, size: 0.35, color: '#4a6fdc', speed: 0.006, phase: 2.2, tilt: 0.49, roughness: 0.85, mapUrl: neptuneTex },
]

// 土星环：同心条带（C/B/A 环 + 卡西尼缝）画布贴图，配合 ringGeometry 的平面 UV 呈径向条带
function saturnRingTexture(): THREE.Texture {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const cx = S / 2, cy = S / 2, R = S / 2
  const bands: [number, number, string][] = [
    [0.58, 0.68, 'rgba(198,178,140,0.42)'], // C 环（内·暗）
    [0.68, 0.82, 'rgba(234,218,182,0.92)'], // B 环（最亮）
    [0.82, 0.85, 'rgba(80,70,52,0.10)'],    // 卡西尼缝
    [0.85, 0.97, 'rgba(214,196,158,0.78)'], // A 环
    [0.97, 1.0, 'rgba(180,162,128,0.28)'],  // 外缘·淡
  ]
  for (const [r0, r1, col] of bands) {
    ctx.beginPath()
    ctx.arc(cx, cy, r1 * R, 0, Math.PI * 2)
    ctx.arc(cx, cy, r0 * R, 0, Math.PI * 2, true)
    ctx.fillStyle = col
    ctx.fill('evenodd')
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
const EARTH_ORBIT = 4.1
// 地球初始世界坐标（相位 0 → 太阳 +X 方向），供“从地球出发”的飞行开场取景
const EARTH_POS = new THREE.Vector3(SUN_OFFSET.x + EARTH_ORBIT, SUN_OFFSET.y, SUN_OFFSET.z)
function SolarSystem({ animate, onSelect }: { animate: boolean; onSelect: () => void }) {
  const glowTex = useMemo(() => glowTexture(), [])
  const sunTex = useOptionalTexture('/textures/planets/sun.jpg') // 可选：放入即显示真实米粒组织
  const pivots = useRef<(THREE.Group | null)[]>([])
  useFrame((_, dt) => {
    if (!animate) return // 飞行期间冻结公转，保证地球停在开场取景处
    for (let i = 0; i < SOLAR_PLANETS.length; i++) {
      const g = pivots.current[i]
      if (g) g.rotation.y += dt * SOLAR_PLANETS[i]!.speed * 0.6 // 相对公转（地球≈10s/圈）
    }
  })
  return (
    <group>
      {/* 太阳点光源：真实照亮八大行星（昼夜分界 + 相位）。decay=0 → 各行星亮度均匀；
          仅影响标准材质行星，不影响自打光的系外行星 shader 与加性背景 */}
      <pointLight intensity={2.8} decay={0} color="#fff5e6" />
      <ambientLight intensity={0.24} color="#8ea2c4" />
      {/* 太阳核（自发光 basic；放入 sun.jpg 则显示真实表面） */}
      <mesh>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshBasicMaterial map={sunTex ?? undefined} color={sunTex ? '#ffffff' : '#fff4d6'} toneMapped={false} />
      </mesh>
      {/* 放大的不可见命中球：点击飞近并弹出太阳系详情 */}
      <mesh onClick={(e) => { e.stopPropagation(); onSelect() }}>
        <sphereGeometry args={[1.9, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <sprite scale={[5.5, 5.5, 1]}>
        <spriteMaterial map={glowTex} color="#ffdf9e" blending={THREE.AdditiveBlending} transparent opacity={0.9} depthWrite={false} />
      </sprite>
      {SOLAR_PLANETS.map((pl, i) => (
        <group key={pl.cn}>
          {/* 轨道环（XZ 平面） */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[pl.orbit - 0.02, pl.orbit + 0.02, 160]} />
            <meshBasicMaterial color="#8fb6d8" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* 公转枢轴（初始相位错开） */}
          <group ref={(el) => { pivots.current[i] = el }} rotation={[0, pl.phase, 0]}>
            <group position={[pl.orbit, 0, 0]}>
              <SolarPlanet pl={pl} />
            </group>
          </group>
        </group>
      ))}
    </group>
  )
}

// ── 太阳系单颗行星：真实照片贴图（有则用）+ 受太阳点光照的标准材质 + 转轴倾角 + 自转 + 可选云层/土星环 ──
function SolarPlanet({ pl }: { pl: SolarPlanetDef }) {
  const map = useOptionalTexture(pl.mapUrl)
  const clouds = useOptionalTexture(pl.cloudsUrl)
  const normal = useOptionalTexture(pl.normalUrl, false)
  const ringTex = useMemo(() => (pl.ring ? saturnRingTexture() : null), [pl.ring])
  const normalScale = useMemo(() => new THREE.Vector2(0.85, 0.85), [])
  const spinRef = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (spinRef.current) spinRef.current.rotation.y += dt * 0.16 })
  return (
    <group rotation={[0, 0, pl.tilt]}>
      <group ref={spinRef}>
        <mesh>
          <sphereGeometry args={[pl.size, 48, 48]} />
          <meshStandardMaterial
            key={map ? 'mapped' : 'plain'}
            map={map ?? undefined}
            normalMap={normal ?? undefined}
            normalScale={normalScale}
            color={map ? '#ffffff' : pl.color}
            roughness={pl.roughness}
            metalness={0}
          />
        </mesh>
        {clouds && (
          <mesh scale={1.04} rotation={[0, 1.1, 0]}>
            <sphereGeometry args={[pl.size, 32, 32]} />
            <meshStandardMaterial map={clouds} transparent opacity={0.55} roughness={0.95} metalness={0} depthWrite={false} />
          </mesh>
        )}
      </group>
      {ringTex && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[pl.size * 1.4, pl.size * 2.4, 128]} />
          <meshBasicMaterial map={ringTex} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ── 单颗星球 ──
interface PlanetSpotProps {
  planet: PlanetData
  pos: THREE.Vector3
  dimmed: boolean
  isHovered: boolean
  isSelected: boolean
  onHover: (name: string | null) => void
  onSelect: (p: PlanetData) => void
}

function PlanetSpot({ planet, pos, dimmed, isHovered, isSelected, onHover, onSelect }: PlanetSpotProps) {
  const r = ballRadius(planet) * BALL_SCALE
  const hitR = Math.max(r * 2.2, 0.85)
  const style = useMemo(() => proceduralStyleFor(planet), [planet])
  const ballRef = useRef<THREE.Mesh>(null)
  const cloudRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  // 自转 + 高亮环面向屏幕
  useFrame((state, dt) => {
    if (ballRef.current) ballRef.current.rotation.y += dt * 0.05
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.08
    if (ringRef.current) ringRef.current.quaternion.copy(state.camera.quaternion)
  })

  const ringColor = planet.isHabitable ? '#6ee1a0' : '#ffffff'

  return (
    <group position={pos}>
      {/* 不可见命中球：球体缩小后仍易点击（视觉球本身不参与命中） */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); if (!dimmed) onHover(planet.name) }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => { e.stopPropagation(); if (!dimmed) onSelect(planet) }}
      >
        <sphereGeometry args={[hitR, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={ballRef}>
        <sphereGeometry args={[r, 64, 64]} />
        <PlanetSurface style={style} dimmed={dimmed} />
      </mesh>

      {/* 程序化云层 */}
      {style.clouds !== null && !dimmed && (
        <mesh ref={cloudRef} scale={1.03}>
          <sphereGeometry args={[r, 48, 48]} />
          <CloudMaterial seed={style.seed} cover={style.clouds} />
        </mesh>
      )}

      {/* 散射大气壳（主角） */}
      {style.atmos && !dimmed && (
        <Atmosphere radius={r} center={pos} rayleigh={style.atmos.rayleigh} intensity={style.atmos.intensity} />
      )}

      {/* 悬停/选中高亮环（始终面向相机） */}
      {(isHovered || isSelected) && !dimmed && (
        <mesh ref={ringRef}>
          <ringGeometry args={[r + 0.22, r + 0.3, 64]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {/* 名字标签 + hover 信息卡 */}
      <Html
        position={[0, r + 0.55, 0]}
        center
        distanceFactor={40}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: 'none' }}
        occlude={[ballRef as unknown as React.RefObject<THREE.Object3D>]}
      >
        <div style={{ textAlign: 'center', opacity: dimmed ? 0.35 : 1, transition: 'opacity 0.4s' }}>
          <div
            onClick={(e) => { e.stopPropagation(); if (!dimmed) onSelect(planet) }}
            style={{
              fontFamily: THEME.displayFont,
              fontSize: isHovered || isSelected ? '0.72rem' : '0.6rem',
              letterSpacing: '0.08em',
              color: labelColor(planet),
              whiteSpace: 'nowrap',
              textShadow: '0 0 6px rgba(0,0,0,0.9)',
              transition: 'font-size 0.25s',
              pointerEvents: dimmed ? 'none' : 'auto',
              cursor: dimmed ? 'default' : 'pointer',
            }}
          >
            {planet.name}
          </div>
          {isHovered && (
            <div
              style={{
                marginTop: 5,
                background: 'rgba(9,10,16,0.92)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 4,
                padding: '7px 11px',
                fontSize: '0.62rem',
                color: '#c9d1e0',
                lineHeight: 1.7,
                fontFamily: "'Cascadia Code', 'Consolas', monospace",
                letterSpacing: '0.04em',
              }}
            >
              <div>R {planet.radius} R⊕ · T {planet.temp} K</div>
              <div>{planet.distance} ly · P {planet.period} d</div>
              <div style={{ display: 'flex', gap: 9, marginTop: 2, justifyContent: 'center' }}>
                {planet.isHabitable && <span style={{ color: '#6ee1a0' }}>● 宜居带</span>}
                {planet.hasSpectrum && <span style={{ color: '#5ab0ff' }}>● 有光谱</span>}
                {planet.isRejected && <span style={{ color: '#fc503c' }}>● 已否决</span>}
              </div>
            </div>
          )}
          {planet.isRejected && (
            <div style={{ color: 'rgba(252,80,60,0.85)', fontSize: '0.6rem', marginTop: 2 }}>✕</div>
          )}
        </div>
      </Html>
    </group>
  )
}

// ── 星际邻居（太阳系↔本地泡之间的新层级）：太阳 12 光年内的真实恒星 ──
// 距离为 RECONS 标准值，方向为 J2000 真实赤道坐标（复用 equatorialToGalactic 银道变换，与本地泡同口径）。
// 径向映射 r = rBase + d×k：把 4.24–11.91 光年线性铺在海王星轨道（11.6）与本地泡内缘（17）之间，保留远近次序。
// 视觉上与本地泡的匿名行星微尘区分：命名亮星 + 真实色温着色（红矮星偏红、天狼星蓝白）+ 裸眼星衍射芒 + 10 光年范围圈。
const NB = { rBase: 12.2, k: 0.35 }
interface NeighborStar { cn: string; en: string; dist: number; ra: number; dec: number; color: string; size: number; bright: number; spike?: boolean }
const NEIGHBOR_STARS: NeighborStar[] = [
  { cn: '比邻星', en: 'Proxima Centauri', dist: 4.24, ra: 217.429, dec: -62.680, color: '#ff9d6e', size: 0.85, bright: 0.80, spike: true },
  { cn: '南门二', en: 'Alpha Centauri', dist: 4.37, ra: 219.902, dec: -60.834, color: '#ffe6b0', size: 1.90, bright: 1.00, spike: true },
  { cn: '巴纳德星', en: "Barnard's Star", dist: 5.96, ra: 269.452, dec: 4.739, color: '#ffa077', size: 0.70, bright: 0.66 },
  { cn: '沃尔夫 359', en: 'Wolf 359', dist: 7.86, ra: 164.120, dec: 7.146, color: '#ff8f66', size: 0.60, bright: 0.58 },
  { cn: '拉兰德 21185', en: 'Lalande 21185', dist: 8.31, ra: 165.836, dec: 35.970, color: '#ffb08a', size: 0.66, bright: 0.62 },
  { cn: '天狼星', en: 'Sirius', dist: 8.60, ra: 101.287, dec: -16.716, color: '#cadcff', size: 2.40, bright: 1.00, spike: true },
  { cn: '鲁坦 726-8', en: 'Luyten 726-8', dist: 8.73, ra: 24.728, dec: -17.953, color: '#ff9270', size: 0.58, bright: 0.55 },
  { cn: '罗斯 154', en: 'Ross 154', dist: 9.69, ra: 282.400, dec: 23.843, color: '#ffa580', size: 0.60, bright: 0.56 },
  { cn: '罗斯 248', en: 'Ross 248', dist: 10.30, ra: 6.661, dec: 7.788, color: '#ffab85', size: 0.58, bright: 0.54 },
  { cn: '天苑四', en: 'Epsilon Eridani', dist: 10.47, ra: 53.233, dec: -9.458, color: '#ffd9a0', size: 1.15, bright: 0.85, spike: true },
  { cn: '拉卡伊 9352', en: 'Lacaille 9352', dist: 10.74, ra: 13.247, dec: -27.290, color: '#ffb590', size: 0.62, bright: 0.58 },
  { cn: '罗斯 128', en: 'Ross 128', dist: 10.94, ra: 176.937, dec: 0.068, color: '#ffa27c', size: 0.60, bright: 0.56 },
  { cn: '天鹅座 61', en: '61 Cygni', dist: 11.36, ra: 316.734, dec: 38.466, color: '#ffc98f', size: 0.90, bright: 0.72 },
  { cn: '南河三', en: 'Procyon', dist: 11.46, ra: 114.825, dec: 5.225, color: '#eef2ff', size: 1.70, bright: 0.95, spike: true },
  { cn: '天仓五', en: 'Tau Ceti', dist: 11.91, ra: 26.017, dec: -15.937, color: '#ffe9c0', size: 1.10, bright: 0.82, spike: true },
]

function StellarNeighborhood() {
  const glowTex = useMemo(glowTexture, [])
  const spikeTex = useMemo(spikeTexture, [])
  // 真实方向 + 距离→半径（坐标相对太阳：父 group 已在 SUN_OFFSET）
  const stars = useMemo(() => NEIGHBOR_STARS.map((s) => {
    const { l, b } = equatorialToGalactic(s.ra, s.dec)
    const theta = PHI0 + l * DEG2RAD
    const bb = b * DEG2RAD
    const r = NB.rBase + s.dist * NB.k
    return { ...s, pos: new THREE.Vector3(Math.cos(bb) * Math.sin(theta) * r, Math.sin(bb) * r, Math.cos(bb) * Math.cos(theta) * r) }
  }), [])
  // 轻微闪烁：相位/频率错开，星空“活着”但不抢戏
  const matRefs = useRef<(THREE.SpriteMaterial | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < stars.length; i++) {
      const m = matRefs.current[i]
      if (m) m.opacity = stars[i]!.bright * (0.82 + 0.18 * Math.sin(t * (0.55 + i * 0.11) + i * 2.4))
    }
  })
  const ring10 = NB.rBase + 10 * NB.k // 10 光年范围圈半径
  return (
    <group>
      {stars.map((s, i) => (
        <group key={s.en} position={s.pos}>
          <sprite scale={[s.size, s.size, 1]}>
            <spriteMaterial ref={(el) => { matRefs.current[i] = el }} map={glowTex} color={s.color} blending={THREE.AdditiveBlending} transparent opacity={s.bright} depthWrite={false} />
          </sprite>
          {s.spike && (
            <sprite scale={[s.size * 2.8, s.size * 2.8, 1]}>
              <spriteMaterial map={spikeTex} color={s.color} blending={THREE.AdditiveBlending} transparent opacity={s.bright * 0.45} depthWrite={false} />
            </sprite>
          )}
          <Html position={[0, s.size * 0.55 + 0.8, 0]} center distanceFactor={110} zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
              <div style={{ fontFamily: THEME.cjkFont, fontSize: '0.46rem', letterSpacing: '0.06em', color: THEME.textPrimary, textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>{s.cn}</div>
              <div style={{ fontFamily: THEME.monoFont, fontSize: '0.5rem', color: THEME.textSecondary, opacity: 0.75 }}>{s.dist} ly · {s.en}</div>
            </div>
          </Html>
        </group>
      ))}
      {/* 10 光年范围圈：银道面内的尺度标尺（天仓五 11.91 ly 恰在圈外，语义真实） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ring10 - 0.03, ring10 + 0.03, 180]} />
        <meshBasicMaterial color={THEME.accentCyan} transparent opacity={0.14} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Html position={[ring10, 0.5, 0]} center distanceFactor={110} zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ fontFamily: THEME.monoFont, fontSize: '0.5rem', letterSpacing: '0.12em', color: THEME.accentCyan, opacity: 0.6, whiteSpace: 'nowrap' }}>10 光年</div>
      </Html>
    </group>
  )
}

// ── 古尔德带（本地泡↔猎户旋臂之间的新层级）：真实年轻星团与星云 ──
// 成员均为真实古尔德带天体：方向 = J2000 赤道坐标（与本地泡同 equatorialToGalactic 口径），
// 距离 153–2700 光年对数映射到半径带 86–112；真实方向自然落在倾斜约 18° 的带面上，无需人造倾斜。
// 疏散星团 = 蓝白星点簇（昴星团/毕星团/蜂巢星团）；星形成区 = 彩色星云（猎户/马头红、M78 蓝）。
const GB = { rMin: 86, rMax: 112, dMin: 150, dMax: 2800 }
interface GouldObj { cn: string; en: string; dist: number; ra: number; dec: number; kind: 'cluster' | 'nebula'; color: string; size: number }
const GOULD_OBJECTS: GouldObj[] = [
  { cn: '昴星团', en: 'M45 Pleiades', dist: 444, ra: 56.75, dec: 24.12, kind: 'cluster', color: '#bcd4ff', size: 2.6 },
  { cn: '毕星团', en: 'Hyades', dist: 153, ra: 66.75, dec: 15.87, kind: 'cluster', color: '#ffe9c4', size: 2.2 },
  { cn: '英仙α星团', en: 'Melotte 20', dist: 520, ra: 51.0, dec: 49.0, kind: 'cluster', color: '#cadcff', size: 2.4 },
  { cn: '蜂巢星团', en: 'M44 Praesepe', dist: 577, ra: 130.1, dec: 19.67, kind: 'cluster', color: '#e8ecff', size: 2.0 },
  { cn: '猎户座大星云', en: 'M42', dist: 1344, ra: 83.82, dec: -5.39, kind: 'nebula', color: '#ff8f7a', size: 3.4 },
  { cn: '马头星云', en: 'IC 434', dist: 1375, ra: 85.25, dec: -2.46, kind: 'nebula', color: '#e06a5a', size: 2.6 },
  { cn: 'M78', en: 'M78', dist: 1350, ra: 86.68, dec: 0.05, kind: 'nebula', color: '#9fc0ff', size: 2.2 },
  { cn: '英仙分子云', en: 'Perseus MC', dist: 1000, ra: 53.0, dec: 32.0, kind: 'nebula', color: '#8f9fe0', size: 3.0 },
  { cn: '蛇夫分子云', en: 'Ophiuchus MC', dist: 460, ra: 247.0, dec: -8.0, kind: 'nebula', color: '#b08fd0', size: 3.0 },
  { cn: '圣诞树星团', en: 'NGC 2264', dist: 2700, ra: 100.9, dec: 9.9, kind: 'cluster', color: '#ffd2c4', size: 2.2 },
]

function GouldBelt() {
  const glowTex = useMemo(glowTexture, [])
  const objs = useMemo(() => GOULD_OBJECTS.map((o, oi) => {
    const { l, b } = equatorialToGalactic(o.ra, o.dec)
    const theta = PHI0 + l * DEG2RAD
    const bb = b * DEG2RAD
    const t = Math.max(0, Math.min(1, (Math.log(o.dist) - Math.log(GB.dMin)) / (Math.log(GB.dMax) - Math.log(GB.dMin))))
    const r = GB.rMin + t * (GB.rMax - GB.rMin)
    const pos = new THREE.Vector3(Math.cos(bb) * Math.sin(theta) * r, Math.sin(bb) * r, Math.cos(bb) * Math.cos(theta) * r)
    // 星团星点：种子随机聚簇偏移（确定性，帧间不跳）
    const rand = seededRandom('gb' + oi)
    const members = Array.from({ length: 12 }, () => new THREE.Vector3((rand() - 0.5) * o.size, (rand() - 0.5) * o.size * 0.8, (rand() - 0.5) * o.size))
    return { ...o, pos, members, nebTex: o.kind === 'nebula' ? nebulaTexture(oi * 31 + 7) : null }
  }), [])
  return (
    <group>
      {objs.map((o, oi) => (
        <group key={o.en} position={o.pos}>
          {o.nebTex ? (
            <>
              <sprite scale={[o.size * 5, o.size * 5, 1]}>
                <spriteMaterial map={o.nebTex} color={o.color} blending={THREE.AdditiveBlending} transparent opacity={0.5} depthWrite={false} />
              </sprite>
              <sprite scale={[o.size * 1.4, o.size * 1.4, 1]}>
                <spriteMaterial map={glowTex} color="#ffffff" blending={THREE.AdditiveBlending} transparent opacity={0.5} depthWrite={false} />
              </sprite>
            </>
          ) : (
            <>
              {o.members.map((m, i) => (
                <sprite key={i} position={m} scale={[0.45 + (i % 4) * 0.16, 0.45 + (i % 4) * 0.16, 1]}>
                  <spriteMaterial map={glowTex} color={o.color} blending={THREE.AdditiveBlending} transparent opacity={0.9} depthWrite={false} />
                </sprite>
              ))}
              <sprite scale={[o.size * 2.4, o.size * 2.4, 1]}>
                <spriteMaterial map={glowTex} color={o.color} blending={THREE.AdditiveBlending} transparent opacity={0.14} depthWrite={false} />
              </sprite>
            </>
          )}
          <Html position={[0, o.size * 0.9 + 1.4 + (oi % 3) * 1.6, 0]} center distanceFactor={150} zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
              <div style={{ fontFamily: THEME.cjkFont, fontSize: '0.46rem', letterSpacing: '0.06em', color: THEME.textPrimary, textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>{o.cn}</div>
              <div style={{ fontFamily: THEME.monoFont, fontSize: '0.5rem', color: THEME.textSecondary, opacity: 0.75 }}>{o.dist} ly · {o.en}</div>
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}

// ── 相机控制：聚焦飞近 / 视图巡航 / 电影级引导飞行 ──
interface FocusTarget {
  pos: [number, number, number]
  dist: number
}

// 巡航停靠视图（稳定引用，供 goto 状态使用）
export const VIEW_PLANET = {
  pos: new THREE.Vector3(SUN_OFFSET.x, SUN_OFFSET.y + 46, SUN_OFFSET.z + 96),
  target: SUN_OFFSET.clone(),
}
export const VIEW_GALAXY = {
  pos: new THREE.Vector3(0, 610, 300),
  target: new THREE.Vector3(0, 0, 0),
}
// 展陈模式总览：框住黄金螺旋散布（中心在原点，最大半径约 37）
export const VIEW_CLUSTER = {
  pos: new THREE.Vector3(0, 34, 90),
  target: new THREE.Vector3(0, 0, 0),
}

// 引导飞行关键帧（绝对坐标）：地球近景 → 太阳系全景 → 星际邻居 → 本地泡 → 古尔德带 → 拉升穿越猎户旋臂 → 银河俯瞰全景
const FLIGHT_POS = [
  new THREE.Vector3(EARTH_POS.x + 1.0, EARTH_POS.y + 0.5, EARTH_POS.z + 1.3),
  new THREE.Vector3(SUN_OFFSET.x, SUN_OFFSET.y + 10, SUN_OFFSET.z + 30),
  new THREE.Vector3(SUN_OFFSET.x, SUN_OFFSET.y + 26, SUN_OFFSET.z + 60),
  new THREE.Vector3(SUN_OFFSET.x, SUN_OFFSET.y + 46, SUN_OFFSET.z + 96),
  new THREE.Vector3(SUN_OFFSET.x * 0.8, 75, SUN_OFFSET.z * 0.8 + 125),
  new THREE.Vector3(SUN_OFFSET.x * 0.55, 120, SUN_OFFSET.z * 0.55 + 170),
  VIEW_GALAXY.pos.clone(),
]
const FLIGHT_TARGET = [
  EARTH_POS.clone(),
  SUN_OFFSET.clone(),
  SUN_OFFSET.clone(),
  SUN_OFFSET.clone(),
  new THREE.Vector3(SUN_OFFSET.x * 0.65, 0, SUN_OFFSET.z * 0.65),
  new THREE.Vector3(SUN_OFFSET.x * 0.35, 0, SUN_OFFSET.z * 0.35),
  new THREE.Vector3(0, 0, 0),
]
const FLIGHT_DUR = 24 // 秒（放慢导览：每站里程碑有足够停留感，字幕读得完）

// 里程碑字幕（英/中）：随飞行进度切换
const DIST_MIN = Math.min(...keyPlanets.map((p) => p.distance))
const DIST_MAX = Math.max(...keyPlanets.map((p) => p.distance))
const MILESTONES = [
  { en: 'Earth', cn: '地球 · 我们的起点，一切从这里出发' },
  { en: 'Solar System', cn: '太阳系 · 一颗恒星、八颗行星，我们的家园' },
  { en: 'Stellar Neighborhood', cn: `星际邻居 · 太阳 12 光年内只有 ${NEIGHBOR_STARS.length} 颗恒星——天狼星、比邻星都在隔壁` },
  { en: 'Local Bubble', cn: `本地泡 · ${keyPlanets.length} 颗系外行星散布在太阳周围（${DIST_MIN}–${DIST_MAX} 光年）` },
  { en: 'Gould Belt', cn: '古尔德带 · 昴星团、猎户座大星云等环抱本地泡的年轻星团与星形成带，宽约 3000 光年' },
  { en: 'The Orion Arm', cn: '猎户旋臂 · 穿越数万颗恒星的星海' },
  { en: 'Milky Way', cn: '银河全景 · 我们找到的一切，仅是其中一点' },
]
function milestoneFor(t: number): number {
  if (t < 0.09) return 0
  if (t < 0.22) return 1
  if (t < 0.34) return 2
  if (t < 0.48) return 3
  if (t < 0.62) return 4
  if (t < 0.80) return 5
  return 6
}
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// 叠层小按钮样式（NASA 直角 + 纯色面板，去毛玻璃）
const pillStyle: React.CSSProperties = {
  padding: '7px 16px',
  background: THEME.panelBg,
  border: `1px solid ${THEME.panelBorder}`,
  borderRadius: THEME.cardRadius,
  color: THEME.textSecondary,
  fontSize: '0.68rem',
  letterSpacing: '0.16em',
  fontFamily: THEME.monoFont,
  cursor: 'pointer',
}

function CameraRig({
  focus,
  goto,
  flying,
  zoomEnabled,
  onFlightEnd,
  onMilestone,
  onUserStart,
}: {
  focus: FocusTarget | null
  goto: { pos: THREE.Vector3; target: THREE.Vector3 } | null
  flying: boolean
  zoomEnabled: boolean
  onFlightEnd: () => void
  onMilestone: (i: number) => void
  onUserStart: () => void
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()
  const dirLockedRef = useRef(false)
  const dirRef = useRef(new THREE.Vector3(0, 0.45, 1))
  const flightStartRef = useRef<number | null>(null)
  const lastMilestoneRef = useRef(-1)
  const posCurve = useMemo(() => new THREE.CatmullRomCurve3(FLIGHT_POS, false, 'centripetal', 0.5), [])
  const tgtCurve = useMemo(() => new THREE.CatmullRomCurve3(FLIGHT_TARGET, false, 'centripetal', 0.5), [])

  useEffect(() => {
    dirLockedRef.current = false
  }, [focus])

  // 飞行状态切换：开始重置里程碑，结束清空计时以便重播
  useEffect(() => {
    if (flying) lastMilestoneRef.current = -1
    else flightStartRef.current = null
  }, [flying])

  useFrame((state) => {
    const controls = controlsRef.current
    if (!controls) return

    // ── 电影级引导飞行：手动驱动相机，绕过 OrbitControls ──
    if (flying) {
      if (flightStartRef.current == null) flightStartRef.current = state.clock.elapsedTime
      const raw = Math.min((state.clock.elapsedTime - flightStartRef.current) / FLIGHT_DUR, 1)
      const pos = posCurve.getPoint(easeInOut(raw))
      const tgt = tgtCurve.getPoint(easeInOut(raw))
      camera.position.copy(pos)
      controls.target.copy(tgt)
      camera.lookAt(tgt)
      const mi = milestoneFor(raw)
      if (mi !== lastMilestoneRef.current) {
        lastMilestoneRef.current = mi
        onMilestone(mi)
      }
      if (raw >= 1) onFlightEnd()
      return
    }

    if (focus) {
      if (!dirLockedRef.current) {
        dirRef.current.copy(camera.position).sub(new THREE.Vector3(...focus.pos)).normalize()
        dirLockedRef.current = true
      }
      const target = new THREE.Vector3(...focus.pos)
      const desired = target.clone().add(dirRef.current.clone().multiplyScalar(focus.dist))
      controls.target.lerp(target, 0.12)
      camera.position.lerp(desired, 0.1)
    } else if (goto) {
      // 视图巡航：滑向指定停靠位（银河全景 / 行星群总览）——慢速平滑，漫游感优先
      controls.target.lerp(goto.target, 0.032)
      camera.position.lerp(goto.pos, 0.032)
    }
    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!flying}
      enableZoom={zoomEnabled}
      enableDamping
      dampingFactor={0.08}
      minDistance={2.2}
      maxDistance={1400}
      maxPolarAngle={Math.PI * 0.92}
      rotateSpeed={0.65}
      panSpeed={0.7}
      zoomSpeed={0.9}
      onStart={onUserStart}
    />
  )
}

// ── 主组件 ──
interface Catalog3DProps {
  filter: CatalogFilter
  searchQuery: string
  selectedName: string | null
  onSelect: (p: PlanetData | null) => void
  mode: 'explore' | 'gallery'
}

export default function Catalog3D({ filter, searchQuery, selectedName, onSelect, mode }: Catalog3DProps) {
  const isExplore = mode === 'explore'
  const [hovered, setHovered] = useState<string | null>(null)
  const [focus, setFocus] = useState<FocusTarget | null>(null)
  const [goto, setGoto] = useState<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const [flying, setFlying] = useState(mode === 'explore') // 探索模式进入即播放银河导览
  const [milestone, setMilestone] = useState(0)
  const [solarOpen, setSolarOpen] = useState(false) // 太阳系详情卡
  // 银河全景“待俯冲”：此时滚轮向内缩放即等价点击「进入行星群」，俯冲进入本地泡探索行星；进入后解除，交给 OrbitControls 自由缩放
  const [zoomArmed, setZoomArmed] = useState(false)
  const positions = useMemo(() => (isExplore ? layoutPositions() : layoutScatter()), [isExplore])

  // 模式切换：仅当 mode 真正变化时才把相机交给对应模式的总览停靠位；
  // 用 prevMode 而非 mounted 标志，避免 StrictMode 首帧双调用把初始导览取消掉（dev 与 prod 行为一致）
  const prevMode = useRef(mode)
  useEffect(() => {
    if (prevMode.current === mode) return
    prevMode.current = mode
    setFlying(false)
    setFocus(null)
    setSolarOpen(false)
    setZoomArmed(false)
    setGoto(isExplore ? VIEW_PLANET : VIEW_CLUSTER)
  }, [mode, isExplore])

  // 选中变化：飞近某颗行星 / 回到行星群总览
  useEffect(() => {
    setZoomArmed(false) // 选中/取消选中都已进入行星群语境，解除银河待俯冲
    if (selectedName) {
      const pos = positions.get(selectedName)
      const p = keyPlanets.find((k) => k.name === selectedName)
      if (pos && p) {
        setSolarOpen(false)
        setFocus({ pos: [pos.x, pos.y, pos.z], dist: ballRadius(p) * BALL_SCALE * 3.6 + 1.3 })
        setGoto(null)
      }
    } else {
      setFocus(null)
      setGoto(isExplore ? VIEW_PLANET : VIEW_CLUSTER)
    }
  }, [selectedName, positions, isExplore])

  // 导览结束 / 跳过：停在银河全景，交还手动控制
  const endFlight = () => {
    setFlying(false)
    setFocus(null)
    setSolarOpen(false)
    setGoto(VIEW_GALAXY)
    setZoomArmed(true) // 停在银河全景：滚轮向内即俯冲进行星群（等价按钮）
  }

  // 银河全景下滚轮向内 = 俯冲进入行星群；已进入行星群则不拦截，交给 OrbitControls 自由缩放
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isExplore || flying || !zoomArmed || e.deltaY >= 0) return
    setZoomArmed(false)
    setSolarOpen(false)
    setFocus(null)
    setGoto(VIEW_PLANET)
  }

  // 打开太阳系详情：相机飞近太阳，弹出信息卡
  const openSolar = () => {
    setSolarOpen(true)
    setZoomArmed(false)
    setFocus({ pos: [SUN_OFFSET.x, SUN_OFFSET.y, SUN_OFFSET.z], dist: 30 })
    setGoto(null)
  }
  // 关闭太阳系详情：回到行星群总览
  const closeSolar = () => {
    setSolarOpen(false)
    setFocus(null)
    setGoto(VIEW_PLANET)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#04050a' }} onWheel={handleWheel}>
      <Canvas
        camera={{ position: [EARTH_POS.x + 1.0, EARTH_POS.y + 0.5, EARTH_POS.z + 1.3], fov: 50, near: 0.1, far: 3000 }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        dpr={[1, 2]}
        onPointerMissed={() => onSelect(null)}
      >
        {/* 银河背景：仅探索模式（用 visible 切换而非卸载，避免来回重生成 10 万点） */}
        <group visible={isExplore}>
          <Galaxy />
        </group>

        {/* 展陈模式背景：深空星点 + 亮星芒 + 星云 + 恒星体积光（与旧单一版本一致，无分类标签） */}
        {!isExplore && (
          <>
            <Stars />
            <BrightSpikes />
            <Nebulae />
            <SunGlow />
          </>
        )}

        {/* 太阳系 + 本地泡：仅探索模式，28 颗行星按真实坐标散布在太阳系周围 */}
        {isExplore && (
          <group position={SUN_OFFSET}>
            {/* 风格化太阳系：太阳 + 八大行星轨道，作为“你在这里”的中心锚点 */}
            <SolarSystem animate={!flying} onSelect={openSolar} />
            {/* 星际邻居：太阳 12 光年内的命名恒星（真实距离与方向），衔接太阳系与本地泡 */}
            <StellarNeighborhood />
            {/* 本地泡边界：极淡加色壳，示意“人类已探测到的范围” */}
            <mesh>
              <sphereGeometry args={[BUBBLE.rMax, 32, 24]} />
              <meshBasicMaterial color={THEME.accentCyan} transparent opacity={0.035} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            {/* 古尔德带：本地泡与猎户旋臂之间的新尺度层级 */}
            <GouldBelt />
            <Html position={[0, 14, 0]} center distanceFactor={150} zIndexRange={[15, 0]}>
              <div
                onClick={openSolar}
                style={{
                  fontFamily: THEME.displayFont, fontSize: '0.6rem', letterSpacing: '0.14em',
                  color: THEME.accentCyan, textShadow: THEME.labelGlow, whiteSpace: 'nowrap',
                  cursor: 'pointer', pointerEvents: 'auto',
                }}
              >
                SOLAR SYSTEM · 太阳系 · 你在这里 ▸
              </div>
            </Html>
          </group>
        )}

        {keyPlanets.map((p) => {
          const pos = positions.get(p.name)
          if (!pos) return null
          const visible =
            !(filter.habitableOnly && !p.isHabitable) &&
            !(filter.category && p.category !== filter.category) &&
            !(searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
          return (
            <PlanetSpot
              key={p.name}
              planet={p}
              pos={pos}
              dimmed={!visible}
              isHovered={hovered === p.name}
              isSelected={selectedName === p.name}
              onHover={setHovered}
              onSelect={onSelect}
            />
          )
        })}

        <CameraRig
          focus={focus}
          goto={goto}
          flying={flying}
          zoomEnabled={!isExplore || !zoomArmed}
          onFlightEnd={endFlight}
          onMilestone={setMilestone}
          onUserStart={() => {
            setFocus(null)
            setGoto(null)
          }}
        />

        {/* 后处理：Bloom + 暗角 + ACES 色调映射 + 胶片颗粒 */}
        <EffectComposer multisampling={4}>
          <Bloom intensity={1.05} luminanceThreshold={0.3} luminanceSmoothing={0.25} mipmapBlur />
          <Vignette offset={0.32} darkness={0.6} />
          <Noise opacity={0.05} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>

      {/* ── 电影级导览字幕（DOM 叠层，不吃指针）── */}
      <AnimatePresence>
        {flying && (
          <motion.div
            key={milestone}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: '17%',
              textAlign: 'center', pointerEvents: 'none', zIndex: 40,
            }}
          >
            <div style={{
              fontFamily: THEME.displayFont,
              fontSize: 'clamp(1.3rem, 3.4vw, 2.5rem)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: THEME.accentCyan, textShadow: THEME.labelGlow,
            }}>
              {MILESTONES[milestone]!.en}
            </div>
            <div style={{
              marginTop: 10, fontFamily: THEME.cjkFont,
              fontSize: 'clamp(0.78rem, 1.6vw, 1rem)',
              letterSpacing: '0.22em', color: THEME.textSecondary,
            }}>
              {MILESTONES[milestone]!.cn}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 导览控制按钮（仅探索模式）── */}
      {isExplore && (
        <div style={{
          position: 'absolute', bottom: 54, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 10, zIndex: 45,
        }}>
          {flying ? (
            <button onClick={endFlight} style={pillStyle}>跳过导览 ▸</button>
          ) : selectedName ? null : (
            <>
              <button onClick={() => { setMilestone(0); setFlying(true) }} style={pillStyle}>⟲ 重播导览</button>
              <button onClick={() => { setSolarOpen(false); setFocus(null); setZoomArmed(false); setGoto(VIEW_PLANET) }} style={pillStyle}>进入行星群 ▸</button>
            </>
          )}
        </div>
      )}

      {/* ── 太阳系详情卡（点击太阳/标签弹出）── */}
      <AnimatePresence>
        {solarOpen && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 128, right: 20, width: 336, zIndex: 55,
              background: THEME.panelBg,
              border: `1px solid ${THEME.panelBorder}`, borderRadius: THEME.cardRadius,
              padding: '20px 22px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontFamily: THEME.displayFont, fontSize: '0.7rem', letterSpacing: '0.18em', color: THEME.accentCyan, textShadow: THEME.labelGlow }}>
                  SOLAR SYSTEM
                </div>
                <div style={{ marginTop: 7, fontFamily: THEME.cjkFont, fontSize: '1.02rem', letterSpacing: '0.06em', color: THEME.textPrimary }}>
                  太阳系 · 我们的家园
                </div>
              </div>
              <button onClick={closeSolar} style={{ ...pillStyle, padding: '3px 9px', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ marginTop: 14, fontFamily: THEME.cjkFont, fontSize: '0.76rem', lineHeight: 1.95, color: THEME.textSecondary }}>
              一颗 G 型主序星「太阳」，与受其引力束缚的八大行星。地球位于第三轨道，是目前已知唯一孕育生命的行星。人类已确认的 {keyPlanets.length} 颗系外行星，全都在太阳系之外（{DIST_MIN}–{DIST_MAX} 光年）。
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {SOLAR_PLANETS.map((pl) => (
                <div key={pl.cn} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: pl.color, boxShadow: `0 0 7px ${pl.color}` }} />
                  <span style={{ fontFamily: THEME.cjkFont, fontSize: '0.62rem', color: THEME.textFaint }}>{pl.cn}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
