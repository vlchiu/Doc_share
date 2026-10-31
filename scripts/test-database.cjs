// Disposable PostgreSQL cluster only: never reads .env or DATABASE_URL.
const { mkdtempSync, readdirSync, rmSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const bin = process.env.PG_BIN || '/usr/lib/postgresql/14/bin';
const dir = mkdtempSync('/tmp/docshare-security-pg.');
const env = { ...process.env, PGHOST: dir, PGPORT: '55439', PGUSER: 'docshare_test', PGDATABASE: 'source', PGPASSWORD: '', PGSERVICE: '', PGSERVICEFILE: '/dev/null', PGOPTIONS: '', PGSSLMODE: 'disable' };
delete env.PGSERVICE;
delete env.PGSERVICEFILE;
let started = false;
function run(file, args, options = {}) {
  const result = spawnSync(file, args, { cwd: root, env, encoding: 'utf8', ...options });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || `${path.basename(file)} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}
function pg(name, args) { return run(path.join(bin, name), args); }
function sql(db, query) { return pg('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-At', '-d', db, '-c', query]).trim(); }
try {
  pg('initdb', ['-D', path.join(dir, 'data'), '-U', 'docshare_test', '-A', 'trust', '--no-locale']);
  pg('pg_ctl', ['-D', path.join(dir, 'data'), '-l', path.join(dir, 'server.log'), '-o', `-k ${dir} -p 55439 -h ''`, '-w', 'start']);
  started = true;
  pg('createdb', ['source']);
  pg('createdb', ['restored']);
  for (const migration of readdirSync(path.join(root, 'backend/prisma/migrations')).sort()) {
    if (!/^\d/.test(migration)) continue;
    pg('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-d', 'source', '-f', path.join(root, 'backend/prisma/migrations', migration, 'migration.sql')]);
  }
  env.TEST_DATABASE_URL = `postgresql://docshare_test@localhost:55439/source?host=${encodeURIComponent(dir)}`;
  console.log(run(process.execPath, ['backend/test/postgres.integration.js']));
  // Include chat relations and Unicode in the restore fixture.
  sql('source', `INSERT INTO "Conversation" (id,user_id,title,updated_at) SELECT 'restore-chat',id,'Kiểm thử khôi phục',now() FROM "User" ORDER BY id LIMIT 1; INSERT INTO "ChatMessage" (conversation_id,request_id,role,content) VALUES ('restore-chat','restore-request','user','Tài liệu tiếng Việt');`);
  pg('pg_dump', ['-Fc', '-d', 'source', '-f', path.join(dir, 'fixture.dump')]);
  pg('pg_restore', ['--exit-on-error', '--no-owner', '-d', 'restored', path.join(dir, 'fixture.dump')]);
  const tables = sql('source', "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").split('\n');
  for (const table of tables) {
    const quoted = '"' + table.replaceAll('"', '""') + '"';
    const query = `SELECT coalesce(jsonb_agg(row_data ORDER BY row_data::text),'[]'::jsonb)::text FROM (SELECT to_jsonb(t) row_data FROM ${quoted} t) rows`;
    if (sql('source', query) !== sql('restored', query)) throw new Error(`Restore data mismatch: ${table}`);
  }
  const nextId = sql('restored', `INSERT INTO "ChatMessage" (conversation_id,request_id,role,content) VALUES ('restore-chat','after-restore','assistant','Restored') RETURNING id`);
  if (!nextId) throw new Error('Restored sequence unusable');
  console.log(`PASS backup/restore: ${tables.length} tables match; chat and generated ID remain usable.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (started) {
    try { pg('pg_ctl', ['-D', path.join(dir, 'data'), '-m', 'fast', '-w', 'stop']); started = false; }
    catch { console.error('Could not stop disposable cluster; retained temp directory for inspection.'); process.exitCode = 1; }
  }
  if (!started) rmSync(dir, { recursive: true, force: true });
}
