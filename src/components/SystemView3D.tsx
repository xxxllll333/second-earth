// SystemView3D —— 星系视图 3D 场景（层级二 · 中景）
// 中心恒星（发光核心 + 呼吸脉动光晕 + 衍射芒）+ 行星轨道环 + 程序化星球沿轨道公转
// 视觉体系与星表页共用（proceduralPlanet 共享模块）：fbm 程序化地表 / 散射大气 / 后处理链
// 光照：每帧从恒星位置（原点）动态指向行星，公转中明暗面始终朝向恒星
// 交互：OrbitControls 拖拽旋转 / 滚轮缩放；点击行星切换选中（联动雷达图），相机跟随聚焦
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { keyPlanets, PlanetData } from '../data/planets'
import {
  seededRandom, ballRadius, labelColor, proceduralStyleFor,
  glowTexture, spikeTexture, ProceduralPlanet,
} from './proceduralPlanet'

// ── 系统分组：去掉末尾行星字母（TRAPPIST-1e → TRAPPIST-1；K2-18b → K2-18）──
export function systemOf(name: string): string {
  const m = name.match(/^(.*?)[b-h]$/)
  if (m) {
    const prev = name[name.length - 2]
    if (prev && !/[a-zA-Z]/.test(prev)) return m[1] ?? name
  }
  return name
}

export function planetsOfSystem(name: string): PlanetData[] {
  const sys = systemOf(name)
  return keyPlanets.filter((p) => systemOf(p.name) === sys)
}

// ── 恒星颜色：红矮星偏橙红，其余按系统名散列暖黄白 ──
function starColorFor(systemName: string): string {
  if (systemName.startsWith('TRAPPIST')) return '#ffb37a' // 超冷红矮星
  const r = seededRandom(systemName)()
  return r < 0.4 ? '#ffd9a6' : r < 0.7 ? '#ffc98a' : '#ffe3b8'
}

// ── 轨道参数：开普勒第三定律 a ∝ period^(2/3)，系统内归一化 ──
interface OrbitParam {
  planet: PlanetData
  orbitR: number  // 轨道半径（世界单位）
  phase0: number  // 初始相位角
  omega: number   // 公转角速度
  radius: number  // 行星视觉半径
}

function orbitParams(planets: PlanetData[]): OrbitParam[] {
  const aus = planets.map((p) => ({ p, a: Math.pow(p.period / 365.25, 2 / 3) }))
  const maxA = Math.max(...aus.map((x) => x.a))
  const multi = aus.length > 1
  return aus.map(({ p, a }) => {
    const orbitR = multi ? 3.2 + (a / maxA) * 4.8 : 4.2
    const rand = seededRandom(p.name)
    return {
      planet: p,
      orbitR,
      phase0: rand() * Math.PI * 2,
      omega: 1.2 / p.period,
      radius: ballRadius(p) * 0.62,
    }
  })
}

// ── 深空星点背景 ──
function Stars() {
  const positions = useMemo(() => {
    const n = 900
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = 20 + Math.random() * 30
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
      <pointsMaterial size={0.1} sizeAttenuation color="#a8bcd8" transparent opacity={0.8} depthWrite={false} />
    </points>
  )
}

// ── 中心恒星：发光核心 + 双层光晕（呼吸脉动）+ 衍射芒 ──
function CentralStar({ color }: { color: string }) {
  const tex = useMemo(glowTexture, [])
  const spike = useMemo(spikeTexture, [])
  const coreRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Sprite>(null)
  useFrame((state) => {
    const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05
    if (coreRef.current) coreRef.current.scale.setScalar(breathe)
    if (glowRef.current) glowRef.current.scale.setScalar(3.6 * breathe)
  })
  return (
    <group>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.78, 48, 48]} />
        <meshBasicMaterial color="#fff6e0" />
      </mesh>
      <sprite ref={glowRef} scale={[3.6, 3.6, 1]}>
        <spriteMaterial map={tex} color={color} blending={THREE.AdditiveBlending} transparent opacity={0.9} depthWrite={false} />
      </sprite>
      <sprite scale={[6, 6, 1]}>
        <spriteMaterial map={tex} color={color} blending={THREE.AdditiveBlending} transparent opacity={0.26} depthWrite={false} />
      </sprite>
      <sprite scale={[2.4, 2.4, 1]}>
        <spriteMaterial map={spike} color="#fff0d8" blending={THREE.AdditiveBlending} transparent opacity={0.5} depthWrite={false} />
      </sprite>
    </group>
  )
}

