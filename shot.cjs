// 临时脚本：把 code-screenshots/code-shots.html 的四个代码卡片截成高清 png（PPT 素材）
const { chromium } = require('playwright');
const path = require('path');
const out = path.resolve(__dirname, '../code-screenshots');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
  const page = await b.newPage({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 2 });
  await page.goto('file:///' + path.join(out, 'code-shots.html').replace(/\\/g, '/'));
  await page.waitForTimeout(500);
  for (let i = 1; i <= 4; i++) {
    await page.locator('#c' + i).screenshot({ path: path.join(out, 'code-' + i + '.png') });
  }
  await b.close();
  console.log('SHOTS OK ->', out);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
