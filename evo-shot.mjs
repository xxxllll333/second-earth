// 临时截图脚本：验证 /evolution 3D 演化页恒星视觉（细节/色彩）+ A/C 呼应文案
import puppeteer from 'puppeteer-core'
import fs from 'fs'

if (!fs.existsSync('figma-export')) fs.mkdirSync('figma-export')

const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--disable-gpu', '--no-sandbox', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 940, deviceScaleFactor: 1.5 })

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)))

await page.goto('http://localhost:5173/evolution', { waitUntil: 'domcontentloaded', timeout: 60000 })
await new Promise((r) => setTimeout(r, 7000))

async function clickStage(i) {
  await page.evaluate((idx) => {
    const dots = Array.from(document.querySelectorAll('button')).filter((b) => /R☉/.test(b.textContent || ''))
    dots[idx]?.click()
  }, i)
  await new Promise((r) => setTimeout(r, 4000))
}

const stages = [
  { i: 1, name: '1-main' },
  { i: 2, name: '2-redgiant' },
  { i: 3, name: '3-whitedwarf' },
  { i: 0, name: '0-young' },
]
for (const s of stages) {
  await clickStage(s.i)
  await page.screenshot({ path: `figma-export/evo-${s.name}.png` })
  console.log('SHOT', s.name)
}

await clickStage(1)
await page.screenshot({ path: 'figma-export/evo-fullpage.png', fullPage: true })
console.log('ERRORS:', errors.length ? errors.join('\n') : 'NONE')

await browser.close()
console.log('DONE')
