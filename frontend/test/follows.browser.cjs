const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { if (!sessionStorage.getItem('guest')) localStorage.setItem('token', 'follow-test'); localStorage.setItem('userId', '999'); }); // Deliberately stale: UI must use server identity.
    const people = [1, 2, 3].map(id => ({ id, name: `Người dùng ${id}`, avatar_url: null, role: 'USER', plan: 'FREE', email: `${id}@example.test`, created_at: '2026-01-01' }));
    let relations = [[2, 1], [1, 3], [3, 2]];
    let collectionFollow = false, isPublic = true, failure = '', mutations = 0, slow = false;
    const collection = { id: 9, name: 'Bộ công khai của người khác', description: 'Tài liệu chung', user_id: 2, visibility: 'PUBLIC', user: people[1], _count: { items: 0 } };
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
      const method = route.request().method();
      if (failure === path) return route.fulfill({ status: 503, json: { message: 'Thử lại sau' } });
      const viewer = route.request().headers().authorization ? 1 : null;
      let data = {};
      if (path === '/auth/me') data = people[0];
      else if (path === '/auth/usage') data = { enabled: false };
      else if (['/notifications', '/documents/mine', '/collections'].includes(path)) data = [];
      else if (path.startsWith('/documents/user/')) data = { user: people[Number(path.split('/').at(-1)) - 1], documents: [] };
      else if (path.startsWith('/follow/')) {
        const [, , raw, kind] = path.split('/'), id = Number(raw);
        if (kind === 'status') data = { followers: relations.filter(r => r[1] === id).length, following: relations.filter(r => r[0] === id).length, isFollowing: relations.some(r => r[0] === viewer && r[1] === id), isSelf: id === viewer };
        else if (kind) data = relations.filter(r => kind === 'followers' ? r[1] === id : r[0] === id).map(r => {
          const p = people[(kind === 'followers' ? r[0] : r[1]) - 1];
          return { ...p, isSelf: p.id === viewer, isFollowing: relations.some(x => x[0] === viewer && x[1] === p.id) };
        });
        else {
          mutations++;
          if (slow) await new Promise(resolve => setTimeout(resolve, 250));
          if (method === 'PUT' && !relations.some(r => r[0] === viewer && r[1] === id)) relations.push([viewer, id]);
          if (method === 'DELETE') relations = relations.filter(r => !(r[0] === viewer && r[1] === id));
          data = { isFollowing: method === 'PUT', message: method === 'PUT' ? 'Đã theo dõi' : 'Đã bỏ theo dõi' };
        }
      } else if (path === '/collections/following') data = collectionFollow ? [isPublic ? { ...collection, available: true } : { id: 9, available: false }] : [];
      else if (path === '/collections/9/follow') { collectionFollow = method === 'PUT'; data = { is_following: collectionFollow, message: 'Đã cập nhật theo dõi bộ sưu tập' }; }
      else if (path === '/collections/9') {
        if (!isPublic) return route.fulfill({ status: 404, json: {} });
        data = { ...collection, is_owner: false, is_following: collectionFollow, items: [] };
      }
      await route.fulfill({ json: data });
    });
    const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4174';
    await page.goto(base + '/profile');
    await page.getByRole('button', { name: '1 người theo dõi', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Người dùng 2' }).waitFor();
    slow = true;
    await page.getByRole('button', { name: 'Theo dõi lại', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Đang cập nhật…', exact: true }).isDisabled(), true);
    await page.getByRole('dialog').getByRole('button', { name: 'Bỏ theo dõi', exact: true }).waitFor();
    slow = false;
    assert.equal(mutations, 1);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Đang theo dõi 2 người', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Người dùng 3' }).waitFor();
    const row = page.getByRole('dialog').locator('li').filter({ hasText: 'Người dùng 3' });
    await row.getByRole('button', { name: 'Bỏ theo dõi' }).click();
    await row.waitFor({ state: 'hidden' });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Đang theo dõi 1 người', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Đang theo dõi 1 người', exact: true }).waitFor();
    failure = '/follow/1/followers';
    await page.getByRole('button', { name: '1 người theo dõi', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Thử lại' }).waitFor();
    failure = '';
    await page.getByRole('dialog').getByRole('button', { name: 'Thử lại' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Người dùng 2' }).click();
    await page.waitForURL('**/users/2');
    await page.getByRole('button', { name: 'Bỏ theo dõi', exact: true }).waitFor();
    await page.getByRole('button', { name: '2 người theo dõi', exact: true }).click();
    const self = page.getByRole('dialog').locator('li').filter({ hasText: 'Người dùng 1' });
    await self.getByText('Bạn', { exact: true }).waitFor();
    assert.equal(await self.getByRole('button').count(), 0);
    const third = page.getByRole('dialog').locator('li').filter({ hasText: 'Người dùng 3' });
    await third.getByRole('button', { name: 'Theo dõi', exact: true }).click();
    await third.getByRole('button', { name: 'Bỏ theo dõi', exact: true }).waitFor();
    // Viewer following third person must not change the viewed person's follower count.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '2 người theo dõi', exact: true }).waitFor();
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.screenshot({ path: '/tmp/docshare-follows-profile-mobile.png', fullPage: true });
    await page.goto(base + '/users/1');
    await page.getByRole('button', { name: '1 người theo dõi', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: /^(Bỏ theo dõi|Theo dõi)$/ }).count(), 0);
    await page.goto(base + '/collections/9');
    const before = JSON.stringify(relations);
    await page.getByRole('button', { name: 'Theo dõi bộ sưu tập', exact: true }).click();
    await page.getByRole('button', { name: 'Bỏ theo dõi bộ sưu tập', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Bỏ theo dõi bộ sưu tập', exact: true }).waitFor();
    assert.equal(JSON.stringify(relations), before);
    await page.goto(base + '/collections?tab=following');
    await page.getByRole('link', { name: collection.name, exact: true }).waitFor();
    await page.screenshot({ path: '/tmp/docshare-follows-collections-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Của tôi', exact: true }).click();
    await page.getByText('Chưa có bộ sưu tập. Tạo bộ đầu tiên để tổ chức tài liệu của bạn.').waitFor();
    await page.getByRole('button', { name: 'Đang theo dõi', exact: true }).click();
    await page.getByRole('link', { name: collection.name, exact: true }).waitFor();
    isPublic = false;
    await page.reload();
    await page.getByText('Bộ sưu tập không còn công khai', { exact: true }).waitFor();
    assert.equal(await page.getByText(collection.name, { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Bỏ theo dõi bộ sưu tập', exact: true }).click();
    await page.getByText('Bạn chưa theo dõi bộ sưu tập nào.', { exact: false }).waitFor();
    failure = '/collections/following';
    await page.reload();
    await page.getByRole('button', { name: 'Thử lại' }).waitFor();
    failure = '';
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await page.getByText('Bạn chưa theo dõi bộ sưu tập nào.', { exact: false }).waitFor();
    await page.evaluate(() => { localStorage.removeItem('token'); sessionStorage.setItem('guest', '1'); });
    isPublic = true;
    await page.goto(base + '/collections/9');
    await page.getByRole('link', { name: 'Đăng nhập để theo dõi bộ sưu tập' }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS follows browser: own/other/self profiles, viewer identity, follow-back/unfollow/counts/reload, pending lock, errors/retry, collection tabs/follow, privacy placeholder, independence, guest and mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
