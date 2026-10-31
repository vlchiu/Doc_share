const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const children = new Set();
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function start(command, args, cwd = root, env = process.env) {
  const child = spawn(command, args, { cwd, env, stdio: 'inherit', detached: process.platform !== 'win32', shell: process.platform === 'win32' });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}
function stop() {
  for (const child of children) {
    try {
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      else process.kill(-child.pid, 'SIGTERM');
    } catch { /* Already stopped. */ }
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stop(); process.exit(130); });
function run(command, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = start(command, args, cwd, env);
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} failed (${code})`)));
  });
}
const front = path.join(root, 'frontend');
// Build browser fixtures against a non-live API origin. All API calls are mocked by suites.
const testEnv = { ...process.env, VITE_API_URL: 'http://127.0.0.1:59999' };
async function build() { await run(npm, ['run', 'build'], front, testEnv); }
async function browser() {
  const { pathToFileURL } = require('node:url');
  const { preview } = await import(pathToFileURL(path.join(front, 'node_modules/vite/dist/node/index.js')).href);
  const server = await preview({ root: front, preview: { host: '127.0.0.1', port: 4174, strictPort: true } });
  try {
    const env = { ...process.env, TEST_BASE_URL: 'http://127.0.0.1:4174' };
    for (const suite of ['docshare-ui', 'ux-improvements', 'chat-history', 'covers-mobile', 'stability', 'web-search']) {
      await run(process.execPath, [`test/${suite}.browser.cjs`], front, env);
    }
  } finally { await new Promise(resolve => server.httpServer.close(resolve)); }
}
(async () => {
  const mode = process.argv[2];
  if (mode === 'dev') {
    require(path.join(root, 'backend/node_modules/dotenv')).config({ path: path.join(root, 'backend/.env'), quiet: true });
    const port = Number(process.env.PORT || 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid backend PORT');
    const env = { ...process.env, ALLOWED_ORIGINS: [...new Set([...(process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean), 'http://localhost:5173'])].join(',') };
    const backend = start(npm, ['run', 'dev'], path.join(root, 'backend'), env);
    const frontend = start(npm, ['run', 'dev'], front, { ...env, VITE_API_URL: `http://localhost:${port}` });
    for (const child of [backend, frontend]) {
      child.once('error', error => { console.error(error.message); stop(); process.exitCode = 1; });
      child.once('exit', code => { stop(); process.exitCode = code || 0; });
    }
    return;
  }
  if (!['test', 'browser', 'all'].includes(mode)) throw new Error('Use npm run dev, npm test, npm run test:browser or npm run test:all');
  if (mode !== 'browser') {
    await run(npm, ['test'], path.join(root, 'backend'));
    await run(npm, ['run', 'lint'], front);
    await run(process.execPath, ['--test', 'test/sequential-poller.test.mjs'], front);
  }
  await build();
  if (mode !== 'test') await browser();
})().catch(error => { console.error(error.message); stop(); process.exitCode = 1; });
