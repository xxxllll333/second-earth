// verify-cross-debug.mjs —— 红叉 Sprite 白色覆盖问题诊断
// 点击证伪拍后每 400ms 采样一次 canvas，观察白色出现时间线
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
  args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))

await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(4000)
await page.evaluate(() => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  secs[1].scrollIntoView({ block: 'center' })
})
await sleep(30000) // 长等待：验证是否 shader 编译时序问题

async function sampleCanvas(label, save = false) {
  const clip = await page.evaluate(() => {
    const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
    const r = secs[1].querySelector('canvas').getBoundingClientRect()
    return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height }
  })
  const buf = await page.screenshot({ clip })
  if (save) fs.writeFileSync(path.join(OUT, `cross-debug-${label}.png`), buf)
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
  console.log(`[${label}]`, JSON.stringify(stats))
  return { buf, stats }
}

console.log('— 点击证伪拍前 —')
await sampleCanvas('before', true)

await page.evaluate(() => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  const rows = [...secs[1].querySelectorAll('button')].filter(b => b.querySelector('.mono') && b.children.length >= 2)
  rows[2].click()
})
console.log('— 点击证伪拍后 —')
for (const [label, ms] of [['+0.4s', 400], ['+0.8s', 400], ['+1.5s', 700], ['+3s', 1500], ['+5s', 2000], ['+25s', 20000]]) {
  await sleep(ms)
  await sampleCanvas(label, label === '+25s')
}

console.log('console 错误:', errors.length ? errors.slice(0, 3) : '无')
await browser.close()
