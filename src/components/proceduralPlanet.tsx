// proceduralPlanet.tsx —— 程序化星球视觉共享模块（星表 / 星系视图共用）
// 内容：确定性噪声工具、程序化外观样式、GLSL shader（simplex fbm 地表 / 云 / 瑞利米氏大气散射）、
//      ProceduralPlanet 星球组件（地表 + 云 + 大气 + 自转 + 可选动态光照）、Canvas 纹理（光晕 / 衍射芒 / 星云）
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PlanetData } from '../data/planets'

// ── 全局太阳方向（星表固定主光；星系视图以恒星位置动态光照）──
export const SUN_DIR = new THREE.Vector3(8, 6, 5).normalize()

// ── 确定性伪随机 ──
export function seededRandom(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    return h / 0x7fffffff
  }
}
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── 颜色工具 ──
function hueOf(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  return h < 0 ? h + 360 : h
}
function lighten(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = new THREE.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255).lerp(new THREE.Color('#ffffff'), t)
  return '#' + c.getHexString()
}
function darken(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = new THREE.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255).multiplyScalar(1 - t)
  return '#' + c.getHexString()
}

// ── 球体半径：对数映射 + 重点加成 ──
export function ballRadius(p: PlanetData): number {
  const base = 0.34 + Math.log2(p.radius + 1) * 0.34
  const emphasis = p.category === '主角' || p.isHabitable ? 1.15 : 0.95
  return Math.min(1.75, Math.max(0.42, base * emphasis))
}

// ── 程序化外观样式 ──
export interface ProceduralStyle {
  mode: 'terran' | 'banded' | 'rock'
  colors: string[]      // terran: 深海/浅海/海岸/陆地/山/雪 · banded: 暗带/亮带/高光 · rock: 暗/亮
  freq: number
  bands: number
  seed: [number, number, number]
  clouds: number | null // 云覆盖率阈值 0.45~0.7，null = 无云
  atmos: { rayleigh: string; intensity: number } | null
  rim: string           // 边缘冷光色
}

export function seedOf(name: string): [number, number, number] {
  const r = seededRandom(name)
  return [r() * 10, r() * 10, r() * 10]
}

export function proceduralStyleFor(p: PlanetData): ProceduralStyle {
  const rand = seededRandom(p.name)
  const hue = hueOf(p.color)

  // 主角专属外观（与旅程页叙事一致）
  if (p.name === 'K2-18b') {
    return { mode: 'terran', colors: ['#031530', '#0d3a70', '#1e5f9e', '#2a6894', '#5a86b0', '#dceafc'], freq: 2.4, bands: 0, seed: seedOf(p.name), clouds: 0.58, atmos: { rayleigh: '#5aa0ff', intensity: 24 }, rim: '#7fb8ff' }
  }
  if (p.name === 'TRAPPIST-1e') {
    return { mode: 'terran', colors: ['#07264a', '#175a8c', '#79b48e', '#428a55', '#7a6a4a', '#eef4fa'], freq: 2.1, bands: 0, seed: seedOf(p.name), clouds: 0.5, atmos: { rayleigh: '#6fb4ff', intensity: 20 }, rim: '#7fb8ff' }
  }
  if (p.name === 'WASP-96b') {
    return { mode: 'banded', colors: ['#541608', '#c4681e', '#ffdda4'], freq: 2.8, bands: 12, seed: seedOf(p.name), clouds: null, atmos: { rayleigh: '#ff9a5a', intensity: 15 }, rim: '#ffb080' }
  }
  if (p.name === 'WD 1856b') {
    return { mode: 'banded', colors: ['#223258', '#5a76b0', '#c8d6f0'], freq: 3.0, bands: 10, seed: seedOf(p.name), clouds: null, atmos: { rayleigh: '#8fa8ff', intensity: 16 }, rim: '#9ab8ff' }
  }

  // 已否决：灰暗岩质世界
  if (p.isRejected) {
    return { mode: 'rock', colors: ['#2c3138', '#545b66'], freq: 3.4, bands: 0, seed: seedOf(p.name), clouds: null, atmos: null, rim: '#556070' }
  }

  // 橙红系 → 炽热气态（条纹带）
  if (hue < 45 || hue > 330) {
    return { mode: 'banded', colors: [darken(p.color, 0.55), p.color, lighten(p.color, 0.45)], freq: 3.0, bands: 10 + Math.floor(rand() * 5), seed: seedOf(p.name), clouds: null, atmos: null, rim: lighten(p.color, 0.5) }
  }

  // 大半径 → 冰巨气态（蓝紫条纹）
  if (p.radius > 8) {
    return { mode: 'banded', colors: ['#223a5e', '#5a80a8', '#b8d0e0'], freq: 3.2, bands: 9 + Math.floor(rand() * 4), seed: seedOf(p.name), clouds: null, atmos: null, rim: '#8899cc' }
  }

  // 候选宜居 → 海洋世界（部分有云）
  if (p.isHabitable) {
    const cloudy = rand() < 0.55
    return { mode: 'terran', colors: [darken(p.color, 0.5), p.color, lighten(p.color, 0.12), '#3e8a52', '#7a6a48', '#eaf2f8'], freq: 2.2, bands: 0, seed: seedOf(p.name), clouds: cloudy ? 0.48 + rand() * 0.15 : null, atmos: null, rim: lighten(p.color, 0.4) }
  }

  // 其余按名散列：岩石 / 气态
  if (rand() < 0.55) {
    return { mode: 'rock', colors: [darken(p.color, 0.5), lighten(p.color, 0.15)], freq: 3.1, bands: 0, seed: seedOf(p.name), clouds: null, atmos: null, rim: lighten(p.color, 0.35) }
  }
  return { mode: 'banded', colors: [darken(p.color, 0.45), p.color, lighten(p.color, 0.35)], freq: 3.2, bands: 8 + Math.floor(rand() * 6), seed: seedOf(p.name), clouds: null, atmos: null, rim: lighten(p.color, 0.45) }
}

