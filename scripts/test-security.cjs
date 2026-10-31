const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let failed = false;
for (const project of ['backend', 'frontend']) {
  for (const production of [true, false]) {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--json', ...(production ? ['--omit=dev'] : [])], { cwd: path.join(root, project), encoding: 'utf8', shell: process.platform === 'win32', timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
    let report;
    try { report = JSON.parse(result.stdout); } catch { /* Never print raw output/env. */ }
    if (!report?.metadata?.vulnerabilities || report.error) {
      console.error(`${project}: audit unavailable; NOT VERIFIED`); failed = true; continue;
    }
    const v = report.metadata.vulnerabilities;
    console.log(`${project} ${production ? 'production' : 'all'}: low=${v.low}, moderate=${v.moderate}, high=${v.high}, critical=${v.critical}`);
    if (v.high || v.critical) failed = true;
  }
}
const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
if (tracked.status !== 0) { console.error('Git inventory unavailable'); failed = true; }
else {
  const risks = tracked.stdout.split('\0').filter(file => file && !file.includes('/prisma/migrations/') && (/\.(sql|dump|backup|bak)$/i.test(file) || /(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example')));
  for (const file of risks) console.log(`FAIL tracked sensitive artifact: ${file}`);
  if (risks.length) failed = true;
}
process.exitCode = failed ? 1 : 0;
