// 临时：把各页面保存为自包含 HTML 快照，供 html.to.design Figma 插件 "File" 标签页导入（用完可留作重导出工具）
// 原理：内联全部 CSS（含字体 @font-face）与图片为 data URI，移除 script，触发完入场动画后抓取 DOM
import puppeteer from 'puppeteer-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const BASE = 'http://localhost:5173'
const OUT = fileURLToPath(new URL('./figma-html/', import.meta.url))

mkdirSync(OUT, { recursive: true })

const pages = [
  ['journey', '/'],
  ['catalog', '/catalog'],
  ['galaxy', '/galaxy'],
  ['spectrum', '/spectrum'],
  ['spectrum-k2-18b', '/spectrum/K2-18b'],
  ['evolution', '/evolution'],
  ['mystars', '/mystars'],
]

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--window-size=1440,900', '--hide-scrollbars', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

for (const [name, route] of pages) {
  await page.goto(BASE + route, { waitUntil: 'networkidle0', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 2500))

  // 逐步滚动整页，触发所有 whileInView 入场动画（once:true，完成后保持可见）
  const height = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await new Promise((r) => setTimeout(r, 250))
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await new Promise((r) => setTimeout(r, 1500))

  // 2.5 将 canvas（3D 星球 / 星空背景）替换为实际渲染画面的截图 <img>，保留布局
  const canvases = await page.$$('canvas')
  for (const c of canvases) {
    try {
      const shot = await c.screenshot({ type: 'png' })
      if (!shot.length) continue
      await c.evaluate((el, src) => {
        const rect = el.getBoundingClientRect()
        const img = document.createElement('img')
        img.src = src
        img.alt = ''
        img.draggable = false
        img.style.cssText = el.style.cssText
        img.style.display = 'block'
        img.style.width = rect.width + 'px'
        img.style.height = rect.height + 'px'
        img.style.maxWidth = 'none'
        el.replaceWith(img)
      }, 'data:image/png;base64,' + shot.toString('base64'))
    } catch {
      /* 不可见或截取失败则跳过 */
    }
  }

  const html = await page.evaluate(async () => {
    // 1. 内联图片（DOM img → data URI，已是 data URI 的跳过）
    await Promise.all(
      [...document.images].map((img) => {
        if (img.src.startsWith('data:')) return Promise.resolve()
        return fetch(img.src)
            .then((r) => r.blob())
            .then(
              (blob) =>
                new Promise((res) => {
                  const fr = new FileReader()
                  fr.onload = () => {
                    img.src = fr.result
                    res()
                  }
                  fr.readAsDataURL(blob)
                }),
            )
            .catch(() => {
              img.remove()
            })
      }),
    )

    // 2. 收集全部 CSS（style 标签 + 外部 link 样式表内容）
    let css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n')
    for (const sheet of document.styleSheets) {
      if (!sheet.href) continue
      try {
        css += (await (await fetch(sheet.href)).text()) + '\n'
      } catch {
        /* 外部表不可达则跳过 */
      }
    }

    // 3. CSS 中 url(...) 引用的资源（字体/背景图）→ data URI
    const urlRe = /url\(\s*(['"]?)([^)'"]+)\1\s*\)/g
    const urls = [...new Set([...css.matchAll(urlRe)].map((m) => m[2]))].filter(
      (u) => !u.startsWith('data:') && !u.startsWith('#'),
    )
    for (const u of urls) {
      try {
        const abs = new URL(u, document.baseURI).href
        const blob = await (await fetch(abs)).blob()
        const dataUrl = await new Promise((res) => {
          const fr = new FileReader()
          fr.onload = () => res(fr.result)
          fr.readAsDataURL(blob)
        })
        css = css.split(u).join(dataUrl)
      } catch {
        /* 个别资源缺失不影响整体 */
      }
    }

    // 4. 用合并后的内联样式替换原 style 标签
    document.querySelectorAll('style').forEach((s) => s.remove())
    document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => l.remove())
    const st = document.createElement('style')
    st.textContent = css
    document.head.appendChild(st)

    // 5. 移除 script（静态快照不需要 JS，避免插件渲染时干扰）
    document.querySelectorAll('script').forEach((s) => s.remove())

    return '<!DOCTYPE html>\n<html>' + document.documentElement.outerHTML + '</html>'
  })

  writeFileSync(`${OUT}\\${name}.html`, html, 'utf8')
  console.log('OK ' + name + '.html  ' + Math.round(html.length / 1024) + ' KB')
}

await browser.close()
console.log('DONE -> ' + OUT)
