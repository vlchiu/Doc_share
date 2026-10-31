const sharp = require("sharp");
const { cloudinary } = require("../middleware/uploadMiddleware");
const { cloudAsset } = require("./documentStorage");
function coverAsset(url) {
  if (typeof url !== "string") return null;
  const asset = cloudAsset(url);
  if (
    !asset ||
    asset.resource_type !== "image" ||
    asset.type !== "authenticated" ||
    asset.format !== "webp" ||
    !/^docshare-covers\/[a-f0-9-]{36}$/.test(asset.publicId)
  )
    return null;
  return asset;
}
let active = 0;
async function normalizeCover(buffer) {
  if (active >= 2)
    throw Object.assign(new Error("COVER_BUSY"), { code: "COVER_BUSY" });
  active++;
  try {
    const input = sharp(buffer, {
      limitInputPixels: 25000000,
      animated: false,
      failOn: "error",
    });
    const meta = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format))
      throw new Error("UNSUPPORTED_COVER");
    const output = await input
      .rotate()
      .resize(600, 400, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    if (output.length > 512 * 1024) throw new Error("COVER_TOO_LARGE");
    return output;
  } finally {
    active--;
  }
}
function storeCover(buffer, id) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        type: "authenticated",
        public_id: `docshare-covers/${id}`,
        format: "webp",
        overwrite: false,
        timeout: 15000,
      },
      (error, result) => (error ? reject(error) : resolve(result.secure_url)),
    );
    stream.end(buffer);
  });
}
function coverSource(url) {
  const asset = coverAsset(url);
  if (!asset) throw new Error("INVALID_COVER");
  return cloudinary.url(asset.publicId, {
    resource_type: "image",
    type: "authenticated",
    version: asset.version,
    format: "webp",
    secure: true,
    sign_url: true,
  });
}
async function deleteCover(url) {
  const asset = coverAsset(url);
  if (asset)
    await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: "image",
      type: "authenticated",
      invalidate: true,
    });
}
module.exports = {
  coverAsset,
  normalizeCover,
  storeCover,
  coverSource,
  deleteCover,
};
