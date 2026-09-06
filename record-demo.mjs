/**
 * 《第二地球》全程交互演示视频录制 v3（字幕烧录进视频）
 *
 * 用法：dev server 运行中（localhost:5173），然后 `node record-demo.mjs`
 * 产出：../竞赛提交材料/6-演示视频/第二地球-演示视频-raw.webm（1600×900）
 *
 * v3 改动（按验收反馈）：
 * - 星表探索补录：点击行星名字标签 → 资料卡弹出 → 卡内「查看星系 →」跨页跳转（30 步）。
 * - 演化页时间轴修复：滑块在首屏之下，拖前先 scrollIntoViewIfNeeded——
 *   最小滚动后滑块贴屏幕底部、3D 恒星仍在画面中，拖动与恒星形变同框。
 * - 所有点击/拖动统一先滚入视口，杜绝"坐标落在视口外、操作打空气"。
 *
 * 沿用 v2：拟人化操作引擎（贝塞尔移动+抖动+微停顿+滑块分段过冲）、
 * 20% 黑底白字字幕、三层文案（动作→画面→科普）、localStorage 预置收藏。
 *
 * 注意：launch 不能加 --start-maximized——窗口最大化后视口宽于录屏尺寸，画面会被裁掉右侧。
 * 录制期间请勿操作鼠标键盘。
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE = 'http://localhost:5173'
const OUT_DIR = path.resolve('..', '竞赛提交材料', '6-演示视频')
const VIEW = { width: 1600, height: 900 }

// ── 拟人化操作引擎 ──────────────────────────────────────────
const rand = (a, b) => a + Math.random() * (b - a)
const sleep = ms => new Promise(r => setTimeout(r, ms))
let cursor = { x: 800, y: 450 } // 内部跟踪光标位置（Playwright 不提供查询）

// 二次贝塞尔 + 抖动 + 微停顿的鼠标移动
async function humanMove(page, x, y, { steps = 26, wobble = 2.2, speed = 1 } = {}) {
  const x0 = cursor.x, y0 = cursor.y
  const mx = (x0 + x) / 2 + rand(-70, 70), my = (y0 + y) / 2 + rand(-45, 45)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = t * t * (3 - 2 * t), t2 = 1 - e
    const bx = t2 * t2 * x0 + 2 * t2 * e * mx + e * e * x
    const by = t2 * t2 * y0 + 2 * t2 * e * my + e * e * y
    await page.mouse.move(bx + rand(-wobble, wobble), by + rand(-wobble, wobble))
    if (i % 9 === 0) await sleep(rand(40, 130) * speed)
  }
  cursor = { x, y }
}

// 视口内判定：3D 标签可能投影到屏幕外，点击前要筛掉
const inViewport = b => b && b.x > 40 && b.y > 80 && b.x + b.width < VIEW.width - 40 && b.y + b.height < VIEW.height - 40

// 拟人点击：滚入视口 → 曲线移动 → 悬停犹豫 → 按下/抬起各带随机延迟
async function humanClickText(page, text, { exact = false } = {}) {
  const el = page.getByText(text, { exact }).first()
  await el.waitFor({ timeout: 8000 })
  await el.scrollIntoViewIfNeeded()
  const box = await el.boundingBox()
  if (!box) throw new Error(`no boundingBox for "${text}"`)
  const tx = box.x + box.width * rand(0.35, 0.65), ty = box.y + box.height * rand(0.35, 0.65)
  await humanMove(page, tx, ty)
  await sleep(rand(140, 380)) // 悬停犹豫
  await page.mouse.down()
  await sleep(rand(55, 140))  // 按住时长
  await page.mouse.up()
  await sleep(rand(220, 520)) // 点后停顿
}

// 星图里随手点一颗行星标签：候选名单按序尝试，取第一个在视口内且可见的
async function humanClickPlanetLabel(page, names) {
  for (const name of names) {
    const el = page.getByText(name, { exact: true }).first()
    try {
      await el.waitFor({ state: 'visible', timeout: 2500 })
    } catch { continue }
    const box = await el.boundingBox()
    if (!inViewport(box)) continue
    await humanMove(page, box.x + box.width / 2 + rand(-2, 2), box.y + box.height / 2 + rand(-2, 2), { steps: 22 })
    await sleep(rand(150, 380))
    await page.mouse.down(); await sleep(rand(55, 140)); await page.mouse.up()
    await sleep(rand(250, 550))
    return name
  }
  throw new Error('no planet label in viewport')
}

// 拟人按钮点击（如 ✕）
async function humanClickButton(page, name) {
  const el = page.getByRole('button', { name }).first()
  await el.waitFor({ timeout: 8000 })
  await el.scrollIntoViewIfNeeded()
  const box = await el.boundingBox()
  if (!box) throw new Error(`no boundingBox for button "${name}"`)
  await humanMove(page, box.x + box.width / 2 + rand(-2, 2), box.y + box.height / 2 + rand(-2, 2), { steps: 18 })
  await sleep(rand(120, 320))
  await page.mouse.down(); await sleep(rand(55, 130)); await page.mouse.up()
  await sleep(rand(200, 450))
}

// 滑块分段拖动：先滚入视口（最小滚动，保证 3D 主体同框），再分段慢移 + 停顿 + 过冲回拉
async function humanDragSlider(page, stops) {
  const slider = page.locator('input[type="range"]').first()
  await slider.scrollIntoViewIfNeeded()
  await sleep(rand(200, 400))
  const box = await slider.boundingBox()
  if (!box) throw new Error('slider not found')
  const y = box.y + box.height / 2
  await humanMove(page, box.x + box.width * stops[0].v, y, { steps: 20 })
  await sleep(rand(160, 400))
  await page.mouse.down(); await sleep(rand(90, 180))
  for (const s of stops.slice(1)) {
    await humanMove(page, box.x + box.width * s.v, y, { steps: 34, wobble: 1.0, speed: 1.6 })
    await sleep(s.pause ?? rand(550, 1000))
  }
  await sleep(rand(140, 300))
  await page.mouse.up()
  await sleep(rand(300, 600))
}

// 画布拖拽（旋转视角）：按住 → 分段慢移 → 松手
async function humanCanvasDrag(page, dx, dy, { segments = 4, hold = 320 } = {}) {
  const box = await page.locator('canvas').first().boundingBox()
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2
  await humanMove(page, cx, cy, { steps: 20 })
  await sleep(rand(140, 360))
  await page.mouse.down(); await sleep(hold)
  for (let i = 1; i <= segments; i++) {
    await humanMove(page, cx + dx * i / segments + rand(-4, 4), cy + dy * i / segments + rand(-3, 3), { steps: 14, wobble: 1.4, speed: 1.4 })
    await sleep(rand(180, 420))
  }
  await sleep(rand(200, 400))
  await page.mouse.up()
  await sleep(rand(300, 600))
}

// 滚轮俯冲：分小格滚动，格间停顿（人不会一次滚到底）
async function humanWheel(page, delta, { ticks = 5 } = {}) {
  const box = await page.locator('canvas').first().boundingBox()
  await humanMove(page, box.x + box.width / 2 + rand(-80, 80), box.y + box.height / 2 + rand(-60, 60), { steps: 20 })
  await sleep(rand(150, 350))
  for (let i = 0; i < ticks; i++) {
    await page.mouse.wheel(0, delta)
    await sleep(rand(220, 450))
  }
}

// ── 步骤表：caption 三层化（动作 → 画面 → 科普点）───────────────
const STEPS = [
  { caption: '01 / 30 · 开场，无需点击：旅程页序章逐行浮现，右侧 K2-18b 三维球体缓缓自转。2023 年，人类第一次在宜居带行星的大气里读到可能的生命信号——"为什么要找第二地球"，先把这个问题交给观众。', run: p => p.goto(BASE + '/', { waitUntil: 'networkidle' }), hold: 9500 },
  { caption: '02 / 30 · 点击时间轴上的「2019」节点：详情卡展开，三维星球同步亮起（希望拍）。2019 年哈勃望远镜首次在 K2-18b 大气中发现水汽——这颗行星从此成为宜居带研究的焦点。', run: p => humanClickText(p, '2019'), hold: 8000 },
  { caption: '03 / 30 · 点击顶部章节「TRAPPIST-1d」：星球瞬间暗沉成灰，红叉盖章落下（证伪拍）。2025 年 JWST 证实它没有大气——ESI 0.90 的"最像地球"，就这样退场。数据的裁决不看脸。', run: p => humanClickText(p, 'TRAPPIST-1d'), hold: 7500 },
  { caption: '04 / 30 · 点击导航「星表」：视角交给宏观星图，六站导览飞行自动开始——从地球一路拉升，把尺度阶梯一站站走过。', run: p => humanClickText(p, '星表', { exact: true }), hold: 5000 },
  { caption: '05 / 30 · 无需操作，看飞行：镜头自地球特写拉升，太阳系八大行星轨道逐一入画。海王星轨道约 30 天文单位——这还只是下一站"星际邻居"的门口。', hold: 6000 },
  { caption: '06 / 30 · 飞行继续，先后穿过「星际邻居」与「本地泡」：12 光年内 15 颗命名恒星点亮（天狼星蓝白、比邻星暗红，RECONS 实测），紧接着 28 颗系外行星按真实银道坐标散布——开普勒系的行星聚成一簇，选择效应第一次可见。', hold: 7000 },
  { caption: '07 / 30 · 镜头爬升穿出本地泡：猎户臂的恒星密度渐起，尺度从光年跳到千光年——下一站就是银河全景。', hold: 4500 },
  { caption: '08 / 30 · 点击右下「跳过导览」：直接停在银河全景，万星之海与旋臂结构充满屏幕。太阳只是猎户臂边缘一粒微尘——这是全站所有数据的坐标系。', run: p => humanClickText(p, '跳过导览'), hold: 5000 },
  { caption: '09 / 30 · 滚轮向内滚动：镜头从银河尺度俯冲进本地泡行星群。滚动 = 降落，这是进入星图的第二种手势。', run: p => humanWheel(p, -220), hold: 5500 },
  { caption: '10 / 30 · 点击「SOLAR SYSTEM · You are here」标签：镜头飞近太阳，详情卡弹出。一颗 G 型主序星与八大行星；而人类确认的全部系外行星，都在太阳系之外。', run: p => humanClickText(p, 'SOLAR SYSTEM'), hold: 7000 },
  { caption: '11 / 30 · 点击「✕」关闭卡片：回到行星群总览，镜头弹簧式归位。', run: p => humanClickButton(p, '✕'), hold: 4500 },
  { caption: '12 / 30 · 按住左键水平拖动：星图缓缓旋转，每颗行星的方向由真实天球坐标决定——星图可以像地球仪一样转着看。', run: p => humanCanvasDrag(p, -420, 30), hold: 6000 },
  { caption: '13 / 30 · 在星图里随手点开一颗行星的名字标签：资料卡弹出——半径、温度、轨道周期、发现年份一排真实参数，卡内可收藏、可跨页跳转。星图不止能看，还能翻档案。', run: p => humanClickPlanetLabel(p, ['Kepler-452b', 'K2-18b', 'TRAPPIST-1e', 'Kepler-186f', '比邻星 b', '55 Cancri e', 'Kepler-7b']), hold: 7000 },
  { caption: '14 / 30 · 点击卡内「查看星系 →」：跨页跳转直达该系统的 3D 工作台——页与页之间数据打通，不必回到导航重新找。', run: p => humanClickText(p, '查看星系'), hold: 6000 },
  { caption: '15 / 30 · 点击左栏「TRAPPIST-1e」：相机飞入这颗红矮星系统，地球参照系组件弹簧联动——彩球 0.77 倍地球半径，比白色地球球略小。红矮星的宜居带离恒星很近，潮汐锁定是常态。', run: p => humanClickText(p, 'TRAPPIST-1e'), hold: 7500 },
  { caption: '16 / 30 · 点击地球参照系右上「对数」：刻度切到对数档，小行星也能看清。可读性与真实比例的取舍，交给观众自己选。', run: p => humanClickText(p, '对数', { exact: true }), hold: 5000 },
  { caption: '17 / 30 · 点回「真实比例」：地球参照球纹丝不动——"尺子不动"，动的永远是被测量的世界。这是全站对比逻辑的一句话总结。', run: p => humanClickText(p, '真实比例', { exact: true }), hold: 5000 },
  { caption: '18 / 30 · 再切「Kepler-7b」：彩球膨胀到地球的 16.6 倍，地球缩成一颗小白点，注脚自动标注"地球约占画面高度 6%"。气态巨行星的量级震撼，不需要任何文案。', run: p => humanClickText(p, 'Kepler-7b'), hold: 7000 },
  { caption: '19 / 30 · 拖动旋转轨道视图：宜居带辉光带从不同角度呈现明暗起伏、没有硬边界——它不是贴图，是 shader 逐帧生成的能量场。', run: p => humanCanvasDrag(p, 380, -20), hold: 5500 },
  { caption: '20 / 30 · 点击导航「光谱」：三幕序章先讲透一件事——凌星时星光穿过大气，每种分子会留下自己的吸收指纹。', run: p => humanClickText(p, '光谱', { exact: true }), hold: 6000 },
  { caption: '21 / 30 · 点击「跳过导入」直达档案：K2-18b 的 JWST 三台仪器原始散点并列陈列，保留噪声、不做美化——数据即主体。', run: p => humanClickText(p, '跳过导入'), hold: 5000 },
  { caption: '22 / 30 · 按住「大气强度」滑块慢慢向右拖：观测曲线与无大气基线实时分叉，中间那条竖带就是"大气的存在"本身。拖到 1 再回一点——差异大小，手说了算。', run: p => humanDragSlider(p, [{ v: 0.3 }, { v: 0.48, pause: 950 }, { v: 0.72, pause: 1200 }, { v: 0.62, pause: 600 }]), hold: 7500 },
  { caption: '23 / 30 · 勾选「误差棒」：每个散点浮现 ±1σ 竖线——测量有精度，两个读数的差小于误差棒就不可信。争议的来源，一眼看清。', run: p => humanClickText(p, '误差棒'), hold: 6000 },
  { caption: '24 / 30 · 切换「NIRSpec G395H」口径：2.8–5.0 μm 碳分子波段，正是"碳基生命化学"故事展开的地方。', run: p => humanClickText(p, 'NIRSpec G395H'), hold: 5500 },
  { caption: '25 / 30 · 再切「MIRI LRS」：5–10 μm 中红外给出另一组约束。同一颗行星，三种仪器口径各讲一段故事——并列陈列，观众自己对比。', run: p => humanClickText(p, 'MIRI LRS'), hold: 5500 },
  { caption: '26 / 30 · 点击导航「演化」：三维程序化恒星登场，表面米粒对流与黑子全部由噪声实时生成，不是贴图。', run: p => humanClickText(p, '演化', { exact: true }), hold: 5500 },
  { caption: '27 / 30 · 把时间轴慢慢拖到中段：恒星膨胀成红巨星，表面变冷、亮度暴涨，读数栏的半径与光度同步跳动。约 50 亿年后的太阳将吞没水星与金星的轨道。', run: p => humanDragSlider(p, [{ v: 0 }, { v: 0.2, pause: 800 }, { v: 0.38, pause: 900 }, { v: 0.52, pause: 1100 }]), hold: 8000 },
  { caption: '28 / 30 · 继续拖到尽头：外层物质散逸成行星状星云，核心塌缩成白矮星——只有地球大小的恒星遗骸。而 WD 1856b 仍在它身边公转：行星，能活过恒星的死亡。', run: p => humanDragSlider(p, [{ v: 0.52 }, { v: 0.78, pause: 900 }, { v: 1.0, pause: 1100 }]), hold: 8000 },
  { caption: '29 / 30 · 点击导航「我的星表」：收藏列表与回访横幅——系统模拟 NASA/MAST 新数据发布：你收藏的 K2-18b 有新动态了。探索不因离开而结束。', run: p => humanClickText(p, '我的星表'), hold: 7000 },
  { caption: '30 / 30 · 收尾，无需操作：从旅程的三拍叙事、星表的两重宇宙，到星系的对比、光谱的争议、演化的终局——四层穿透，同一个科学口径。《第二地球》，感谢观看。', hold: 6000 },
]

// ── 字幕条（20% 黑底白字方块，无圆角无边框）+ 收藏预置 ──────────
const INIT_SCRIPT = `
window.__cap = function (text) {
  let el = document.getElementById('demo-caption')
  if (!el) {
    el = document.createElement('div')
    el.id = 'demo-caption'
    el.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:2147483000;background:rgba(0,0,0,0.2);color:#ffffff;padding:10px 26px;font:14px/1.8 "Microsoft YaHei","PingFang SC",sans-serif;letter-spacing:0.02em;pointer-events:none;white-space:pre-wrap;max-width:66vw;text-align:center;'
    document.body.appendChild(el)
  }
  el.textContent = text
}
try { localStorage.setItem('second-earth-favorites', JSON.stringify({ state: { favorites: ['K2-18b', 'TRAPPIST-1e'] }, version: 0 })) } catch (e) {}
`

const browser = await chromium.launch({
  channel: 'msedge',   // 调用本机安装的 Edge，真实 GPU 加速渲染
  headless: false,
  // 注意：不能加 --start-maximized——窗口最大化后视口宽于录屏尺寸，画面会被裁掉右侧
})
const context = await browser.newContext({
  viewport: VIEW,
  deviceScaleFactor: 1,
  recordVideo: { dir: path.join(OUT_DIR, '_tmp'), size: VIEW },
})
await context.addInitScript(INIT_SCRIPT)
const page = await context.newPage()
page.setDefaultTimeout(15000)

let i = 0
for (const step of STEPS) {
  i++
  console.log(`[step ${i}/${STEPS.length}] ${step.caption.slice(0, 42)}…`)
  try {
    if (step.run) await step.run(page)
  } catch (e) {
    console.log(`  !! action failed (video continues): ${e.message.split('\n')[0]}`)
  }
  // 交互完成后再显示字幕，与画面变化对齐
  await page.evaluate((t) => window.__cap(t), step.caption)
  await page.waitForTimeout(step.hold)
}

// 收尾：关页触发视频落盘，重命名到竞赛目录
await page.close()
await context.close()
const videoPath = await page.video().path()
const finalPath = path.join(OUT_DIR, '第二地球-演示视频-raw.webm')
fs.copyFileSync(videoPath, finalPath)
fs.rmSync(path.join(OUT_DIR, '_tmp'), { recursive: true, force: true })
console.log(`\nVIDEO SAVED: ${finalPath} (${fs.statSync(finalPath).size} bytes)`)
await browser.close()