// ── 轨道环 ──
function OrbitRing({ radius, highlight }: { radius: number; highlight: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.014, radius + 0.014, 160]} />
      <meshBasicMaterial
        color={highlight ? '#6ee1a0' : '#8fa0cc'}
        transparent
        opacity={highlight ? 0.5 : 0.14}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── 单颗公转行星：程序化星球 + 标签 + 选中/悬停高亮环 ──
function OrbitingPlanet({
  param, selected, onSelect, sunPos,
}: {
  param: OrbitParam
  selected: boolean
  onSelect: (name: string) => void
  sunPos: THREE.Vector3
}) {
  const { planet, orbitR, phase0, omega, radius } = param
  const [hovered, setHovered] = useState(false)
  const orbitRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const style = useMemo(() => proceduralStyleFor(planet), [planet])

  useFrame((state) => {
    if (orbitRef.current) orbitRef.current.rotation.y = phase0 + state.clock.elapsedTime * omega
    // 高亮环始终面向相机
    if (ringRef.current) ringRef.current.quaternion.copy(state.camera.quaternion)
  })

  return (
    <group ref={orbitRef}>
      <group position={[orbitR, 0, 0]}>
        <group
          onClick={(e) => {
            e.stopPropagation()
            onSelect(planet.name)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
        >
          <ProceduralPlanet
            style={style}
            radius={radius}
            sunPos={sunPos}
            rotationSpeed={0.04}
            atmosIntensityScale={1.7}
          />
          {/* 不可见点击球：扩大易点区域（小行星在缩放视角下依然好点） */}
          <mesh>
            <sphereGeometry args={[radius * 1.7, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>

        {(selected || hovered) && (
          <mesh ref={ringRef}>
            <ringGeometry args={[radius + 0.16, radius + 0.24, 48]} />
            <meshBasicMaterial
              color={planet.isHabitable ? '#6ee1a0' : '#ffffff'}
              transparent
              opacity={selected ? 0.8 : 0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}

        <Html
          position={[0, radius + 0.42, 0]}
          center
          distanceFactor={14}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              fontFamily: "'Cascadia Code', 'Consolas', monospace",
              fontSize: selected ? '0.68rem' : '0.56rem',
              letterSpacing: '0.06em',
              color: labelColor(planet),
              whiteSpace: 'nowrap',
              textShadow: '0 0 6px rgba(0,0,0,0.9)',
              transition: 'font-size 0.25s',
            }}
          >
            {planet.name}
            {planet.isRejected && <span style={{ marginLeft: 4, opacity: 0.85 }}>✕</span>}
          </div>
        </Html>
      </group>
    </group>
  )
}

// ── 相机控制：聚焦选中行星（丝滑飞行 + 跟随公转）/ 复位 ──
// 点击左栏或 3D 星球 → 相机锁定当前观察方向，在空间内飞到目标行星近旁；
// 行星公转时相机保持相对距离跟拍；切换系统 → 拉回全景视角
function CameraRig({
  focusName, params, resetting, onUserStart,
}: {
  focusName: string | null
  params: OrbitParam[]
  resetting: boolean
  onUserStart: () => void
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()
  const HOME = useMemo(() => new THREE.Vector3(0, 9.5, 16), [])
  const ORIGIN = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const focusPos = useMemo(() => new THREE.Vector3(), [])
  const dirRef = useRef(new THREE.Vector3(0, 0.5, 1)) // 聚焦观察方向：首次聚焦时从当前视角锁定
  const dirLockedRef = useRef(false)

  // 聚焦目标变化（换行星/换系统）→ 重新锁定观察方向，飞行路径从用户当前视角出发
  useEffect(() => {
    dirLockedRef.current = false
  }, [focusName])

  useFrame((state) => {
    const controls = controlsRef.current
    if (!controls) return
    if (focusName) {
      const p = params.find((x) => x.planet.name === focusName)
      if (p) {
        const a = p.phase0 + state.clock.elapsedTime * p.omega
        // 与 orbitRef.rotation.y 一致：绕 y 轴旋转 θ，点 (R,0,0) → (R·cosθ, 0, -R·sinθ)
        focusPos.set(Math.cos(a) * p.orbitR, 0, -Math.sin(a) * p.orbitR)
        if (!dirLockedRef.current) {
          dirRef.current.copy(camera.position).sub(focusPos).normalize()
          dirLockedRef.current = true
        }
        // 飞行距离随行星大小缩放；目标点每帧随公转更新，相机持续跟拍
        const dist = Math.max(p.radius * 2.6 + 3.2, 4.5)
        const desired = focusPos.clone().add(dirRef.current.clone().multiplyScalar(dist))
        controls.target.lerp(focusPos, 0.1)
        camera.position.lerp(desired, 0.1)
      }
    } else if (resetting) {
      controls.target.lerp(ORIGIN, 0.1)
      camera.position.lerp(HOME, 0.08)
    }
    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={26}
      maxPolarAngle={Math.PI * 0.55}
      rotateSpeed={0.65}
      zoomSpeed={0.9}
      onStart={onUserStart}
    />
  )
}

// ── 开发期调试探针：向 window 暴露各行星实时屏幕投影坐标（仅开发构建生效）──
// 供自动验证脚本精确点击行星，消除时钟偏移与投影误差的猜测
function DebugProbe({ params }: { params: OrbitParam[] }) {
  const clock = useThree((s) => s.clock)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    if (!(import.meta as any).env?.DEV) return
    const v = new THREE.Vector3()
    const debug = () => {
      const t = clock.elapsedTime
      return params.map((p) => {
        const a = p.phase0 + t * p.omega
        // 注意：THREE 绕 y 轴旋转 θ，点 (R,0,0) → (R·cosθ, 0, -R·sinθ)
        v.set(Math.cos(a) * p.orbitR, 0, -Math.sin(a) * p.orbitR).project(camera)
        return { name: p.planet.name, nx: v.x, ny: v.y }
      })
    }
    ;(window as any).__system3dProbe = debug
    return () => {
      delete (window as any).__system3dProbe
    }
  }, [params, clock, camera])
  return null
}

// ── 主组件 ──
interface SystemView3DProps {
  planets: PlanetData[]
  selectedName: string
  onSelect: (name: string) => void
}

export default function SystemView3D({ planets, selectedName, onSelect }: SystemView3DProps) {
  const [focus, setFocus] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const params = useMemo(() => orbitParams(planets), [planets])
  const sunPos = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const starColor = useMemo(() => starColorFor(systemOf(planets[0]?.name ?? '')), [planets])
  const firstRef = useRef(true) // 初次挂载不聚焦，先展示星系全貌

  // 切换系统 → 相机复位；选中变化（用户点击）→ 聚焦
  useEffect(() => {
    setResetting(true)
    setFocus(null)
  }, [planets])
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false
      return
    }
    if (selectedName) setFocus(selectedName)
  }, [selectedName])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#04050a' }}>
      <Canvas
        camera={{ position: [0, 9.5, 16], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        dpr={[1, 2]}
      >
        <Stars />
        <CentralStar color={starColor} />

        {params.map((p) => (
          <OrbitRing key={`ring-${p.planet.name}`} radius={p.orbitR} highlight={selectedName === p.planet.name} />
        ))}

        {params.map((p) => (
          <OrbitingPlanet
            key={p.planet.name}
            param={p}
            selected={selectedName === p.planet.name}
            onSelect={onSelect}
            sunPos={sunPos}
          />
        ))}

        <CameraRig
          focusName={focus}
          params={params}
          resetting={resetting}
          onUserStart={() => {
            setFocus(null)
            setResetting(false)
          }}
        />

        <DebugProbe params={params} />

        {/* 后处理：与星表页一致 —— Bloom + 暗角 + ACES + 胶片颗粒 */}
        <EffectComposer multisampling={4}>
          <Bloom intensity={1.0} luminanceThreshold={0.3} luminanceSmoothing={0.25} mipmapBlur />
          <Vignette offset={0.32} darkness={0.6} />
          <Noise opacity={0.05} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