// ── 标签颜色：宜居绿 / 否决红 / 主角白 / 一般灰 ──
export function labelColor(p: PlanetData): string {
  if (p.isRejected) return 'rgba(252,80,60,0.85)'
  if (p.isHabitable) return 'rgba(110,225,160,0.9)'
  if (p.category === '主角') return 'rgba(240,240,248,0.92)'
  return 'rgba(160,160,180,0.7)'
}

// ══════════════════ GLSL：simplex 3D 噪声 + fbm ══════════════════
const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p) {
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    f += a * snoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return f;
}
`

// ── 星球表面 shader（terran 地貌 / banded 气态条纹 / rock 岩质）──
const SURFACE_VERT = /* glsl */ `
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

const SURFACE_FRAG = /* glsl */ `
uniform vec3 uSeed;
uniform float uFreq;
uniform float uBands;
uniform float uMode;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2;
uniform vec3 uC3; uniform vec3 uC4; uniform vec3 uC5;
uniform vec3 uSunDir;
uniform vec3 uRim;
uniform float uDim;
varying vec3 vDir;
varying vec3 vNormalW;
varying vec3 vViewW;
${NOISE_GLSL}

void main() {
  vec3 dir = normalize(vDir);
  float h = fbm(dir * uFreq + uSeed) * 0.5 + 0.5;
  vec3 col;
  if (uMode < 0.5) {
    // terran：海洋 → 海岸 → 陆地 → 山 → 雪
    if (h < 0.44) col = mix(uC0, uC1, smoothstep(0.0, 1.0, h / 0.44));
    else if (h < 0.52) col = mix(uC1, uC2, (h - 0.44) / 0.08);
    else if (h < 0.63) col = mix(uC2, uC3, (h - 0.52) / 0.11);
    else if (h < 0.78) col = mix(uC3, uC4, (h - 0.63) / 0.15);
    else col = uC5;
  } else if (uMode < 1.5) {
    // banded：纬度条纹 + 湍流
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    float turb = fbm(dir * 4.2 + uSeed * 2.3) * 0.9;
    float bands = sin(lat * uBands + turb * 5.0) * 0.5 + 0.5;
    float detail = fbm(dir * 6.0 + uSeed * 1.7) * 0.5 + 0.5;
    col = mix(uC0, uC1, smoothstep(0.18, 0.82, bands));
    col = mix(col, uC2, smoothstep(0.55, 0.9, detail) * 0.65);
  } else {
    // rock：明暗起伏 + 陨石坑
    float detail = fbm(dir * uFreq * 3.1 + uSeed * 1.7);
    float crater = smoothstep(0.5, 0.66, fbm(dir * uFreq * 1.1 + uSeed * 3.7));
    col = mix(uC0, uC1, h);
    col *= 1.0 - crater * 0.42;
    col += detail * 0.05;
  }
  vec3 nrm = normalize(vNormalW);
  float ndl = clamp(dot(nrm, normalize(uSunDir)), 0.0, 1.0);
  col *= 0.15 + 0.95 * ndl;
  float rim = pow(1.0 - abs(dot(normalize(vViewW), nrm)), 3.0);
  col += uRim * rim * (0.22 + 0.78 * (1.0 - ndl));
  col *= uDim;
  gl_FragColor = vec4(col, 1.0);
}
`

