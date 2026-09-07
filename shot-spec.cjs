// 临时脚本：截 design-spec.html 整页预览（确认渲染后交付）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
  const page = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('file:///' + path.resolve(__dirname, '../code-screenshots/design-spec.html').replace(/\\/g, '/'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.resolve(__dirname, '../code-screenshots/design-spec-preview.png'), fullPage: true });
  await b.close();
  console.log('SPEC SHOT OK');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
