// verify-journey.mjs —— 旅程页人文叙事验证
// 1. 序章「为什么寻找第二地球」渲染与逐行浮现动画
// 2. K2-18b 章节：三拍时间轴自动播放（2.6s/拍）+ StatusBadge 状态徽章
// 3. 点击时间轴节点：详情卡展开/收起 + BEAT_LABEL 切换 + 自动播放永久接管
// 4. TRAPPIST-1d 章节：证伪拍点击联动（3D 球体褪色状态截图确认）
// 5. 收集 console 错误
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const W = 1600
const H = 1000
const OUT = fileURLToPath(new URL('./figma-export/', import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const results = []
function ok(name, cond, extra = '') {
  results.push({ name, pass: !!cond, extra })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)
}

const errors = []
const notFound = []
const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))
page.on('response', (r) => { if (r.status() === 404) notFound.push(r.url()) })

// ── 页面内工具：故事章节（含 canvas 的 section）状态快照 ──
const BEAT_STATE_FN = `(() => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  return secs.map(s => {
    const name = s.querySelector('h2')?.textContent?.trim() || ''
    const rows = [...s.querySelectorAll('button')].filter(b => b.querySelector('.mono') && b.children.length >= 2)
    const badge = [...s.querySelectorAll('span')].map(x => x.textContent.trim()).find(t => ['争议中','稳健','已否决'].includes(t)) || null
    const para = s.querySelector('p')
    return {
      name,
      badge,
      paraLen: para ? para.textContent.length : -1,
      paraTrunc: para ? para.textContent.includes('…') : false,
      paraText: para ? para.textContent.slice(0, 30) : '',
      beats: rows.map(b => {
        const mono = b.querySelector('.mono')
        return {
          year: mono.textContent.trim(),
          title: mono.nextElementSibling?.textContent?.trim() || '',
          active: mono.style.color === 'rgb(255, 255, 255)',
        }
      }),
    }
  })
})()`

const beatStates = () => page.evaluate(BEAT_STATE_FN)
const scrollToStory = (i) => page.evaluate((idx) => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  if (!secs[idx]) return false
  secs[idx].scrollIntoView({ block: 'center' })
  return true
}, i)
const clickBeat = (storyIdx, beatIdx) => page.evaluate(([si, bi]) => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  const rows = [...secs[si].querySelectorAll('button')].filter(b => b.querySelector('.mono') && b.children.length >= 2)
  if (!rows[bi]) return false
  rows[bi].click()
  return true
}, [storyIdx, beatIdx])
const clickExpand = (storyIdx) => page.evaluate((si) => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  const sp = [...secs[si].querySelectorAll('span')].find(s => s.textContent.includes('展开全文'))
  if (!sp) return false
  sp.click()
  return true
}, storyIdx)
const hasGuideHint = (storyIdx) => page.evaluate((si) => {
  const secs = [...document.querySelectorAll('section')].filter(s => s.querySelector('canvas'))
  return secs[si]?.textContent.includes('点击时间轴任意节点') ?? false
}, storyIdx)

console.log('→ goto /（旅程页）')
await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(3000)

// ── 1. HERO + 序章 ──
console.log('→ 截图 1：HERO')
await page.screenshot({ path: path.join(OUT, 'journey-01-hero.png') })

console.log('→ 滚动到序章「为什么寻找第二地球」')
const prologueFound = await page.evaluate(() => {
  const sec = [...document.querySelectorAll('section')].find(s => s.textContent.includes('Why A Second Earth'))
  if (!sec) return false
  sec.scrollIntoView({ block: 'center' })
  return true
})
ok('序章 section 存在', prologueFound)
await sleep(6500) // 等逐行浮现动画（最后一行 delay 5.4s）
console.log('→ 截图 2：序章')
await page.screenshot({ path: path.join(OUT, 'journey-02-prologue.png') })

// ── 2. K2-18b 章节：自动播放 ──
console.log('→ 滚动到 K2-18b 章节')
const s0 = await scrollToStory(0)
ok('第 1 个故事章节可滚动', s0)
await sleep(2000) // onViewportEnter 触发 + 自动播放启动

const t0 = await beatStates()
ok('故事章节数量 = 5', t0.length === 5, `实际 ${t0.length}`)
ok('K2-18b 章节标题', t0[0]?.name === 'K2-18b', `实际 "${t0[0]?.name}"`)
ok('K2-18b 时间轴三节点', t0[0]?.beats.length === 3, `实际 ${t0[0]?.beats.length}（${t0[0]?.beats.map(b => b.year).join('/')}）`)
ok('K2-18b 状态徽章=争议中', t0[0]?.badge === '争议中', `实际 "${t0[0]?.badge}"`)
ok('自动播放起点：第 1 拍 active', t0[0]?.beats[0]?.active === true,
  `第1拍=${t0[0]?.beats[0]?.active} 第2拍=${t0[0]?.beats[1]?.active} 第3拍=${t0[0]?.beats[2]?.active}`)

