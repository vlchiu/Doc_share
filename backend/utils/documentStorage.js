const path = require('path');
const { cloudinary } = require('../middleware/uploadMiddleware');

function cloudAsset(fileUrl) {
  let url;
  try { url = new URL(fileUrl); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const [cloud, resource_type, type, ...delivery] = parts;
  // Cloudinary includes a delivery signature in secure_url for authenticated assets.
  // Parse the asset identity, then generate our own signed URL when serving it.
  if (/^s--[A-Za-z0-9_-]+--$/.test(delivery[0] || '')) delivery.shift();
  const [version, ...rest] = delivery;
  if (cloud !== process.env.CLOUDINARY_CLOUD_NAME || !['raw', 'image'].includes(resource_type) ||
      !['upload', 'authenticated', 'private'].includes(type) || !/^v\d+$/.test(version) || !rest.length) return null;
  let publicId;
  try { publicId = decodeURIComponent(rest.join('/')); } catch { return null; }
  const format = publicId.split('.').pop();
  if (resource_type === 'image') publicId = publicId.replace(/\.[^/.]+$/, '');
  return { publicId, resource_type, type, version: Number(version.slice(1)), format };
}

function sourceForDocument(doc) {
  const asset = cloudAsset(doc.file_url);
  if (asset) {
    return { url: cloudinary.url(asset.publicId, {
      resource_type: asset.resource_type, type: asset.type, version: asset.version,
      ...(asset.resource_type === 'image' ? { format: asset.format } : {}),
      secure: true, sign_url: true,
    }) };
  }
  if (typeof doc.file_url === 'string' && doc.file_url.startsWith('/uploads/')) {
    const root = path.resolve(__dirname, '../uploads');
    const target = path.resolve(root, doc.file_url.slice('/uploads/'.length));
    if (target.startsWith(root + path.sep)) return { path: target };
  }
  throw new Error('Unsupported document storage location');
}

async function deleteStoredFile(fileUrl) {
  const asset = cloudAsset(fileUrl);
  if (asset) return cloudinary.uploader.destroy(asset.publicId, { resource_type: asset.resource_type, type: asset.type, invalidate: true });
}

module.exports = { cloudAsset, sourceForDocument, deleteStoredFile };
