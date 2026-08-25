// 临时截图脚本：导出所有页面截图供 Figma 导入（用完即删）
// 用法：node screenshot-export.mjs
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const BASE = 'http://localhost:5173'
const OUT = fileURLToPath(new URL('./figma-export/', import.meta.url))

mkdirSync(OUT, { recursive: true })

// [文件名, 路由, 滚动定位文本（null=首屏）]
const shots = [
  ['01_journey_hero', '/', null],
  ['02_journey_intro', '/', '每一颗系外行星'],
  ['03_journey_k2-18b', '/', 'K2-18b'],
  ['04_journey_trappist-1e', '/', 'TRAPPIST-1e'],
  ['05_journey_wasp-96b', '/', 'WASP-96b'],
  ['06_journey_wd1856b', '/', 'WD 1856b'],
  ['07_journey_cta', '/', '进入星表'],
  ['08_catalog', '/catalog', null],
  ['09_galaxy', '/galaxy', null],
  ['10_spectrum', '/spectrum', null],
  ['11_spectrum_k2-18b', '/spectrum/K2-18b', null],
  ['12_evolution', '/evolution', null],
  ['13_mystars', '/mystars', null],
]

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--window-size=1440,900', '--hide-scrollbars', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

for (const [name, route, scrollText] of shots) {
  await page.goto(BASE + route, { waitUntil: 'networkidle0', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 2500)) // 等待 3D 球渲染

  if (scrollText) {
    // 按文本定位元素并滚动到视口居中
    const found = await page.evaluate((text) => {
      const all = [...document.querySelectorAll('h1,h2,h3,p,span,button,div')]
      const el = all.find(
        (n) => n.children.length === 0 && n.textContent && n.textContent.trim().startsWith(text),
      )
      if (el) {
        el.scrollIntoView({ block: 'center' })
        return true
      }
      return false
    }, scrollText)
    if (!found) {
      console.warn('  ! 文本未精确匹配，用包含匹配重试：' + scrollText)
      await page.evaluate((text) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let node
        while ((node = walker.nextNode())) {
          if (node.textContent && node.textContent.includes(text)) {
            node.parentElement.scrollIntoView({ block: 'center' })
            break
          }
        }
      }, scrollText)
    }
    await new Promise((r) => setTimeout(r, 1800)) // 等待 whileInView 动画完成
  }

  await page.screenshot({ path: `${OUT}\\${name}.png` })
  console.log('OK ' + name)
}

await browser.close()
console.log('DONE -> ' + OUT)