// ── 程序化云层 shader ──
const CLOUD_VERT = /* glsl */ `
varying vec3 vDir;
varying vec3 vNormalW;
void main() {
  vDir = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const CLOUD_FRAG = /* glsl */ `
uniform vec3 uSeed;
uniform float uFreq;
uniform float uCover;
uniform vec3 uSunDir;
varying vec3 vDir;
varying vec3 vNormalW;
${NOISE_GLSL}

void main() {
  vec3 dir = normalize(vDir);
  float c = fbm(dir * uFreq + uSeed);
  c = fbm(dir * uFreq + uSeed + c * 1.8);
  float cloud = smoothstep(uCover - 0.14, uCover + 0.2, c);
  if (cloud < 0.012) discard;
  float ndl = clamp(dot(normalize(vNormalW), normalize(uSunDir)), 0.0, 1.0);
  float shade = 0.6 + 0.45 * ndl;
  gl_FragColor = vec4(vec3(0.93, 0.95, 1.0) * shade, cloud * 0.88);
}
`

// ── 大气散射 shader（瑞利 + 米氏，单次散射 raymarching）──
const ATMOS_VERT = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const ATMOS_FRAG = /* glsl */ `
uniform vec3 uCenter;
uniform float uPlanetR;
uniform float uAtmosR;
uniform vec3 uSunDir;
uniform vec3 uBetaR;
uniform vec3 uBetaM;
uniform float uHr;
uniform float uHm;
uniform float uIntensity;
varying vec3 vWorldPos;

