// verify-galaxy.mjs —— 星系视图三栏工作台验证（v3：左栏目标列表 + 丝滑飞行 + 右栏数据面板）
// 1. 三栏布局：左 TARGETS 列表（28 目标分组缩略图）、中 3D 星系、右数据可视化面板
// 2. 左栏点击跨系统目标 → 场景切换 + 相机丝滑飞行聚焦（中途/到位各截一张）
// 3. 同系统内切换 + 已否决目标 → 右栏徽章/数据联动
// 4. DEV 调试探针（window.__system3dProbe）精确点击 3D 行星 → 左栏选中 + 右栏数据联动
// 5. 收集 console 错误
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const W = 1600
const H = 1000
const OUT = fileURLToPath(new URL('./figma-export/', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const errors = []
const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))

let pass = 0
let fail = 0
function check(label, cond, detail = '') {
  if (cond) { pass++; console.log(`PASS  ${label}${detail ? '  — ' + detail : ''}`) }
  else { fail++; console.log(`FAIL  ${label}${detail ? '  — ' + detail : ''}`) }
}

// ── 工具：左栏按钮定位 / 选中态 / 右栏名字 ──
async function sidebarButtons() {
  return page.evaluate(() => {
    const target = [...document.querySelectorAll('span')].find(s => s.className.includes('mono') && s.textContent.trim() === 'TARGETS')
    if (!target) return null
    const bar = target.closest('div').parentElement
    const btns = [...bar.querySelectorAll('button')]
    return btns.map(b => ({
      text: b.textContent.trim(),
      selected: (b.style.background || '').includes('0.06'),
    }))
  })
}
async function clickTarget(name) {
  return page.evaluate((n) => {
    const target = [...document.querySelectorAll('span')].find(s => s.className.includes('mono') && s.textContent.trim() === 'TARGETS')
    const bar = target.closest('div').parentElement
    const btn = [...bar.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(n))
    if (!btn) return false
    btn.click()
    return true
  }, name)
}
async function panelName() {
  return page.evaluate(() => {
    const div = [...document.querySelectorAll('div')].find(d => d.style.fontSize === '1.28rem' && d.style.letterSpacing === '0.12em')
    return div ? div.textContent.trim() : null
  })
}
async function canvasRect() {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height }
  })
}

