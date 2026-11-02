// Explicit maintenance task. Dry run by default; never prints URLs or credentials.
require('dotenv').config({ quiet: true });
const prisma = require('../db');
const { cloudAsset, sourceForDocument } = require('../utils/documentStorage');
const { cloudinary } = require('../middleware/uploadMiddleware');
const fs = require('node:fs/promises');
(async () => {
  const apply = process.argv.includes('--apply');
  let cursor = 0, verified = 0, unresolved = 0;
  for (;;) {
    const docs = await prisma.document.findMany({ where: { id: { gt: cursor }, file_size: null }, orderBy: { id: 'asc' }, take: 50 });
    if (!docs.length) break;
    for (const doc of docs) {
      cursor = doc.id;
      try {
        const asset = cloudAsset(doc.file_url);
        const bytes = asset ? (await cloudinary.api.resource(asset.publicId, { resource_type: asset.resource_type, type: asset.type })).bytes : (await fs.stat(sourceForDocument(doc).path)).size;
        if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > 2147483647) throw new Error('Invalid size');
        if (apply) await prisma.document.updateMany({ where: { id: doc.id, file_url: doc.file_url, file_size: null }, data: { file_size: bytes } });
        verified++;
      } catch { unresolved++; console.log(`Unresolved document ID: ${doc.id}`); }
    }
  }
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} verified=${verified}, unresolved=${unresolved}`);
  if (unresolved) process.exitCode = 1;
})().catch(() => { console.error('Backfill failed; no credentials logged.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
