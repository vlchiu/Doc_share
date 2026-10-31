const { test } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { loader, response } = require("./helpers");
const ID = "11111111-1111-4111-8111-111111111111";
const url = `https://res.cloudinary.com/test/image/authenticated/v1/docshare-covers/${ID}.webp`;
function utils() {
  return loader(
    {
      "../middleware/uploadMiddleware": {
        cloudinary: { url: (id, options) => ({ id, options }) },
      },
    },
    { CLOUDINARY_CLOUD_NAME: "test" },
  )("utils/documentCover.js");
}
test("cover normalization emits bounded WebP with no EXIF; SVG and invalid bytes rejected", async () => {
  const service = utils();
  const input = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: "blue" },
  })
    .png()
    .withMetadata()
    .toBuffer();
  const output = await service.normalizeCover(input);
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 600);
  assert.equal(meta.height, 400);
  assert.equal(meta.exif, undefined);
  await assert.rejects(
    service.normalizeCover(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="5" height="5"></svg>',
      ),
    ),
  );
  await assert.rejects(service.normalizeCover(Buffer.from("not an image")));
});
test("only separately stored authenticated WebP covers can be delivered", () => {
  const service = utils();
  assert.ok(service.coverAsset(url));
  assert.equal(service.coverSource(url).options.sign_url, true);
  for (const bad of [
    null,
    "https://evil.test/a.webp",
    url.replace("/docshare-covers/", "/docshare/"),
    url.replace("/authenticated/", "/upload/"),
    url.replace("/test/", "/other/"),
    url.replace(".webp", ".pdf"),
  ])
    assert.equal(service.coverAsset(bad), null);
});
function controller({ changed = 1, latest = null } = {}) {
  const doc = {
    id: 4,
    user_id: 1,
    content_version: 2,
    status: "APPROVED",
    thumbnail_url: url,
    deleted_at: null,
    removed_by_admin: false,
  };
  const calls = [];
  const data = Buffer.from("RIFF0000WEBPcover");
  const db = {
    document: {
      findUnique: async () => latest || doc,
      updateMany: async (args) => {
        calls.push(args);
        return { count: changed };
      },
    },
  };
  const ctrl = loader({
    "../db": db,
    axios: { get: async () => ({ data }) },
    "../utils/documentCover": {
      normalizeCover: async (b) => b,
      storeCover: async () => url,
      coverSource: () => "https://safe.test/cover",
      deleteCover: async (value) => calls.push({ deleted: value }),
    },
  })("controllers/coverController.js");
  return {
    ctrl,
    doc,
    calls,
    req: {
      document: doc,
      user: { userId: 1, role: "USER" },
      file: { buffer: Buffer.from("image") },
    },
  };
}
test("cover update requires reapproval, clears moderation and guards version/owner", async () => {
  const ctx = controller();
  const res = response();
  await ctx.ctrl.update(ctx.req, res);
  assert.equal(res.statusCode, 200);
  const change = ctx.calls[0];
  assert.equal(change.where.user_id, 1);
  assert.equal(change.where.content_version, 2);
  assert.equal(change.data.status, "PENDING");
  assert.equal(change.data.ai_moderation_result, null);
  assert.equal(change.data.content_version.increment, 1);
});
test("conflicting document edit removes orphan uploaded cover", async () => {
  const ctx = controller({ changed: 0 });
  const res = response();
  await ctx.ctrl.update(ctx.req, res);
  assert.equal(res.statusCode, 409);
  assert.ok(ctx.calls.some((row) => row.deleted === url));
});
test("read sends only cover bytes, no-store and no download mutation", async () => {
  const ctx = controller();
  const res = response();
  await ctx.ctrl.read(ctx.req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "image/webp");
  assert.equal(res.headers["Cache-Control"], "private, no-store");
  assert.equal(ctx.calls.length, 0);
});
test("revoked access while fetching the cover rejects response", async () => {
  const ctx = controller({
    latest: {
      id: 4,
      status: "APPROVED",
      deleted_at: new Date(),
      thumbnail_url: url,
    },
  });
  const res = response();
  await ctx.ctrl.read(ctx.req, res);
  assert.equal(res.statusCode, 403);
});