// ── 1. 初始：/galaxy/K2-18b ──
console.log('→ goto /galaxy/K2-18b')
await page.goto('http://localhost:5175/galaxy/K2-18b', { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(26000) // shader 编译

await page.screenshot({ path: path.join(OUT, 'galaxy-v3-01-overview.png') })

const rows0 = await sidebarButtons()
check('左栏目标列表 = 28 颗', rows0?.length === 28, rows0 ? `${rows0.length} 颗` : '左栏未找到')
check('左栏选中 K2-18b', !!rows0?.find(r => r.text.startsWith('K2-18b') && r.selected))
check('左栏分组齐全', !!rows0 && rows0.length === 28)

const groups = await page.evaluate(() => {
  const target = [...document.querySelectorAll('span')].find(s => s.className.includes('mono') && s.textContent.trim() === 'TARGETS')
  const bar = target.closest('div').parentElement
  // 分组标签是 div.mono（非 span）
  return [...bar.querySelectorAll('div')].filter(d => d.className.includes('mono') && d.style.fontSize === '0.54rem').map(d => d.textContent.trim())
})
check('左栏分组标签 4 组', groups.length === 4, groups.join(' / '))

const rightChecks = await page.evaluate(() => ({
  svg: !!document.querySelector('svg'),
  metrics: ['半径', '质量', '平衡温度', '轨道周期', '距离', 'ESI 相似度'].every(l => document.body.textContent.includes(l)),
  badge: document.body.textContent.includes('争议中'),
  spectrum: document.body.textContent.includes('光谱档案'),
}))
check('右栏雷达图存在', rightChecks.svg)
check('右栏 6 项指标存在', rightChecks.metrics)
check('右栏状态徽章（争议中）', rightChecks.badge)
check('右栏光谱档案标记', rightChecks.spectrum)
check('右栏行星名 = K2-18b', (await panelName()) === 'K2-18b', await panelName())

const rect0 = await canvasRect()
await page.screenshot({ path: path.join(OUT, 'galaxy-v3-02-scene-k2.png'), clip: rect0 })

// ── 2. 左栏点击跨系统目标 TRAPPIST-1e → 相机飞行 ──
console.log('→ 左栏点击 TRAPPIST-1e（跨系统）')
check('点击 TRAPPIST-1e 成功', await clickTarget('TRAPPIST-1e'))
await sleep(2500) // 飞行途中
await page.screenshot({ path: path.join(OUT, 'galaxy-v3-03-flying.png') })
await sleep(7000) // 到位 + 新系统 shader
await page.screenshot({ path: path.join(OUT, 'galaxy-v3-04-trappist.png') })

const rows1 = await sidebarButtons()
check('左栏选中切到 TRAPPIST-1e', !!rows1?.find(r => r.text.startsWith('TRAPPIST-1e') && r.selected))
check('右栏行星名 = TRAPPIST-1e', (await panelName()) === 'TRAPPIST-1e', await panelName())
const rect1 = await canvasRect()
await page.screenshot({ path: path.join(OUT, 'galaxy-v3-05-scene-trappist.png'), clip: rect1 })

// ── 3. 同系统内切换 + 已否决目标 ──
console.log('→ 左栏点击 TRAPPIST-1d（已否决）')
check('点击 TRAPPIST-1d 成功', await clickTarget('TRAPPIST-1d'))
await sleep(3500)
check('右栏行星名 = TRAPPIST-1d', (await panelName()) === 'TRAPPIST-1d', await panelName())
const rejectedBadge = await page.evaluate(() => document.body.textContent.includes('已否决'))
check('右栏徽章切为已否决', rejectedBadge)
await page.screenshot({ path: path.join(OUT, 'galaxy-v3-06-rejected.png') })

// ── 4. 3D 场景点击联动（探针）——模拟拖拽退出聚焦 + 滚轮缩小到全景，再探针点 1g ──
console.log('→ 模拟拖拽退出聚焦 + 滚轮缩小全景')
{
  const r = await canvasRect()
  const cx = r.x + r.width / 2
  const cy = r.y + r.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 180, cy - 60, { steps: 12 })
  await page.mouse.up()
  await sleep(800)
  await page.mouse.move(cx, cy)
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel({ deltaY: -500 })
    await sleep(120)
  }
  await sleep(2500)
}

console.log('→ 探针点击 3D 行星（视口内任一非当前选中目标，公转相位稳健）')
let clicked3d = false
for (let attempt = 0; attempt < 6 && !clicked3d; attempt++) {
  const probe = await page.evaluate(() => (window.__system3dProbe ? window.__system3dProbe() : null))
  const rect = await canvasRect()
  const current = await panelName()
  const candidates = (probe || []).filter(p => p.name !== current && Math.abs(p.nx) < 0.9 && Math.abs(p.ny) < 0.9)
  for (const c of candidates) {
    const x = rect.x + (c.nx * 0.5 + 0.5) * rect.width
    const y = rect.y + (1 - (c.ny * 0.5 + 0.5)) * rect.height
    console.log(`  → 点击 ${c.name} @ (${x.toFixed(0)}, ${y.toFixed(0)})`)
    await page.mouse.click(x, y)
    await sleep(1200)
    if ((await panelName()) === c.name) { clicked3d = true; break }
  }
  if (!clicked3d) await sleep(2000)
}
check('点击 3D 行星联动右栏', clicked3d)
const rows2 = await sidebarButtons()
const finalName = await panelName()
check('点击 3D 行星联动左栏选中', !!rows2?.find(r => r.selected && r.text.startsWith(finalName)), finalName ?? '无')
await page.screenshot({ path: path.join(OUT, 'galaxy-v3-07-after-3d-click.png') })

// ── 5. 汇总 ──
console.log('→ console 错误数:', errors.length)
for (const e of errors) console.log('  [error]', e)
check('无 console 错误', errors.length === 0)
console.log(`\n===== 验证结果：${pass}/${pass + fail} 通过 =====`)
await browser.close()
