const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const chat = require("./chat-fixture.cjs")();
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem("token", "mock");
      localStorage.setItem("userId", "1");
    });
    await page.route("**/api/**", async (route) => {
      if (new URL(route.request().url()).pathname.startsWith("/src/"))
        return route.continue();
      const path = new URL(route.request().url()).pathname.replace(
        /^.*\/api/,
        "",
      );
      if (await chat.handle(route, path)) return;
      let data = {};
      if (path === "/auth/me")
        data = { id: 1, name: "Test User", role: "USER" };
      if (path === "/notifications")
        data = { notifications: [], unreadCount: 0 };
      if (path === "/documents/9")
        data = { id: 9, title: "Tài liệu thử nghiệm" };
      await route.fulfill({ json: data });
    });
    const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5174";
    await page.goto(base + "/ai-chat");
    await page.getByLabel("Nhập câu hỏi cho AI").fill("Lưu hội thoại đầu tiên");
    await page
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await page.waitForURL(/conversation=/);
    await page
      .getByText("Đây là câu trả lời thử nghiệm.", { exact: true })
      .waitFor();
    const firstURL = page.url();
    await page.reload();
    await page
      .getByText("Đây là câu trả lời thử nghiệm.", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Đổi tên", exact: true }).click();
    await page.getByLabel("Tên hội thoại").fill("Ôn tập hôm nay");
    await page.getByRole("button", { name: "Lưu tên", exact: true }).click();
    await page.getByRole("link", { name: /Ôn tập hôm nay/ }).waitFor();
    chat.loseOnce();
    await page
      .getByLabel("Nhập câu hỏi cho AI")
      .fill("Khôi phục phản hồi bị mất");
    await page
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await page
      .getByText("Khôi phục phản hồi bị mất", { exact: true })
      .waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector('input[aria-label="Nhập câu hỏi cho AI"]')
          ?.value === "",
    );
    assert.equal([...chat.conversations.values()][0].messages.length, 4);
    chat.failOnce();
    await page.getByLabel("Nhập câu hỏi cho AI").fill("Câu hỏi tiếp theo");
    await page
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "AI chưa thể trả lời" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Nhập câu hỏi cho AI").inputValue(),
      "Câu hỏi tiếp theo",
    );
    await page
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await page.getByText("Câu hỏi tiếp theo", { exact: true }).waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector('input[aria-label="Nhập câu hỏi cho AI"]')
          ?.value === "",
    );
    assert.equal([...chat.conversations.values()][0].messages.length, 6);
    await page
      .getByRole("button", { name: "Hội thoại mới", exact: true })
      .click();
    await page.waitForURL(/new=/);
    await page
      .getByRole("heading", {
        name: "Tôi có thể giúp gì cho bạn?",
        exact: true,
      })
      .waitFor();
    await page.getByLabel("Nhập câu hỏi cho AI").fill("Hội thoại thứ hai");
    await page
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await page.waitForURL(/conversation=/);
    await page
      .getByText("Đây là câu trả lời thử nghiệm.", { exact: true })
      .waitFor();
    assert.equal(chat.conversations.size, 2);
    await page.getByRole("link", { name: /Ôn tập hôm nay/ }).click();
    await page.getByText("Câu hỏi tiếp theo", { exact: true }).waitFor();
    assert.equal(page.url(), firstURL);
    // Seed older persisted messages to check UI pagination without spending AI calls.
    const first = [...chat.conversations.values()][0];
    first.messages = Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      role: i % 2 ? "assistant" : "user",
      content: "Tin nhắn " + (i + 1),
    }));
    await page.reload();
    await page
      .getByRole("button", { name: "Tải tin nhắn cũ", exact: true })
      .click();
    await page.getByText("Tin nhắn 1", { exact: true }).waitFor();
    assert.equal(
      await page.getByText("Tin nhắn 11", { exact: true }).count(),
      1,
    );
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Xóa hội thoại", exact: true })
      .click();
    await page.waitForURL(base + "/ai-chat");
    assert.equal(chat.conversations.size, 1);
    await page.goto(base + "/ai-chat?document=9");
    await page.getByLabel("Nhập câu hỏi cho AI").fill("Tóm tắt tài liệu");
    await page
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await page.waitForURL(/conversation=/);
    await page.reload();
    await page
      .getByText("Tài liệu thử nghiệm", { exact: true })
      .first()
      .waitFor();
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 900 });
      if (width === 375)
        await page
          .getByRole("button", { name: "Lịch sử hội thoại", exact: true })
          .click();
      await page
        .getByRole("link", { name: /Hội thoại thứ hai/ })
        .waitFor({ state: "visible" });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "overflow " + width,
      );
    }
    await page.screenshot({
      path: require("node:path").join(require("node:os").tmpdir(), "docshare-chat-history.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS chat create, reload, rename, failed-send retry, isolation, older pagination, delete, document restore, responsive",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
