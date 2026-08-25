// verify-multi-canvas.mjs —— 多 canvas 渲染对照诊断
// 依次滚到每个故事章节，采样各自 canvas 的亮度/红色像素
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

await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(3000)

async function sample(idx, label, save = false) {
  const clip = await page.evaluate((i) => {
    const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
    const r = secs[i].querySelector('canvas').getBoundingClientRect()
    return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height }
  }, idx)
  const buf = await page.screenshot({ clip })
  if (save) fs.writeFileSync(path.join(OUT, `multi-${label}.png`), buf)
  const stats = await page.evaluate(async (url) => {
    const img = new Image()
    img.src = url
    await new Promise((res) => { img.onload = res })
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
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
  console.log(`[${label}] idx=${idx}`, JSON.stringify(stats))
}

// 1. 页面加载后 3s，直接采样所有 canvas（不滚动）
console.log('— 加载 3s 后，各 canvas 原位采样（均不在视口） —')
for (let i = 0; i < 5; i++) await sample(i, `t3s-canvas${i}`)

// 2. 滚到 K2-18b（idx 0），等 12s，采样它 + 其他
console.log('— 滚到 K2-18b 等 12s —')
await page.evaluate(() => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  secs[0].scrollIntoView({ block: 'center' })
})
await sleep(12000)
await sample(0, 'k2-after12s', true)

// 3. 滚到 TRAPPIST-1d（idx 1），等 8s，采样
console.log('— 滚到 TRAPPIST-1d 等 8s —')
await page.evaluate(() => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  secs[1].scrollIntoView({ block: 'center' })
})
await sleep(8000)
await sample(1, 't1d-after8s', true)

console.log('console 错误:', errors.length ? errors.slice(0, 5) : '无')
await browser.close()
