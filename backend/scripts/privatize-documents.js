// Default is a read-only inventory. --apply is an explicit deployment operation.
require('dotenv').config();
const prisma = require('../db');
const { cloudinary } = require('../middleware/uploadMiddleware');
const { cloudAsset } = require('../utils/documentStorage');

async function main() {
  const apply = process.argv.includes('--apply');
  const docs = await prisma.document.findMany({ select: { id: true, file_url: true } });
  let pending = 0, unsupported = 0;
  for (const doc of docs) {
    const asset = cloudAsset(doc.file_url);
    if (!asset) {
      if (doc.file_url.startsWith('/uploads/')) continue; // Protected by backend after cutover.
      unsupported++;
      console.log(`Document ${doc.id}: unsupported storage; review manually.`);
      continue;
    }
    if (asset.type === 'authenticated') continue;
    pending++;
    console.log(`Document ${doc.id}: ${apply ? 'converting' : 'requires conversion'}`);
    if (!apply) continue;
    let moved;
    try {
      moved = await cloudinary.uploader.rename(asset.publicId, asset.publicId, {
        resource_type: asset.resource_type, type: asset.type, to_type: 'authenticated', invalidate: true,
      });
    } catch (error) {
      // Resume if the provider move succeeded but a previous database update failed.
      if (error.http_code !== 404) throw error;
      moved = await cloudinary.api.resource(asset.publicId, { resource_type: asset.resource_type, type: 'authenticated' });
    }
    await prisma.document.update({ where: { id: doc.id }, data: { file_url: moved.secure_url, thumbnail_url: null } });
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'read-only', pending, unsupported }));
  if (unsupported) process.exitCode = 1;
}
main().catch(error => { console.error('Conversion failed:', error.code || error.name || 'provider error'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
