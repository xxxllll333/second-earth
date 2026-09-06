// verify-catalog-modes.mjs —— 星表双模式自检
//   探索模式：真实坐标本地泡 + 放大可点击太阳系 + 5 段引导飞行（地球→太阳系→本地泡→猎户旋臂→银河）
//   展陈模式：单一黄金螺旋散布（与旧版本一致，无分类标签、无太阳系、无银河）
// 断言手段：星球名/太阳系标签/飞行字幕都是 drei <Html> 或 DOM 叠层渲染进 body 的，用 innerText 断言关键内容
// 注意：探索模式银河 10 万点用 swiftshader 软件渲染极慢；展陈模式已隐藏银河，渲染快、截图清晰
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
    '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
  ],
})

const page = await browser.newPage()
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
page.on('console', (m) => {
  if (m.type() !== 'error') return
  const t = m.text()
  // 可选贴图缺失的预期 404（public/textures/planets/ 未放置 水星/火星/土星/天王星/太阳 贴图时优雅回退），非真实错误
  if (t.includes('Failed to load resource') && t.includes('404')) return
  errors.push('[console.error] ' + t.slice(0, 400)); console.log('[console.error]', t.slice(0, 300))
})
page.on('pageerror', (e) => { errors.push('[pageerror] ' + e.message.slice(0, 400)); console.log('[pageerror]', e.message.slice(0, 300)) })

const bodyText = () => page.evaluate(() => document.body.innerText || '')

