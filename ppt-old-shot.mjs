// 临时截图脚本：PPT 迭代对比用——旧版 2D 演化页
// 旧代码来自 git worktree（b989492，3D 重写前的提交版），跑在 5175 端口
import puppeteer from 'puppeteer-core'

const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--disable-gpu', '--no-sandbox', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 940, deviceScaleFactor: 1.5 })

await page.goto('http://localhost:5175/evolution', { waitUntil: 'domcontentloaded', timeout: 60000 })
await new Promise((r) => setTimeout(r, 5000))

// 老页面底部是标准 range 滑块：用原生 setter + input 事件驱动 React 状态
async function setProgress(v) {
  await page.evaluate((val) => {
    const el = document.querySelector('input[type="range"]')
    if (!el) return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, String(val))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, v)
  await new Promise((r) => setTimeout(r, 900))
}

const shots = [
  { v: 0, name: 'old-evo-0-young' },
  { v: 0.33, name: 'old-evo-1-main' },
  { v: 0.66, name: 'old-evo-2-redgiant' },
  { v: 1, name: 'old-evo-3-whitedwarf' },
]
for (const s of shots) {
  await setProgress(s.v)
  await page.screenshot({ path: `figma-export/ppt/${s.name}.png` })
  console.log('SHOT', s.name)
}
await setProgress(0.33)
await page.screenshot({ path: 'figma-export/ppt/old-evo-fullpage.png', fullPage: true })
console.log('DONE')

await browser.close()
