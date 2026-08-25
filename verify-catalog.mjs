// verify-catalog.mjs —— 星表 3D 视图交互验证
// 1. 总览截图  2. hover 星球  3. 点击星球（详情弹窗 + 相机飞近）  4. 回到总览  5. 筛选联动
// 注意：Vite HMR websocket 导致 networkidle0 永不触发，须用 domcontentloaded + 固定等待
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as THREE from 'three'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const W = 1600
const H = 1000
const OUT = fileURLToPath(new URL('./figma-export/', import.meta.url))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 复刻 Catalog3D.tsx 的确定性布局 ──
function seededRandom(seed) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    return h / 0x7fffffff
  }
}

const NAMES = [
  'K2-18b', 'TRAPPIST-1e', 'TRAPPIST-1f', 'TRAPPIST-1g', 'WD 1856b',
  'TRAPPIST-1d', 'TRAPPIST-1b', 'TRAPPIST-1c',
  'LHS 1140b', 'Proxima b', 'TOI-700d', 'GJ 1061d', 'Kepler-452b',
  'WASP-96b', 'WASP-39b', 'HD 189733b', 'GJ 1214b', 'LTT 9779b', '55 Cnc e',
  'GJ 667Cc', 'Kepler-186f', 'Ross 128b', 'Teegarden b', 'GJ 1002b',
  'WASP-12b', 'WASP-17b', 'HD 209458b', 'Kepler-7b',
]

function planetWorldPos(name) {
  const i = NAMES.indexOf(name)
  const total = NAMES.length
  const t = i / Math.max(total - 1, 1)
  const angle = t * Math.PI * 4.6 + 0.6
  const radius = 7 + t * 30
  const rand = seededRandom(name)
  const x = Math.cos(angle) * radius + (rand() - 0.5) * 1.6
  const z = Math.sin(angle) * radius + (rand() - 0.5) * 1.6
  const y = (rand() - 0.5) * 6 + (t - 0.5) * 2.5
  return new THREE.Vector3(x, y, z)
}

// ── 初始相机 [0,26,42] 看向原点（与组件一致）→ 屏幕坐标 ──
function toScreen(worldPos) {
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000)
  cam.position.set(0, 26, 42)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld()
  const v = worldPos.clone().project(cam)
  return { x: (v.x * 0.5 + 0.5) * W, y: (1 - (v.y * 0.5 + 0.5)) * H }
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
  ],
})

const page = await browser.newPage()
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })

page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300))
})
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)))

console.log('→ goto /catalog (domcontentloaded)')
await page.goto('http://localhost:5175/catalog', { waitUntil: 'domcontentloaded', timeout: 60000 })
console.log('→ 等待 WebGL 软件渲染 + shader 编译 26s')
await sleep(26000)

console.log('→ 截图 1：总览')
await page.screenshot({ path: path.join(OUT, 'catalog-3d-01-overview.png') })

// ── hover K2-18b（内环第一颗）──
const k2 = toScreen(planetWorldPos('K2-18b'))
console.log(`→ hover K2-18b @ (${k2.x.toFixed(0)}, ${k2.y.toFixed(0)})`)
await page.mouse.move(k2.x, k2.y)
await sleep(2500)
await page.screenshot({ path: path.join(OUT, 'catalog-3d-02-hover.png') })

// ── 点击 K2-18b → 详情弹窗 + 相机飞近 ──
console.log('→ click K2-18b')
await page.mouse.click(k2.x, k2.y)
await sleep(8000)
await page.screenshot({ path: path.join(OUT, 'catalog-3d-03-focused.png') })

// ── 回到总览 ──
console.log('→ 点击「回到总览」')
const backBtn = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find((x) => x.textContent?.includes('回到总览'))
  if (!b) return false
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
if (backBtn) {
  await page.mouse.click(backBtn.x, backBtn.y)
  await sleep(7000)
  await page.screenshot({ path: path.join(OUT, 'catalog-3d-04-reset.png') })
} else {
  console.log('  ⚠ 未找到「回到总览」按钮')
}

// ── 筛选联动：只看宜居带 ──
console.log('→ 勾选「只看宜居带行星」')
await page.click('input[type=checkbox]')
await sleep(3000)
await page.screenshot({ path: path.join(OUT, 'catalog-3d-05-habitable-filter.png') })

// ── 筛选联动：类别「候选宜居」 ──
console.log('→ 点击类别「候选宜居」')
const catBtn = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === '候选宜居')
  if (!b) return false
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
if (catBtn) {
  await page.mouse.click(catBtn.x, catBtn.y)
  await sleep(3000)
  await page.screenshot({ path: path.join(OUT, 'catalog-3d-06-category-filter.png') })
} else {
  console.log('  ⚠ 未找到类别按钮')
}

console.log('→ 完成')
await browser.close()
