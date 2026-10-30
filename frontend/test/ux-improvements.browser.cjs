const chat = require("./chat-fixture.cjs")();
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const user = {
    id: 1,
    name: "Nguyễn Thảo",
    email: "thao@example.test",
    role: "ADMIN",
    plan: "VIP",
    created_at: "2025-01-01",
    monthly_downloads: 4,
    plan_expires_at: "2027-01-01",
  };
  const categories = [
    "Công nghệ",
    "Lập trình",
    "Học tập",
    "Kinh doanh",
    "Thiết kế",
  ].map((name, index) => ({ id: index + 1, name }));
  const docs = [
    "Trí tuệ nhân tạo trong thời đại số",
    "Lập trình Python cơ bản đến nâng cao",
    "Phương pháp học tập hiệu quả",
    "Chiến lược kinh doanh thời đại mới",
    "Thiết kế UI/UX với sự hỗ trợ của AI",
    "Ứng dụng AI trong doanh nghiệp",
    "Hướng dẫn xây dựng hệ thống dữ liệu",
    "Marketing trong kỷ nguyên số",
  ].map((title, index) => ({
    id: index + 1,
    title,
    description:
      "Khám phá kiến thức, phương pháp và ứng dụng thực tế qua tài liệu từ cộng đồng DocShare.",
    file_type: "application/pdf",
    category: categories[index % 5],
    category_id: (index % 5) + 1,
    status: "APPROVED",
    user,
    user_id: 1,
    created_at: "2026-10-01",
    view_count: 1200 + index * 300,
    download_count: 25,
    comments: [],
    avgScore: 4.8,
    totalRatings: 10,
    content_version: 1,
  }));
  const requests = [];
  let failure = null;
  await page.addInitScript(() =>
    localStorage.setItem("token", "ui-test-token"),
  );
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/src/")) return route.continue();
    const path = url.pathname.replace(/^.*\/api/, "");
    requests.push({
      path,
      method: route.request().method(),
      body: route.request().postData(),
      query: url.search,
    });
    if (path === failure)
      return route.fulfill({ status: 503, json: { message: "test failure" } });
    if (await chat.handle(route, path)) return;
    let data = {};
    if (path === "/documents/saved") data = docs;
    else if (path === "/documents/history")
      data = { history: [], pagination: { totalPages: 1 } };
    else if (path === "/documents/user/2") data = { user, documents: docs };
    else if (path === "/follow/2/status")
      data = { followers: 1, following: 0, isFollowing: false };
    else if (path === "/follow/2/followers") data = [user];
    else if (path === "/auth/me") data = user;
    else if (path === "/categories") data = categories;
    else if (path === "/documents")
      data = {
        documents: docs.slice(0, Number(url.searchParams.get("limit")) || 8),
        pagination: { total: 8, totalPages: 1 },
      };
    else if (path === "/documents/mine") data = docs;
    else if (path === "/documents/pending") data = docs.slice(0, 3);
    else if (path === "/documents/trash" || path === "/admin/reports")
      data = [];
    else if (path === "/admin/users")
      data = { users: [user], pagination: { total: 1, totalPages: 1 } };
    else if (path === "/admin/stats")
      data = {
        totalUsers: 125,
        totalDocs: 88,
        pendingDocs: 3,
        totalComments: 56,
        chartData: [
          { date: "23/10", uploads: 5, downloads: 30 },
          { date: "24/10", uploads: 15, downloads: 26 },
          { date: "25/10", uploads: 12, downloads: 40 },
        ],
        topDocs: docs.slice(0, 3),
      };
    else if (/^\/documents\/\d+$/.test(path))
      data = docs[Number(path.split("/").pop()) - 1];
    else if (path === "/payment/plans")
      data = [
        { key: 1, label: "1 tháng", amount: 29000, months: 1 },
        { key: 3, label: "3 tháng", amount: 79000, months: 3 },
        { key: 12, label: "1 năm", amount: 299000, months: 12 },
      ];
    else if (path === "/payment/sepay/create")
      data = {
        orderId: "TEST_ORDER",
        qrUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
        amount: 79000,
        accountNumber: "000000",
        accountName: "TEST",
        content: "TEST_ORDER",
        bankCode: "TEST",
      };
    else if (path === "/web-search")
      data = {
        query: "AI giáo dục",
        summary: "AI hỗ trợ việc học [1].",
        summaryStatus: "ok",
        sources: [
          {
            id: 1,
            title: "Ứng dụng AI trong giáo dục",
            url: "https://example.com/research",
            snippet:
              "Nghiên cứu về các ứng dụng trí tuệ nhân tạo trong giáo dục.",
            source: "example.com",
          },
        ],
      };
    else if (path.startsWith("/chat/"))
      data = { reply: "Đây là câu trả lời thử nghiệm." };
    else if (path === "/auth/login")
      return route.fulfill({
        status: 401,
        json: { message: "Sai thông tin đăng nhập!" },
      });
    else if (path === "/auth/register") data = { message: "Đã gửi OTP" };
    else if (path === "/notifications")
      data = { notifications: [], unreadCount: 0 };
    return route.fulfill({ json: data });
  });
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5174";

  try {
    for (const [path, endpoint] of [
      ["/my-documents", "/documents/mine"],
      ["/saved-documents", "/documents/saved"],
      ["/trash", "/documents/trash"],
      ["/download-history", "/documents/history"],
      ["/profile", "/auth/me"],
      ["/vip", "/payment/plans"],
      ["/upload", "/categories"],
      ["/documents/1", "/documents/1"],
      ["/users/2", "/documents/user/2"],
      ["/admin", "/admin/stats"],
    ]) {
      failure = endpoint;
      await page.goto(base + path);
      const alert = page
        .getByRole("alert")
        .filter({ has: page.getByRole("button", { name: "Thử lại" }) })
        .first();
      await alert.waitFor();
      failure = null;
      await alert.getByRole("button", { name: "Thử lại" }).click();
      await alert.waitFor({ state: "hidden" });
      await page.waitForTimeout(200);
      assert.equal(
        await page
          .getByRole("alert")
          .filter({ has: page.getByRole("button", { name: "Thử lại" }) })
          .count(),
        0,
      );
      console.log("PASS retry", path);
    }
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of [
        "/help",
        "/support",
        "/terms",
        "/privacy",
        "/copyright",
      ]) {
        await page.goto(base + path);
        await page.locator("main h1").waitFor();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          path + " overflow " + width,
        );
      }
    }
    await page.goto(base + "/help");
    const trigger = page.getByRole("button", { name: "Mở điều hướng" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await dialog.evaluate((el) => el.contains(document.activeElement)),
      );
    }
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.ok(await trigger.evaluate((el) => el === document.activeElement));
    await page.getByRole("button", { name: "Menu tài khoản" }).click();
    assert.ok(
      await page
        .locator("#account-links")
        .evaluate((el) => el.contains(document.activeElement)),
    );
    await page.keyboard.press("Escape");
    assert.ok(
      await page
        .getByRole("button", { name: "Menu tài khoản" })
        .evaluate((el) => el === document.activeElement),
    );
    await page.goto(base + "/users/2");
    await page
      .getByRole("button", { name: "1 người theo dõi", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    console.log("PASS keyboard menus and dialog");
    await page.goto(base + "/help");
    await page.getByLabel("Tìm câu trả lời").fill("khong-co-ket-qua-xyz");
    await page
      .getByRole("heading", { name: "Chưa có câu trả lời phù hợp" })
      .waitFor();
    await page.getByLabel("Tìm câu trả lời").fill("OTP");
    await page.locator("summary").first().focus();
    await page.keyboard.press("Enter");
    assert.ok(
      await page
        .locator("details")
        .first()
        .evaluate((el) => el.open),
    );
    await page.route("**/broken-cover.png", (route) =>
      route.fulfill({ status: 404, body: "missing" }),
    );
    docs[0].thumbnail_url = base + "/broken-cover.png";
    await page.goto(base + "/documents");
    const cover = page.getByRole("link", {
      name: `Xem tài liệu: ${docs[0].title}`,
      exact: true,
    });
    await cover.scrollIntoViewIfNeeded();
    await cover.locator('div[aria-hidden="true"]').waitFor();
    assert.equal(await cover.locator("img").count(), 0);
    console.log("PASS FAQ and broken thumbnail fallback");
    await page.goto(base + "/support");
    const before = requests.filter((r) => r.method === "POST").length;
    await page.getByLabel("Mô tả sự cố").fill("Kiểm tra lỗi khi tải tài liệu");
    await page.getByRole("button", { name: "Sao chép yêu cầu" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /Đã sao chép|Trình duyệt chưa/ })
      .waitFor();
    assert.equal(requests.filter((r) => r.method === "POST").length, before);
    assert.deepEqual(errors, []);
    console.log("PASS support, public pages and no browser errors");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
