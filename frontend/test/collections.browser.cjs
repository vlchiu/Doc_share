const {
  chromium
} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: true,
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('token', 'collection-test'));

    const user = {
      id: 1,
      name: 'Test',
      role: 'USER'
    };

    const docs = [1, 2].map(id => ({
      id,
      title: `Tài liệu ${id}`,
      file_type: 'pdf',
      user,
      user_id: 1,
      status: 'APPROVED',

      category: {
        name: 'Test'
      },

      comments: []
    }));

    let collection = null, ids = [], fail = false;

    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
      const method = route.request().method();
      const body = route.request().postDataJSON();
      let data = {};

      if (path === '/auth/me')
        data = user;
      else if (path === '/notifications')
        data = [];
      else if (path === '/collections') {
        if (fail) return route.fulfill({
          status: 503,
          json: {}
        });

        if (method === 'POST') {
          collection = {
            id: 1,
            ...body,
            is_owner: true
          };

          data = collection;
        } else data = collection ? [{
          ...collection,

          _count: {
            items: ids.length
          }
        }] : [];
      } else if (path === '/collections/1') {
        if (method === 'PUT')
          Object.assign(collection, body);

        if (method === 'DELETE') {
          collection = null;
          ids = [];
        }

        data = collection ? {
          ...collection,

          items: ids.map(id => ({
            document: docs.find(d => d.id === id)
          }))
        } : {};
      } else if (path === '/collections/1/items') {
        if (!ids.includes(body.document_id))
          ids.push(body.document_id);
      } else if (path.startsWith('/collections/1/items/')) {
        const id = Number(path.split('/').at(-1));

        if (method === 'DELETE')
          ids = ids.filter(x => x !== id);
        else {
          const i = ids.indexOf(id), j = i + (body.direction === 'up' ? -1 : 1);
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
      } else if (['/documents/mine', '/documents/saved'].includes(path))
        data = docs;
      else if (path === '/documents/1')
        data = docs[0];
      else if (path === '/documents') data = {
        documents: docs,

        pagination: {
          totalPages: 1,
          total: 2
        }
      };
      else if (path === '/categories' || path.endsWith('/comments'))
        data = [];

      await route.fulfill({
        json: data
      });
    });

    const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4174';
    await page.goto(base + '/collections');

    await page.getByRole('button', {
      name: 'Tạo bộ sưu tập',
      exact: true
    }).click();

    await page.getByLabel('Tên bộ sưu tập').fill('Ôn tập');

    await page.getByLabel('Mô tả', {
      exact: true
    }).fill('Tài liệu học tập');

    await page.getByRole('button', {
      name: 'Lưu bộ sưu tập',
      exact: true
    }).click();

    await page.getByRole('heading', {
      name: 'Ôn tập',
      exact: true
    }).waitFor();

    assert.equal(collection.visibility, 'PRIVATE');

    await page.getByRole('button', {
      name: 'Thêm tài liệu',
      exact: true
    }).click();

    await page.getByRole('button', {
      name: 'Thêm',
      exact: true
    }).first().click();

    await page.getByRole('button', {
      name: 'Đã thêm',
      exact: true
    }).waitFor();

    await page.getByLabel('Nguồn tài liệu').selectOption('saved');
    await page.getByLabel('Tìm tài liệu để thêm').fill('Tài liệu 2');

    await page.getByRole('button', {
      name: 'Thêm',
      exact: true
    }).click();

    await page.waitForFunction(() => document.querySelectorAll('article').length === 2);

    await page.getByRole('button', {
      name: 'Đóng hộp thoại'
    }).click();

    await page.getByRole('button', {
      name: 'Đưa lên: Tài liệu 2'
    }).click();

    await page.waitForFunction(() => document.querySelector('article a')?.textContent === 'Tài liệu 2');
    await page.reload();

    await page.getByRole('link', {
      name: 'Tài liệu 2',
      exact: true
    }).waitFor();

    assert.equal(await page.locator('article a').first().innerText(), 'Tài liệu 2');
    await page.getByLabel('Tìm trong bộ sưu tập').fill('Tài liệu 1');
    assert.equal(await page.locator('article').count(), 1);
    await page.getByLabel('Tìm trong bộ sưu tập').fill('');

    await page.getByRole('button', {
      name: 'Chỉnh sửa',
      exact: true
    }).click();

    await page.getByLabel('Tên bộ sưu tập').fill('Ôn tập công khai');
    await page.getByLabel('Quyền hiển thị').selectOption('PUBLIC');

    await page.getByRole('button', {
      name: 'Lưu bộ sưu tập',
      exact: true
    }).click();

    await page.getByRole('button', {
      name: 'Sao chép liên kết'
    }).waitFor();

    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({
        width,
        height: 900
      });

      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
      );
    }

    await page.screenshot({
      path: '/tmp/docshare-collections-mobile.png',
      fullPage: true
    });

    await page.getByRole('button', {
      name: 'Bỏ khỏi bộ sưu tập'
    }).first().click();

    await page.waitForFunction(() => document.querySelectorAll('article').length === 1);
    await page.goto(base + '/documents/1');

    await page.getByRole('button', {
      name: 'Thêm vào bộ sưu tập',
      exact: true
    }).click();

    await page.getByRole('button', {
      name: /Ôn tập công khai/
    }).click();

    await page.getByRole('dialog').waitFor({
      state: 'hidden'
    });

    await page.goto(base + '/collections/1');

    await page.getByRole('button', {
      name: 'Xóa bộ sưu tập',
      exact: true
    }).click();

    await page.getByRole('button', {
      name: 'Xác nhận xóa',
      exact: true
    }).click();

    await page.waitForURL('**/collections');
    assert.equal(collection, null);
    fail = true;
    await page.reload();

    await page.getByRole('button', {
      name: 'Thử lại'
    }).waitFor();

    fail = false;

    await page.getByRole('button', {
      name: 'Thử lại'
    }).click();

    await page.getByText('Chưa có bộ sưu tập. Tạo bộ đầu tiên để tổ chức tài liệu của bạn.').waitFor();
    assert.deepEqual(errors, []);

    console.log(
      'PASS collections browser: CRUD, sources, reorder, reload, search, public link, detail picker, deletion, retry, 3 viewports.'
    );
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
