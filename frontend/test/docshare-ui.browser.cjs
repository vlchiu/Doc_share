const chat = require("./chat-fixture.cjs")();
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
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
  fs.mkdirSync("/tmp/docshare-ui-shots", { recursive: true });
  const paths = [
    "/",
    "/login",
    "/register",
    "/documents",
    "/documents/1",
    "/ai-chat",
    "/web-search",
    "/vip",
    "/profile",
    "/admin",
  ];
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 1080 });
    for (const path of paths) {
      await page.goto(base + path);
      await page.waitForTimeout(650);
      if (path === "/web-search") {
        await page.getByLabel("Bạn muốn tìm hiểu điều gì?").fill("AI giáo dục");
        await page
          .getByRole("button", { name: "Tìm kiếm", exact: true })
          .click();
        await page.getByText("AI hỗ trợ việc học").waitFor();
      }
      const overflow = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.ok(
        overflow.scroll <= overflow.width,
        `${path} overflow ${JSON.stringify(overflow)}`,
      );
      await page.screenshot({
        path: `/tmp/docshare-ui-shots/${path.replaceAll("/", "_") || "home"}-${width}.png`,
        fullPage: true,
      });
      console.log("PASS", path, width);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/documents");
  await page.getByRole("button", { name: "PPT", exact: true }).click();
  await page.waitForTimeout(500);
  assert.ok(
    requests.some(
      (req) =>
        req.path === "/documents" && req.query.includes("fileType=powerpoint"),
    ),
  );
  await page.getByLabel("Tìm tài liệu toàn trang").fill("Python");
  await page.getByLabel("Tìm tài liệu toàn trang").press("Enter");
  await page.waitForTimeout(500);
  assert.ok(
    requests.some(
      (req) => req.path === "/documents" && req.query.includes("search=Python"),
    ),
  );
  await page.goto(base + "/login");
  await page.getByLabel("Email", { exact: true }).fill("test@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("example-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByText("Sai thông tin đăng nhập!").waitFor();
  await page.goto(base + "/register");
  await page.getByLabel("Họ và tên").fill("Test User");
  await page.getByLabel("Email", { exact: true }).fill("test@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("example-password");
  await page.getByLabel("Xác nhận mật khẩu").fill("example-password");
  await page.getByRole("button", { name: "Đăng ký ngay", exact: true }).click();
  await page.getByLabel("Chữ số OTP 1").waitFor();
  await page.goto(base + "/ai-chat");
  await page.getByLabel("Nhập câu hỏi cho AI").fill("Giải thích React");
  await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await page.getByText("Đây là câu trả lời thử nghiệm.").waitFor();
  await page.goto(base + "/vip");
  await page.getByRole("button", { name: "Tiếp tục thanh toán" }).click();
  await page.getByText("Quét mã QR thanh toán").waitFor();
  assert.ok(
    requests.some(
      (req) =>
        req.path === "/payment/sepay/create" &&
        JSON.parse(req.body).planMonths === 3,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: API contracts for search, login, registration/OTP, AI Chat and SePay",
  );
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
