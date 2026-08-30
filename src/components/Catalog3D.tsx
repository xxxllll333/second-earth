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
import { keyPlanets, PlanetData } from '../data/planets'
import {
  SUN_DIR, seededRandom, mulberry32, ballRadius, labelColor,
  proceduralStyleFor, glowTexture, spikeTexture, nebulaTexture,
  PlanetSurface, CloudMaterial, Atmosphere,
} from './proceduralPlanet'
import type { ProceduralStyle } from './proceduralPlanet'

// ── 筛选条件（与旧 2D 星场语义一致）──
export interface CatalogFilter {
  habitableOnly: boolean
  category: string | null // null = 全部
}

// ── 3D 分布：阿基米德螺旋 ──
function layoutPositions(): Map<string, THREE.Vector3> {
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


// ── 深空星点 ──
function Stars() {
  const positions = useMemo(() => {
    const n = 2600
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = 55 + Math.random() * 75
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
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
  const r = ballRadius(planet)
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
      <mesh
        ref={ballRef}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(planet.name)
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation()
          if (!dimmed) onSelect(planet)
        }}
      >
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
            style={{
              fontFamily: "'Cascadia Code', 'Consolas', monospace",
              fontSize: isHovered || isSelected ? '0.72rem' : '0.6rem',
              letterSpacing: '0.08em',
              color: labelColor(planet),
              whiteSpace: 'nowrap',
              textShadow: '0 0 6px rgba(0,0,0,0.9)',
              transition: 'font-size 0.25s',
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

// ── 相机控制：聚焦与复位 ──
interface FocusTarget {
  pos: [number, number, number]
  dist: number
}

function CameraRig({
  focus,
  resetting,
  onUserStart,
}: {
  focus: FocusTarget | null
  resetting: boolean
  onUserStart: () => void
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()
  const dirLockedRef = useRef(false)
  const dirRef = useRef(new THREE.Vector3(0, 0.45, 1))
  const HOME = useMemo(() => new THREE.Vector3(0, 26, 42), [])
  const ORIGIN = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  useEffect(() => {
    dirLockedRef.current = false
  }, [focus])

  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return
    if (focus) {
      if (!dirLockedRef.current) {
        dirRef.current.copy(camera.position).sub(new THREE.Vector3(...focus.pos)).normalize()
        dirLockedRef.current = true
      }
      const target = new THREE.Vector3(...focus.pos)
      const desired = target.clone().add(dirRef.current.clone().multiplyScalar(focus.dist))
      controls.target.lerp(target, 0.12)
      camera.position.lerp(desired, 0.1)
    } else if (resetting) {
      controls.target.lerp(ORIGIN, 0.12)
      camera.position.lerp(HOME, 0.1)
    }
    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2.2}
      maxDistance={80}
      maxPolarAngle={Math.PI * 0.52}
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
}

export default function Catalog3D({ filter, searchQuery, selectedName, onSelect }: Catalog3DProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [focus, setFocus] = useState<FocusTarget | null>(null)
  const [resetting, setResetting] = useState(false)
  const positions = useMemo(() => layoutPositions(), [])

  // 选中变化：飞近或复位
  useEffect(() => {
    if (selectedName) {
      const pos = positions.get(selectedName)
      const p = keyPlanets.find((k) => k.name === selectedName)
      if (pos && p) {
        setFocus({ pos: [pos.x, pos.y, pos.z], dist: ballRadius(p) * 3.4 + 1.6 })
        setResetting(false)
      }
    } else {
      setFocus(null)
      setResetting(true)
    }
  }, [selectedName, positions])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#04050a' }}>
      <Canvas
        camera={{ position: [0, 26, 42], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        dpr={[1, 2]}
        onPointerMissed={() => onSelect(null)}
      >
        <Stars />
        <BrightSpikes />
        <Nebulae />
        <SunGlow />

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
          resetting={resetting}
          onUserStart={() => {
            setFocus(null)
            setResetting(false)
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
    </div>
  )
}
