// verify-closeup.mjs —— 特写视觉检查：全景 + 滚轮放大 K2-18b 特写
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as THREE from 'three'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const W = 1600
const H = 1000
const OUT = fileURLToPath(new URL('./figma-export/', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 复刻布局计算 K2-18b 屏幕位置（与 verify-catalog.mjs 相同）
function seededRandom(seed) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    return h / 0x7fffffff
  }
}
function planetWorldPos(name, idx) {
  const t = idx / 27
  const angle = t * Math.PI * 4.6 + 0.6
  const radius = 7 + t * 30
  const rand = seededRandom(name)
  const x = Math.cos(angle) * radius + (rand() - 0.5) * 1.6
  const z = Math.sin(angle) * radius + (rand() - 0.5) * 1.6
  const y = (rand() - 0.5) * 6 + (t - 0.5) * 2.5
  return new THREE.Vector3(x, y, z)
}
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
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)) })
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)))

console.log('→ goto /catalog')
await page.goto('http://localhost:5175/catalog', { waitUntil: 'domcontentloaded', timeout: 60000 })
console.log('→ 等待渲染 26s')
await sleep(26000)

console.log('→ 截图：全景')
await page.screenshot({ path: path.join(OUT, 'catalog-3d-10-wide.png') })

// 点击 K2-18b → 相机聚焦飞近
const k2 = toScreen(planetWorldPos('K2-18b', 0))
console.log(`→ 点击 K2-18b @ (${k2.x.toFixed(0)}, ${k2.y.toFixed(0)}) 触发聚焦飞近`)
await page.mouse.click(k2.x, k2.y)
await sleep(11000)

// 移开鼠标（hover 卡消失）
await page.mouse.move(60, 900)
await sleep(1200)

// 隐藏详情弹窗与「回到总览」按钮，露出特写星球
await page.evaluate(() => {
  const hide = (el) => { if (el) (el).style.display = 'none' }
  for (const el of Array.from(document.querySelectorAll('div, button'))) {
    const st = getComputedStyle(el)
    if (st.position === 'fixed' && st.inset === '0px' && st.backgroundColor.includes('0.55')) hide(el)
    if (el.tagName === 'BUTTON' && (el.textContent ?? '').includes('回到总览')) hide(el)
  }
})
await sleep(2500)

console.log('→ 截图：K2-18b 特写整屏')
await page.screenshot({ path: path.join(OUT, 'catalog-3d-12-zoomed.png') })

// 特写区域放大裁剪
await page.screenshot({
  path: path.join(OUT, 'catalog-3d-11-k2-closeup.png'),
  clip: { x: W / 2 - 420, y: H / 2 - 420, width: 840, height: 840 },
})

console.log('→ 完成')
await browser.close()
