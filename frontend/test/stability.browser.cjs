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
    if (await chat.handle(route, path)) return;
    let data = {};
    if (path === "/auth/me") data = user;
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
    const loaded = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") loaded.push(request.url());
    });
    await page.goto(base + "/");
    await page
      .getByRole("heading", { name: /Khám phá tài liệu thông minh/ })
      .waitFor();
    assert.ok(
      !loaded.some((url) =>
        /AdminDashboard-|CartesianChart-|AIChat-/.test(url),
      ),
      "Heavy pages loaded eagerly",
    );
    await page.goto(base + "/admin?tab=users");
    await page.getByPlaceholder("🔍 Tìm theo tên hoặc email...").waitFor();
    let older;
    await page.route("**/api/admin/users?**", async (route) => {
      const search = new URL(route.request().url()).searchParams.get("search");
      if (search === "old") {
        older = route;
        return;
      }
      if (search === "new")
        return route.fulfill({
          json: {
            users: [
              {
                ...user,
                id: 2,
                name: "Kết quả mới",
                email: "new@example.test",
              },
            ],
            pagination: { total: 1, totalPages: 1 },
          },
        });
      return route.fallback();
    });
    const search = page.getByPlaceholder("🔍 Tìm theo tên hoặc email...");
    await search.fill("old");
    await search.press("Enter");
    for (let i = 0; !older && i < 150; i++) await page.waitForTimeout(20);
    assert.ok(older);
    await search.fill("new");
    await search.press("Enter");
    await page.getByText("Kết quả mới", { exact: true }).waitFor();
    await older
      .fulfill({
        json: {
          users: [{ ...user, id: 2, name: "Kết quả cũ" }],
          pagination: { total: 1, totalPages: 1 },
        },
      })
      .catch(() => {});
    await page.waitForTimeout(200);
    assert.equal(
      await page.getByText("Kết quả cũ", { exact: true }).count(),
      0,
    );
    assert.ok(
      loaded.some((url) => /AdminDashboard-/.test(url)),
      "Admin route was not lazily loaded",
    );
    let pendingStatus,
      statusCalls = 0;
    await page.route("**/api/payment/sepay/status/*", (route) => {
      statusCalls++;
      pendingStatus = route;
    });
    await page.goto(base + "/vip");
    await page.getByRole("button", { name: "Tiếp tục thanh toán" }).click();
    await page.getByText("Quét mã QR thanh toán").waitFor();
    await page.getByRole("button", { name: "Tôi đã chuyển khoản" }).click();
    for (let i = 0; !pendingStatus && i < 150; i++)
      await page.waitForTimeout(20);
    assert.ok(pendingStatus);
    await page.waitForTimeout(5500);
    assert.equal(statusCalls, 1, "Overlapping payment polls");
    await page.getByRole("button", { name: "Hủy", exact: true }).click();
    await page.getByRole("button", { name: "Tiếp tục thanh toán" }).waitFor();
    await pendingStatus
      .fulfill({ json: { status: "SUCCESS" } })
      .catch(() => {});
    await page.waitForTimeout(1700);
    assert.equal(
      await page
        .getByText("Thanh toán thành công! Tài khoản VIP đã được kích hoạt.", {
          exact: true,
        })
        .count(),
      0,
    );
    await page.route("**/api/payment/sepay/status/*", (route) =>
      route.fulfill({ json: { status: "SUCCESS" } }),
    );
    await page.getByRole("button", { name: "Tiếp tục thanh toán" }).click();
    await page.getByRole("button", { name: "Tôi đã chuyển khoản" }).click();
    await page
      .getByText("Thanh toán thành công! Tài khoản VIP đã được kích hoạt.", {
        exact: true,
      })
      .waitFor();
    await page.getByRole("button", { name: "Tiếp tục thanh toán" }).waitFor();
    const failedPage = await browser.newPage();
    await failedPage.route("**/assets/Support-*.js", (route) =>
      route.abort("failed"),
    );
    await failedPage.goto(base + "/support");
    await failedPage
      .getByRole("heading", { name: "Chưa thể mở trang", exact: true })
      .waitFor();
    await failedPage.unroute("**/assets/Support-*.js");
    await failedPage
      .getByRole("button", { name: "Tải lại trang", exact: true })
      .click();
    await failedPage
      .getByRole("heading", { name: "Hỗ trợ DocShare", exact: true })
      .waitFor();
    await failedPage.close();
    assert.deepEqual(errors, []);
    console.log(
      "PASS production lazy loading, stale admin search rejection, sequential polling, cancelled order isolation and payment success",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
