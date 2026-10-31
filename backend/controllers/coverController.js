const prisma = require("../db");
const axios = require("axios");
const { randomUUID } = require("node:crypto");
const { canReadDocument, publicDocument } = require("../utils/documentAccess");
const {
  normalizeCover,
  storeCover,
  coverSource,
  deleteCover,
} = require("../utils/documentCover");
const missing = (res) => res.status(404).json({ message: "Chưa có ảnh bìa." });
exports.read = async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const doc = req.document;
    if (!doc.thumbnail_url) return missing(res);
    let url;
    try {
      url = coverSource(doc.thumbnail_url);
    } catch {
      return missing(res);
    }
    const result = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      maxRedirects: 0,
      maxContentLength: 512 * 1024,
    });
    const bytes = Buffer.from(result.data);
    if (
      bytes.toString("ascii", 0, 4) !== "RIFF" ||
      bytes.toString("ascii", 8, 12) !== "WEBP"
    )
      throw new Error("INVALID_IMAGE");
    const latest = await prisma.document.findUnique({ where: { id: doc.id } });
    if (
      !canReadDocument(latest, req.user) ||
      latest.thumbnail_url !== doc.thumbnail_url
    )
      return res
        .status(403)
        .json({ message: "Quyền hoặc ảnh bìa đã thay đổi." });
    res.setHeader("Content-Type", "image/webp");
    return res.send(bytes);
  } catch {
    return res.status(503).json({ message: "Chưa tải được ảnh bìa." });
  }
};
exports.update = async (req, res) => {
  let uploaded;
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ message: "Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB." });
    let bytes;
    try {
      bytes = await normalizeCover(req.file.buffer);
    } catch (error) {
      if (error.code === "COVER_BUSY")
        return res
          .status(429)
          .json({
            message: "Hệ thống đang xử lý ảnh khác. Vui lòng thử lại sau.",
          });
      return res
        .status(400)
        .json({
          message:
            "Ảnh không hợp lệ hoặc quá lớn. Chọn JPG, PNG hoặc WebP tối đa 25 triệu điểm ảnh.",
        });
    }
    uploaded = await storeCover(bytes, randomUUID());
    const doc = req.document;
    const changed = await prisma.document.updateMany({
      where: {
        id: doc.id,
        content_version: doc.content_version,
        deleted_at: null,
        removed_by_admin: false,
        ...(req.user.role === "ADMIN" ? {} : { user_id: req.user.userId }),
      },
      data: {
        thumbnail_url: uploaded,
        status: "PENDING",
        reject_reason: null,
        ai_moderation_result: null,
        content_version: { increment: 1 },
      },
    });
    if (!changed.count) {
      await deleteCover(uploaded);
      uploaded = null;
      return res
        .status(409)
        .json({
          message:
            "Tài liệu đã thay đổi. Tải lại trang trước khi cập nhật ảnh bìa.",
        });
    }
    uploaded = null; // DB owns the new cover from this point.
    await deleteCover(doc.thumbnail_url).catch(() => {});
    const result = await prisma.document.findUnique({ where: { id: doc.id } });
    return res.json({
      message: "Đã cập nhật ảnh bìa. Tài liệu cần được duyệt lại.",
      document: publicDocument(result),
    });
  } catch {
    if (uploaded) {
      // A lost DB response may hide a committed write: only delete a known orphan.
      const current = await prisma.document
        .findUnique({ where: { id: req.document.id } })
        .catch(() => undefined);
      if (current !== undefined && current?.thumbnail_url !== uploaded)
        await deleteCover(uploaded).catch(() => {});
    }
    return res
      .status(503)
      .json({ message: "Chưa lưu được ảnh bìa. Vui lòng thử lại." });
  }
};
exports.remove = async (req, res) => {
  try {
    const doc = req.document;
    const changed = await prisma.document.updateMany({
      where: {
        id: doc.id,
        content_version: doc.content_version,
        deleted_at: null,
        removed_by_admin: false,
        ...(req.user.role === "ADMIN" ? {} : { user_id: req.user.userId }),
      },
      data: { thumbnail_url: null, content_version: { increment: 1 } },
    });
    if (!changed.count)
      return res
        .status(409)
        .json({ message: "Tài liệu đã thay đổi. Vui lòng tải lại." });
    await deleteCover(doc.thumbnail_url).catch(() => {});
    return res.json({ message: "Đã gỡ ảnh bìa." });
  } catch {
    return res.status(503).json({ message: "Chưa gỡ được ảnh bìa." });
  }
};
