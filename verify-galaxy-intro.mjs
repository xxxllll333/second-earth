// verify-galaxy-intro.mjs —— 银河导览自检（本次改动专用）
// 目标：捕获 shader 编译错误 / 运行时异常，并截图飞行末段 + 银河全景 + 进入行星群
// 注意：swiftshader 软件渲染 10 万点极慢，重点是 console 错误；视觉靠截图人工判断
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const W = 1600
const H = 1000
const OUT = fileURLToPath(new URL('./figma-export/', import.meta.url))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

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
  if (m.type() === 'error') {
    const t = m.text()
    errors.push('[console.error] ' + t.slice(0, 400))
    console.log('[console.error]', t.slice(0, 400))
  }
})
page.on('pageerror', (e) => {
  errors.push('[pageerror] ' + e.message.slice(0, 400))
  console.log('[pageerror]', e.message.slice(0, 400))
})

console.log('→ goto /catalog (domcontentloaded)')
await page.goto('http://localhost:5173/catalog', { waitUntil: 'domcontentloaded', timeout: 60000 })

console.log('→ 等待 WebGL 软件渲染 + shader 编译 + 飞行推进 24s')
await sleep(24000)
console.log('→ 截图 A：银河全景（飞行应已结束）')
await page.screenshot({ path: path.join(OUT, 'galaxy-01-panorama.png') })

// ── 进入行星群 ──
console.log('→ 点击「进入行星群」')
const enter = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('进入行星群'))
  if (!b) return false
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
if (enter) {
  await page.mouse.click(enter.x, enter.y)
  await sleep(14000)
  await page.screenshot({ path: path.join(OUT, 'galaxy-02-planets.png') })
} else {
  console.log('  ⚠ 未找到「进入行星群」按钮（可能仍在飞行中）')
}

// ── 重播导览：抓飞行早期字幕 ──
console.log('→ 点击「重播导览」')
const replay = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('重播导览'))
  if (!b) return false
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
if (replay) {
  await page.mouse.click(replay.x, replay.y)
  await sleep(4000)
  await page.screenshot({ path: path.join(OUT, 'galaxy-03-intro-caption.png') })
}

console.log('\n──────── 错误汇总 ────────')
if (errors.length === 0) console.log('✅ 无 console.error / pageerror（shader 编译正常）')
else {
  console.log(`❌ 共 ${errors.length} 条：`)
  errors.forEach((e) => console.log('  ' + e))
}
console.log('→ 完成')
await browser.close()
