// Run against a local Vite server; all API requests are intercepted, no real account needed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error('Page error:', error.message); });
    await page.addInitScript(() => localStorage.setItem('token', 'browser-test-token'));
    let mode = 'success';
    const source = { id: 1, title: 'Nguồn thử nghiệm', url: 'https://example.com/article', source: 'example.com', snippet: 'Trích đoạn thử nghiệm.', publishedAt: null };
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (new URL(url).pathname.startsWith('/src/')) return route.continue();
      if (url.endsWith('/auth/me')) return route.fulfill({ json: { id: 1, name: 'Test', role: 'USER', plan: 'FREE' } });
      if (url.endsWith('/web-search')) {
        assert.equal(route.request().headers().authorization, 'Bearer browser-test-token');
        if (mode === 'pending') return;
        if (mode === 'error') return route.fulfill({ status: 504, json: { message: 'Tìm kiếm mất quá nhiều thời gian.' } });
        return route.fulfill({ json: { query: 'AI giáo dục', summary: mode === 'success' ? 'Nội dung tổng hợp [1].' : null,
          summaryStatus: mode === 'empty' ? 'insufficient_sources' : mode === 'fallback' ? 'unavailable' : 'ok',
          sources: mode === 'empty' ? [] : [source], total: mode === 'empty' ? 0 : 1 } });
      }
      return route.fulfill({ json: { notifications: [], unreadCount: 0 } });
    });
    const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
    await page.goto(origin + '/web-search');
    
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByLabel('Bạn muốn tìm hiểu điều gì?').fill('AI giáo dục');
      await page.getByLabel('Bạn muốn tìm hiểu điều gì?').press('Enter');
      await page.getByText('Nội dung tổng hợp', { exact: false }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `overflow at ${width}`);
      assert.equal(await page.getByRole('link', { name: 'Nguồn 1: Nguồn thử nghiệm' }).getAttribute('href'), source.url);
    }
    assert.equal(await page.getByRole('link', { name: 'Quản trị', exact: true }).count(), 0);
    for (const [state, text] of [['empty', 'Không tìm thấy kết quả'], ['fallback', 'Hiện chưa thể tạo bản tổng hợp AI.'], ['error', 'Tìm kiếm mất quá nhiều thời gian.']]) {
      mode = state; await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
      await page.getByText(text, { exact: false }).waitFor();
    }
    mode = 'pending';
    const cancelRequest = page.waitForRequest(request => request.url().endsWith('/web-search'));
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    await cancelRequest;
    const canceled = page.waitForEvent('requestfailed', request => request.url().endsWith('/web-search'));
    await page.getByRole('button', { name: 'Hủy tìm kiếm' }).click();
    await canceled;
    await page.getByText('Đã hủy tìm kiếm.').waitFor();
    const navigationRequest = page.waitForRequest(request => request.url().endsWith('/web-search'));
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    await navigationRequest;
    const abortedOnNavigation = page.waitForEvent('requestfailed', request => request.url().endsWith('/web-search'));
    await page.getByRole('link', { name: 'Hồ sơ', exact: true }).click();
    await abortedOnNavigation;
    mode = 'success';
    await page.goto(origin + '/web-search');
    await page.getByText('Kiến thức bắt đầu từ một câu hỏi').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: 375/768/1440px, Enter, citations, empty/error/fallback, cancel, navigation and USER sidebar');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
