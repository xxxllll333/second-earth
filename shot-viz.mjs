// 涓存椂鎴浘鑴氭湰锛氶獙璇?/viz-demo 婕旂ず椤靛悇缁勪欢娓叉煋鏁堟灉
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import fs from 'fs'

const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--disable-gpu', '--no-sandbox', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 2200 })

const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)))

await page.goto('http://localhost:5174/viz-demo', { waitUntil: 'domcontentloaded', timeout: 60000 })
await new Promise((r) => setTimeout(r, 6000))

// 鍏ㄩ〉鎴浘锛堝洓娈电粍浠堕兘瑕侊級
await page.screenshot({ path: 'figma-export/viz-demo-full.png', fullPage: true })

// 妫€鏌ュ悇缁勪欢 canvas 鏄惁娓叉煋
const probe = await page.evaluate(() => {
  const canvases = Array.from(document.querySelectorAll('canvas')).map((c) => ({ w: c.width, h: c.height }))
  const svgs = document.querySelectorAll('svg').length
  const sections = Array.from(document.querySelectorAll('div')).filter((d) => d.textContent === 'AURORA').length
  return { canvasCount: canvases.length, canvases, svgCount: svgs, auroraTitle: sections }
})
console.log('PROBE:', JSON.stringify(probe, null, 2))
console.log('ERRORS:', errors.length ? errors.join('\n') : 'NONE')

await browser.close()
console.log('DONE')

