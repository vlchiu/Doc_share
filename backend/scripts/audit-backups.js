// Read only: never print dump rows, credentials, remote URLs, or environment values.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '../..');
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
let findings = 0;
for (const file of tracked.filter(f => /\.(sql|dump|backup|bak)$/i.test(f) && !f.includes('/prisma/migrations/'))) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) continue;
  console.log('Tracked backup:', file);
  findings++;
  if (!file.endsWith('.sql')) continue;
  const text = fs.readFileSync(full, 'utf8');
  for (const match of text.matchAll(/^COPY public\."?(\w+)"? \(([^\n]+)\) FROM stdin;\r?\n([\s\S]*?)^\\\./gm)) {
    const columns = match[2].split(', ');
    const rows = match[3].trim() ? match[3].trim().split('\n').map(row => row.split('\t')) : [];
    const sensitive = columns.filter(c => /password|token|email/i.test(c));
    console.log(JSON.stringify({ table: match[1], rows: rows.length,
      nonemptySensitiveFields: Object.fromEntries(sensitive.map(c => [c, rows.filter(row => row[columns.indexOf(c)] && row[columns.indexOf(c)] !== '\\N').length])) }));
  }
}
console.log(findings ? `${findings} backup(s) still tracked. Ignore rules do not remove Git history.` : 'No tracked database backups detected.');
process.exitCode = findings ? 1 : 0;
