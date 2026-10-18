import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({headless:true});
const summary = [];
const origins = process.env.AUDIT_LOCAL_ONLY ? [['changed','http://localhost:3107']] : [['live','https://www.ichattiesburg.org'],['changed','http://localhost:3107']];
try {
  for (const [label, origin] of origins) {
    const context = await browser.createBrowserContext();
    for (const path of ['/contact','/resources','/','/prayer-times','/display']) {
      const page = await context.newPage();
      await page.setViewport({width:1280,height:900});
      const calls = []; const errors = [];
      page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/')) calls.push(new URL(r.url()).pathname); });
      page.on('pageerror', e => errors.push(e.message));
      const response = await page.goto(origin + path, {waitUntil:'networkidle0',timeout:45000});
      assert.equal(response.status(),200);
      const info = await page.evaluate(() => ({title:document.title, h1:document.querySelector('h1')?.textContent,
        resourceLinks:document.querySelectorAll('a[href="https://quran.com"]').length,
        image:performance.getEntriesByType('resource').filter(r => r.name.includes('ich.jpeg')).map(r => ({url:r.name,bytes:r.encodedBodySize})),
        overflow:document.documentElement.scrollWidth > innerWidth }));
      summary.push({label,path,calls,errors,...info});
      if (label === 'changed') {
        assert.equal(errors.length,0, `${path}: ${errors.join('; ')}`);
        if (path === '/contact') assert.equal(calls.filter(p => p === '/api/admin/settings').length,1);
        if (path === '/resources') { assert.equal(calls.filter(p => /resources|resource-links/.test(p)).length,0); assert.equal(info.resourceLinks,1); }
        if (path === '/display') assert.equal(calls.filter(p => p === '/api/jamaat').length,1);
        if (path === '/') {
          assert(info.image.some(i => i.url.includes('/_next/image') && i.bytes > 0));
          assert(await page.$eval('img[alt="Islamic Center of Hattiesburg"]', img => img.complete && img.naturalWidth > 0));
        }
      }
      await page.close();
    }
    await context.close();
  }
  console.log(JSON.stringify(summary,null,2));
} finally { await browser.close(); }