vec2 raySphere(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float h = b * b - c;
  if (h < 0.0) return vec2(-1.0, -1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

void main() {
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorldPos - ro);
  vec3 oc = ro - uCenter;
  vec2 tOuter = raySphere(oc, rd, uAtmosR);
  vec2 tInner = raySphere(oc, rd, uPlanetR);
  float tStart = max(tOuter.x, 0.0);
  float tEnd = tOuter.y;
  if (tInner.x > 0.0) tEnd = min(tEnd, tInner.x);
  if (tEnd <= tStart) { gl_FragColor = vec4(0.0); return; }
  const int STEPS = 14;
  float stepLen = (tEnd - tStart) / float(STEPS);
  vec3 sunDir = normalize(uSunDir);
  float g = 0.76;
  float g2 = g * g;
  vec3 total = vec3(0.0);
  float odR = 0.0;
  float odM = 0.0;
  for (int i = 0; i < STEPS; i++) {
    vec3 p = oc + rd * (tStart + stepLen * (float(i) + 0.5));
    float h = length(p) - uPlanetR;
    float dR = exp(-h / uHr);
    float dM = exp(-h / uHm);
    odR += dR * stepLen;
    odM += dM * stepLen;
    vec3 sunT = vec3(1.0);
    vec2 tSunP = raySphere(p, sunDir, uPlanetR);
    if (tSunP.x > 0.0) {
      sunT = vec3(0.0); // 夜侧：太阳被星球遮挡
    } else {
      vec2 tSun = raySphere(p, sunDir, uAtmosR);
      if (tSun.y > 0.0) {
        float sunPath = tSun.y;
        float hMid = max(length(p + sunDir * sunPath * 0.5) - uPlanetR, 0.0);
        sunT = exp(-(uBetaR * exp(-hMid / uHr) * sunPath * 2.0 + uBetaM * exp(-hMid / uHm) * sunPath * 2.0));
      }
    }
    float mu = dot(rd, sunDir);
    float phaseR = 0.75 * (1.0 + mu * mu);
    float phaseM = 3.0 / (8.0 * 3.1415926) * (1.0 - g2) * (1.0 + mu * mu) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * mu, 1.5));
    total += sunT * (dR * phaseR * uBetaR + dM * phaseM * uBetaM) * stepLen;
  }
  vec3 trans = exp(-(odR * uBetaR * 1.4 + odM * uBetaM * 1.4));
  gl_FragColor = vec4(total * uIntensity * trans, 1.0);
}
`

// ══════════════════ 材质 uniform 构建 ═══════════════════
function buildSurfaceUniforms(s: ProceduralStyle, dimmed: boolean) {
  const cols = s.colors.map((c) => new THREE.Color(c))
  const get = (i: number) => cols[i] ?? new THREE.Color('#000000')
  return {
    uSeed: { value: new THREE.Vector3(...s.seed) },
    uFreq: { value: s.freq },
    uBands: { value: s.bands },
    uMode: { value: s.mode === 'terran' ? 0 : s.mode === 'banded' ? 1 : 2 },
    uC0: { value: get(0) }, uC1: { value: get(1) }, uC2: { value: get(2) },
    uC3: { value: get(3) }, uC4: { value: get(4) }, uC5: { value: get(5) },
    uSunDir: { value: SUN_DIR.clone() },
    uRim: { value: new THREE.Color(s.rim) },
    uDim: { value: dimmed ? 0.14 : 1 },
  }
}

function buildCloudUniforms(seed: [number, number, number], cover: number) {
  return {
    uSeed: { value: new THREE.Vector3(...seed) },
    uFreq: { value: 2.6 },
    uCover: { value: cover },
    uSunDir: { value: SUN_DIR.clone() },
  }
}

// ── 星球表面材质（可选动态光照：sunPos 每帧指向光源方向）──
export function PlanetSurface({
  style, dimmed, sunPos, meshRef,
}: {
  style: ProceduralStyle
  dimmed: boolean
  sunPos?: THREE.Vector3
  meshRef?: React.RefObject<THREE.Mesh | null>
}) {
  const uniforms = useMemo(() => buildSurfaceUniforms(style, dimmed), [style])
  const matRef = useRef<THREE.ShaderMaterial>(null)
  useEffect(() => {
    uniforms.uDim.value = dimmed ? 0.14 : 1
  }, [dimmed, uniforms])
  useFrame(() => {
    if (sunPos && matRef.current && meshRef?.current) {
      matRef.current.uniforms.uSunDir.value
        .copy(meshRef.current.getWorldPosition(new THREE.Vector3()))
        .sub(sunPos)
        .normalize()
    }
  })
  return <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={SURFACE_VERT} fragmentShader={SURFACE_FRAG} />
}

// ── 程序化云层（可选动态光照）──
export function CloudMaterial({
  seed, cover, sunPos, meshRef,
}: {
  seed: [number, number, number]
  cover: number
  sunPos?: THREE.Vector3
  meshRef?: React.RefObject<THREE.Mesh | null>
}) {
  const uniforms = useMemo(() => buildCloudUniforms(seed, cover), [seed, cover])
  const matRef = useRef<THREE.ShaderMaterial>(null)
  useFrame(() => {
    if (sunPos && matRef.current && meshRef?.current) {
      matRef.current.uniforms.uSunDir.value
        .copy(meshRef.current.getWorldPosition(new THREE.Vector3()))
        .sub(sunPos)
        .normalize()
    }
  })
  return <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={CLOUD_VERT} fragmentShader={CLOUD_FRAG} transparent depthWrite={false} />
}

// ── 散射大气壳（瑞利/米氏；uCenter 每帧同步世界位置，可选动态光照）──
export function Atmosphere({
  radius, center, rayleigh, intensity, sunPos,
}: {
  radius: number
  center: THREE.Vector3
  rayleigh: string
  intensity: number
  sunPos?: THREE.Vector3
}) {
  const atmosR = radius * 1.16
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => {
    const c = new THREE.Color(rayleigh)
    return {
      uCenter: { value: center.clone() },
      uPlanetR: { value: radius },
      uAtmosR: { value: atmosR },
      uSunDir: { value: SUN_DIR.clone() },
      uBetaR: { value: c.clone().multiplyScalar(1.25) },
      uBetaM: { value: new THREE.Vector3(0.2, 0.2, 0.2) },
      uHr: { value: (atmosR - radius) * 0.3 },
      uHm: { value: (atmosR - radius) * 0.18 },
      uIntensity: { value: intensity },
    }
  }, [radius, atmosR, rayleigh, intensity, center])
  useFrame(() => {
    if (!groupRef.current || !matRef.current) return
    const wp = groupRef.current.getWorldPosition(new THREE.Vector3())
    if (sunPos) matRef.current.uniforms.uSunDir.value.copy(wp).sub(sunPos).normalize()
    matRef.current.uniforms.uCenter.value.copy(wp)
  })
  return (
    <group ref={groupRef}>
      <mesh scale={1.16}>
        <sphereGeometry args={[radius, 48, 48]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={ATMOS_VERT}
          fragmentShader={ATMOS_FRAG}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ── 程序化星球（地表 + 云 + 大气 + 自转 + 可选动态光照）──
export function ProceduralPlanet({
  style, radius, dimmed = false, sunPos, rotationSpeed = 0.05, atmosIntensityScale = 1,
}: {
  style: ProceduralStyle
  radius: number
  dimmed?: boolean
  sunPos?: THREE.Vector3
  rotationSpeed?: number
  atmosIntensityScale?: number
}) {
  const ballRef = useRef<THREE.Mesh>(null)
  const cloudRef = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (ballRef.current) ballRef.current.rotation.y += dt * rotationSpeed
    if (cloudRef.current) cloudRef.current.rotation.y += dt * rotationSpeed * 1.6
  })
  return (
    <group>
      <mesh ref={ballRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <PlanetSurface style={style} dimmed={dimmed} sunPos={sunPos} meshRef={ballRef} />
      </mesh>
      {style.clouds !== null && !dimmed && (
        <mesh ref={cloudRef} scale={1.03}>
          <sphereGeometry args={[radius, 48, 48]} />
          <CloudMaterial seed={style.seed} cover={style.clouds} sunPos={sunPos} meshRef={cloudRef} />
        </mesh>
      )}
      {style.atmos && !dimmed && (
        <Atmosphere
          radius={radius}
          center={new THREE.Vector3(0, 0, 0)}
          rayleigh={style.atmos.rayleigh}
          intensity={style.atmos.intensity * atmosIntensityScale}
          sunPos={sunPos}
        />
      )}
    </group>
  )
}

// ══════════════════ Canvas 纹理生成（星云 / 光晕 / 衍射芒）══════════════════
export function nebulaTexture(seed: number): THREE.CanvasTexture {
  const size = 512
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')!
  const rand = mulberry32(seed)
  const palette: [number, number, number][] = [
    [74, 90, 158], [58, 122, 138], [122, 90, 150], [42, 58, 106], [90, 70, 130],
  ]
  for (let layer = 0; layer < 3; layer++) {
    const n = 16 + Math.floor(rand() * 14)
    for (let i = 0; i < n; i++) {
      const x = (rand() * 0.85 + 0.075) * size
      const y = (rand() * 0.85 + 0.075) * size
      const r = (18 + rand() * 80) * (layer * 0.55 + 0.7)
      const c = palette[Math.floor(rand() * palette.length)]!
      const a = 0.3 + rand() * 0.25
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, size, size)
    }
  }
  // 两级模糊柔化
  const soft = document.createElement('canvas')
  soft.width = soft.height = 256
  const sctx = soft.getContext('2d')!
  sctx.filter = 'blur(6px)'
  sctx.drawImage(cv, 0, 0, 256, 256)
  sctx.filter = 'blur(6px)'
  sctx.drawImage(soft, 0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(soft)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function glowTexture(): THREE.CanvasTexture {
  const size = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,244,224,0.85)')
  g.addColorStop(0.45, 'rgba(255,224,180,0.28)')
  g.addColorStop(1, 'rgba(255,210,160,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function spikeTexture(): THREE.CanvasTexture {
  const size = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')!
  const hg = ctx.createLinearGradient(0, 0, size, 0)
  hg.addColorStop(0, 'rgba(0,0,0,0)')
  hg.addColorStop(0.5, 'rgba(255,244,224,0.9)')
  hg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = hg
  ctx.fillRect(0, 124, size, 8)
  const vg = ctx.createLinearGradient(0, 0, 0, size)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(0.5, 'rgba(255,244,224,0.9)')
  vg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = vg
  ctx.fillRect(124, 0, 8, size)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
