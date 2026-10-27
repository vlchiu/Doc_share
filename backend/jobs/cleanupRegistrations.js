const prisma = require('../db');
const RETENTION_MS = 30 * 60 * 1000;
const INTERVAL_MS = 60 * 1000;

function expiredRegistrationWhere(now) {
  return {
    created_at: { lt: new Date(now.getTime() - RETENTION_MS) },
    is_email_verified: false,
    google_id: null,
    is_active: true,
    role: 'USER',
    plan: 'FREE',
    plan_expires_at: null,
    OR: [{ email_verify_expires: null }, { email_verify_expires: { lte: now } }],
    AND: [{ OR: [{ reset_token_expires: null }, { reset_token_expires: { lte: now } }] }],
    // Preserve legacy accounts with any application data. Never cascade-delete it.
    ...Object.fromEntries([
      'comments', 'documents', 'download_history', 'following', 'followers',
      'notifications', 'payments', 'ratings', 'reports', 'saved_docs',
    ].map(relation => [relation, { none: {} }])),
  };
}

async function cleanupRegistrations({ db = prisma, now = new Date() } = {}) {
  const where = expiredRegistrationWhere(now);
  const candidates = await db.user.findMany({ where, select: { id: true }, orderBy: { id: 'asc' }, take: 500 });
  if (!candidates.length) return { count: 0 };
  // Recheck eligibility at deletion time: verification or Google linking may have raced the scan.
  return db.user.deleteMany({ where: { ...where, id: { in: candidates.map(user => user.id) } } });
}

function startRegistrationCleanup() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const { count } = await cleanupRegistrations();
      if (count) console.log(`Expired registration cleanup: ${count} deleted`);
    } catch (error) {
      // Keep the API running and retry on the next tick. Do not log personal data.
      console.error('Registration cleanup failed:', error.code || error.name);
    } finally { running = false; }
  };
  const interval = setInterval(run, INTERVAL_MS);
  interval.unref();
  return () => clearInterval(interval);
}

module.exports = { cleanupRegistrations, expiredRegistrationWhere, startRegistrationCleanup };
