const chat = require("./chat-fixture.cjs")();
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
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
    const sharp = require("../../backend/node_modules/sharp");
    const png = await sharp({
      create: { width: 60, height: 40, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    const webp = await sharp(png).webp().toBuffer();
    docs[0].thumbnail_url = "/api/documents/thumbnail/1?v=1";
    let coverRequests = 0;
    await page.route("**/api/documents/thumbnail/1?*", async (route) => {
      assert.equal(
        route.request().headers().authorization,
        "Bearer ui-test-token",
      );
      coverRequests++;
      await route.fulfill({ contentType: "image/webp", body: webp });
    });
    await page.route("**/api/documents/1/cover", async (route) => {
      if (route.request().method() === "POST") {
        assert.ok(
          route
            .request()
            .headers()
            ["content-type"].includes("multipart/form-data"),
        );
        docs[0].thumbnail_url = "/api/documents/thumbnail/1?v=2";
        docs[0].content_version = 2;
        docs[0].status = "PENDING";
      } else {
        docs[0].thumbnail_url = null;
        docs[0].content_version = 3;
      }
      await route.fulfill({
        json: { message: "Đã cập nhật", document: docs[0] },
      });
    });
    await page.goto(base + "/documents");
    const card = page.getByRole("link", {
      name: `Xem tài liệu: ${docs[0].title}`,
      exact: true,
    });
    await card.scrollIntoViewIfNeeded();
    await card.locator("img").waitFor();
    assert.ok(
      (await card.locator("img").getAttribute("src")).startsWith("blob:"),
    );
    assert.ok(coverRequests > 0);
    await page.goto(base + "/documents/1");
    await page.getByText("Quản lý ảnh bìa tài liệu", { exact: true }).click();
    await page
      .getByLabel("Ảnh bìa mới")
      .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
    await page
      .getByRole("button", { name: "Lưu ảnh bìa", exact: true })
      .click();
    await page.getByText("Quản lý ảnh bìa tài liệu", { exact: true }).waitFor();
    // Reload completion collapses the editor; open it again to remove the cover.
    await page.waitForFunction(() => !document.querySelector("details[open]"));
    await page.getByText("Quản lý ảnh bìa tài liệu", { exact: true }).click();
    await page.getByRole("button", { name: "Gỡ ảnh bìa", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector("details[open]"));
    assert.equal(docs[0].thumbnail_url, null);
    assert.ok(
      !requests.some(
        (row) =>
          row.path.includes("proxy-file") || row.path.endsWith("/download"),
      ),
      "Cover consumed original file/download endpoint",
    );
    await page.setViewportSize({ width: 375, height: 850 });
    await page.goto(base + "/ai-chat");
    assert.equal(
      await page.getByLabel("Tìm hội thoại theo tên").isVisible(),
      false,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Tóm tắt tài liệu", exact: true })
        .isVisible(),
      false,
    );
    let held;
    await page.route("**/api/chat/conversations/*/messages", (route) => {
      if (route.request().method() === "POST") {
        held = route;
        return;
      }
      return route.fallback();
    });
    await page.getByLabel("Nhập câu hỏi cho AI").fill("Câu hỏi đang chờ");
    await page
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await page.getByText("Đang gửi · chưa lưu", { exact: true }).waitFor();
    await page.getByText("Câu hỏi đang chờ", { exact: true }).waitFor();
    for (let i = 0; !held && i < 100; i++) await page.waitForTimeout(20);
    assert.ok(held);
    await held.fallback();
    await page.waitForURL(/conversation=/);
    await page
      .getByText("Đây là câu trả lời thử nghiệm.", { exact: true })
      .waitFor();
    assert.equal(
      await page.getByText("Đang gửi · chưa lưu", { exact: true }).count(),
      0,
    );
    await page
      .getByRole("button", { name: "Lịch sử hội thoại", exact: true })
      .click();
    await page.getByLabel("Tìm hội thoại theo tên").fill("không khớp");
    await page.getByRole("button", { name: "Tìm", exact: true }).click();
    await page
      .getByText("Không có hội thoại phù hợp.", { exact: true })
      .waitFor();
    await page.getByLabel("Tìm hội thoại theo tên").fill("Câu hỏi");
    await page.getByRole("button", { name: "Tìm", exact: true }).click();
    await page.getByRole("link", { name: /Câu hỏi đang chờ/ }).waitFor();
    await page
      .getByRole("button", { name: "Lịch sử hội thoại", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Tác vụ và tài liệu", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Tóm tắt tài liệu", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Nhập câu hỏi cho AI").inputValue(),
      "Tóm tắt nội dung chính của tài liệu.",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: require("node:path").join(require("node:os").tmpdir(), "docshare-chat-mobile-refined.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS authenticated cover blobs, upload/remove, no file quota, mobile disclosure, pending bubble and conversation search",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