await sleep(2600) // 再等一个周期
const t1 = await beatStates()
const idx1 = t1[0]?.beats.findIndex(b => b.active) ?? -1
ok('自动播放推进（离开第 1 拍）', idx1 >= 1,
  `当前第 ${idx1 + 1} 拍（1=${t1[0]?.beats[0]?.active} 2=${t1[0]?.beats[1]?.active} 3=${t1[0]?.beats[2]?.active}）`)

await sleep(5200) // 再等两个周期（容忍 headless 下 interval 回调积压）
const t2 = await beatStates()
ok('自动播放到达终点第 3 拍', t2[0]?.beats[2]?.active === true,
  `第3拍=${t2[0]?.beats[2]?.active}`)
await sleep(3000) // 等 3D 球体 shader 编译完成再截图
console.log('→ 截图 3：K2-18b 章节（自动播放至第 3 拍）')
await page.screenshot({ path: path.join(OUT, 'journey-03-k2-auto.png') })

// ── 3. 交互可发现性：引导提示 + 展开按钮 + 时间轴点击 + 接管 ──
const pre = await beatStates()
ok('点击前文案为摘要截断', pre[0]?.paraTrunc === true && pre[0]?.paraLen < 60, `长度 ${pre[0]?.paraLen}`)
ok('首次引导提示存在', await hasGuideHint(0))

// 路径 1：点击卡片"展开全文"按钮
await clickExpand(0)
await sleep(800)
const post = await beatStates()
ok('展开按钮点击后详情展开（全文无截断）', post[0]?.paraTrunc === false && post[0]?.paraLen > 80, `长度 ${post[0]?.paraLen}`)
console.log('→ 截图 4：K2-18b 点击展开全文详情卡')
await page.screenshot({ path: path.join(OUT, 'journey-04-k2-detail.png') })

// 路径 2：点击时间轴第 1 拍（跳拍 + 接管 + 提示消失）
await clickBeat(0, 0)
await sleep(800)
const post2 = await beatStates()
ok('点击时间轴节点跳拍', post2[0]?.beats[0]?.active === true, `第1拍=${post2[0]?.beats[0]?.active}`)
ok('交互后引导提示消失', !(await hasGuideHint(0)))

await sleep(3200)
const t3 = await beatStates()
ok('点击后永久接管（拍不再自动推进）', t3[0]?.beats[0]?.active === true && t3[0]?.beats[1]?.active === false,
  `第1拍=${t3[0]?.beats[0]?.active} 第2拍=${t3[0]?.beats[1]?.active}`)

// 同拍再点收起
await clickBeat(0, 0)
await sleep(600)
const t4 = await beatStates()
ok('再次点击同一拍收起详情', t4[0]?.paraTrunc === true, `长度 ${t4[0]?.paraLen}`)

// ── 4. TRAPPIST-1d 章节：证伪拍 ──
console.log('→ 滚动到 TRAPPIST-1d 章节')
await scrollToStory(1)
await sleep(5000)
const d0 = await beatStates()
ok('TRAPPIST-1d 章节标题', d0[1]?.name === 'TRAPPIST-1d', `实际 "${d0[1]?.name}"`)
ok('TRAPPIST-1d 状态徽章=已否决', d0[1]?.badge === '已否决', `实际 "${d0[1]?.badge}"`)
console.log('→ 截图 5：TRAPPIST-1d 章节（证伪故事，自动播放中）')
await page.screenshot({ path: path.join(OUT, 'journey-05-trappist1d-auto.png') })

await clickBeat(1, 2) // 点击「证伪」拍
await sleep(1200)
const d1 = await beatStates()
ok('点击证伪拍后 active', d1[1]?.beats[2]?.active === true)
ok('证伪拍详情展开', d1[1]?.paraTrunc === false && d1[1]?.paraLen > 60, `长度 ${d1[1]?.paraLen}`)
console.log('→ 截图 6：TRAPPIST-1d 证伪拍（3D 球体应褪色灰暗）')
await page.screenshot({ path: path.join(OUT, 'journey-06-trappist1d-rejected.png') })

// ── 5. CTA 结尾 ──
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await sleep(1800)
console.log('→ 截图 7：CTA 结尾')
await page.screenshot({ path: path.join(OUT, 'journey-07-cta.png') })

// ── 6. console 错误汇总 ──
const relevant = errors.filter(e => !/favicon/i.test(e) && !/404/.test(e))
ok('无 console 错误', relevant.length === 0, relevant.length ? relevant.slice(0, 3).join(' | ') : '')
const nf = [...new Set(notFound)]
ok('无 404 资源', nf.length === 0, nf.length ? nf.slice(0, 3).join(' | ') : '')

await browser.close()
const pass = results.filter(r => r.pass).length
console.log(`\n===== 验证结果：${pass}/${results.length} 通过 =====`)
process.exit(pass === results.length ? 0 : 1)
