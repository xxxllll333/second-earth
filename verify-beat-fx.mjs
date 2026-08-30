// verify-beat-fx.mjs —— rejected 状态视觉诊断
// 滚到 TRAPPIST-1d → 点击证伪拍 → 等 3s → 截 canvas 区域 + 像素采样
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUT = fileURLToPath(new URL('./figma-export/', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })

await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(4000)

// 滚到 TRAPPIST-1d（第 2 个含 canvas 的 section）
await page.evaluate(() => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  secs[1].scrollIntoView({ block: 'center' })
})
await sleep(6000) // shader 编译

// 点击证伪拍（第 3 个时间轴行按钮）
await page.evaluate(() => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  const rows = [...secs[1].querySelectorAll('button')].filter(b => b.querySelector('.mono') && b.children.length >= 2)
  rows[2].click()
})
await sleep(3000) // 等红叉盖章动画完成

// 截 canvas 区域（clip 用页面坐标：rect + scrollY）
const rect = await page.evaluate(() => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  const r = secs[1].querySelector('canvas').getBoundingClientRect()
  return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height, vx: r.x, vy: r.y }
})
console.log('canvas rect:', JSON.stringify(rect))
const buf = await page.screenshot({ clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } })
fs.writeFileSync(path.join(OUT, 'beat-rejected-canvas.png'), buf)

// 像素采样：在页面内解码 puppeteer 截图 buffer（WebGL canvas 无 preserveDrawingBuffer，不可直接 toDataURL）
const stats = await page.evaluate(async (url) => {
  const img = new Image()
  img.src = url
  await new Promise((res) => { img.onload = res })
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height).data
  let redPx = 0, brightPx = 0, total = c.width * c.height, sum = 0
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    sum += (r + g + b) / 3
    if (r > 90 && r > g * 1.8 && r > b * 1.8) redPx++
    if (r + g + b > 180) brightPx++
  }
  return { avgLum: (sum / total).toFixed(1), redPx, brightPx, total }
}, 'data:image/png;base64,' + buf.toString('base64'))
console.log('像素统计:', JSON.stringify(stats))
console.log('console 错误:', errors.length ? errors.slice(0, 3) : '无')

await browser.close()