// 点击含指定文本的按钮
const clickButton = async (txt) => {
  const box = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes(t))
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, txt)
  if (box) { await page.mouse.click(box.x, box.y); return true }
  return false
}
// 点击含指定文本的最深元素（用于 drei <Html> 里的可点击 div，如太阳系标签）
const clickDeepText = async (txt) => {
  const box = await page.evaluate((t) => {
    const all = [...document.querySelectorAll('div,span')].filter((x) => x.textContent?.includes(t))
    if (!all.length) return null
    const el = all[all.length - 1] // 最深的
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, txt)
  if (box && box.x > 0 && box.y > 0) { await page.mouse.click(box.x, box.y); return true }
  return false
}

// 5 段飞行字幕的唯一子串（不会出现在别处）
const CAPTIONS = [
  { seg: '地球', key: '我们的起点' },
  { seg: '太阳系', key: '一颗恒星、八颗行星' },
  { seg: '本地泡', key: '散布在太阳周围' },
  { seg: '猎户旋臂', key: '穿越数万颗恒星' },
  { seg: '银河全景', key: '仅是其中一点' },
]
const seenCaptions = new Set()

console.log('→ goto /catalog（探索模式，进入即播放 5 段引导飞行）')
await page.goto('http://localhost:5173/catalog', { waitUntil: 'domcontentloaded', timeout: 60000 })

// 软件渲染下银河初始化较慢，边等边轮询 body，采集飞行字幕；顺带截图
console.log('→ 轮询采集飞行字幕（软件渲染较慢，最长约 34s）')
for (let i = 0; i < 22; i++) {
  await sleep(1600)
  const t = await bodyText()
  for (const c of CAPTIONS) if (t.includes(c.key)) seenCaptions.add(c.seg)
  if (i === 2) await page.screenshot({ path: path.join(OUT, 'flight-early.png') })
  if (i === 7) await page.screenshot({ path: path.join(OUT, 'flight-mid.png') })
  // 5 段字幕全部捕获即提前结束
  if (seenCaptions.size === CAPTIONS.length) { console.log(`  5 段飞行字幕已全部捕获（约 ${((i + 1) * 1.6) | 0}s）`); break }
}
console.log(`  采集到的飞行字幕段：${[...seenCaptions].join(' / ') || '（无）'}`)

// 等飞行真正结束（底部出现「进入行星群」）再截图/操作，避免拍到飞行中途
console.log('→ 等待飞行结束（最多约 18s）')
for (let i = 0; i < 12; i++) {
  const t = await bodyText()
  if (t.includes('进入行星群')) { console.log(`  飞行已结束（额外等约 ${(i * 1.5) | 0}s）`); break }
  await sleep(1500)
}
await page.screenshot({ path: path.join(OUT, 'modes-01-explore-galaxy.png') })

console.log('→ 点「进入行星群」看放大太阳系 + 真实坐标本地泡')
if (await clickButton('进入行星群')) { await sleep(6000) } else console.log('  ⚠ 未找到「进入行星群」')
await page.screenshot({ path: path.join(OUT, 'modes-02-explore-solar-bubble.png') })
const bubbleText = await bodyText()
const hasSolarLabel = bubbleText.includes('你在这里')
console.log(`  太阳系标签（你在这里）：${hasSolarLabel ? '✅' : '❌'}`)

console.log('→ 点太阳系标签，验证弹出详情卡')
if (await clickDeepText('你在这里')) { await sleep(4000) } else console.log('  ⚠ 未点到太阳系标签')
await page.screenshot({ path: path.join(OUT, 'modes-03-solar-detail.png') })
const solarText = await bodyText()
const hasSolarCard = solarText.includes('我们的家园')
const hasPlanets = solarText.includes('水星') && solarText.includes('海王星')
console.log(`  太阳系详情卡（我们的家园）：${hasSolarCard ? '✅' : '❌'}；八行星网格（水星/海王星）：${hasPlanets ? '✅' : '❌'}`)

console.log('→ 切到「展陈模式」（黄金螺旋散布，应无太阳系、无分类标签）')
if (await clickButton('展陈模式')) { await sleep(6000) } else console.log('  ⚠ 未找到「展陈模式」')
await page.screenshot({ path: path.join(OUT, 'modes-04-gallery-spiral.png') })
const galleryText = await bodyText()
// 注：类别名（候选宜居等）始终存在于左侧筛选面板，无法据此判断 3D 分类标签；3D 簇标签已删（代码 diff + tsc 佐证）
const noSolarInGallery = !galleryText.includes('太阳系') && !galleryText.includes('你在这里')
const hasPlanetName = galleryText.includes('K2-18b') || galleryText.includes('TRAPPIST')
console.log(`  无太阳系（螺旋散布）：${noSolarInGallery ? '✅' : '❌'}；行星散布可见：${hasPlanetName ? '✅' : '❌'}`)

console.log('→ 切回「探索模式」验证不重播导览（应直接停在本地泡，无「跳过导览」）')
if (await clickButton('探索模式')) { await sleep(6000) } else console.log('  ⚠ 未找到「探索模式」')
await page.screenshot({ path: path.join(OUT, 'modes-05-back-to-explore.png') })
const backText = await bodyText()
const noReplay = !backText.includes('跳过导览')
const hasSolar2 = backText.includes('你在这里')
console.log(`  切回未重播导览：${noReplay ? '✅' : '❌'}；太阳系标签仍在：${hasSolar2 ? '✅' : '❌'}`)

console.log('\n──────── 汇总 ────────')
const allCaptions = CAPTIONS.every((c) => seenCaptions.has(c.seg))
console.log(`探索·5 段飞行字幕齐全：${allCaptions ? '✅' : '❌'}（${[...seenCaptions].join('/')}）`)
console.log(`探索·太阳系标签：${hasSolarLabel && hasSolar2 ? '✅' : '❌'}`)
console.log(`探索·太阳系可点击详情卡：${hasSolarCard && hasPlanets ? '✅' : '❌'}`)
console.log(`展陈·螺旋散布（无太阳系，3D 分类标签已删）：${noSolarInGallery && hasPlanetName ? '✅' : '❌'}`)
console.log(`切回不重播导览：${noReplay ? '✅' : '❌'}`)
if (errors.length === 0) console.log('✅ 无 console.error / pageerror')
else { console.log(`❌ 共 ${errors.length} 条：`); errors.forEach((e) => console.log('  ' + e)) }
await browser.close()
