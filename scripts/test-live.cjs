// Read-only authenticated staging smoke + timings. No provider mutations or payments.
const assert = require('node:assert/strict');
async function main() {
  if (process.env.ALLOW_STAGING_TEST !== '1') throw new Error('Set ALLOW_STAGING_TEST=1 and explicit STAGING_API_URL, STAGING_TOKEN_A/B, STAGING_PRIVATE_DOCUMENT_ID. Never use production.');
  const base = new URL(process.env.STAGING_API_URL);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Invalid staging URL');
  const a = process.env.STAGING_TOKEN_A, b = process.env.STAGING_TOKEN_B;
  const id = process.env.STAGING_PRIVATE_DOCUMENT_ID;
  if (!a || !b || !/^\d+$/.test(id || '')) throw new Error('Two staging account tokens and a private document fixture are required');
  const times = [];
  async function get(route, token) {
    const start = performance.now();
    const response = await fetch(`${base.href.replace(/\/$/, '')}${route}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(15000), redirect: 'error' });
    const data = await response.json();
    times.push(performance.now() - start);
    return { status: response.status, data };
  }
  const meA = await get('/auth/me', a), meB = await get('/auth/me', b);
  assert.equal(meA.status, 200); assert.equal(meB.status, 200);
  assert(meA.data.id && meB.data.id && meA.data.id !== meB.data.id, 'Use distinct staging accounts');
  assert.equal(meB.data.role, 'USER', 'Account B must not be admin');
  assert.equal((await get('/auth/me')).status, 401);
  assert.equal((await get('/categories')).status, 200);
  for (let n = 0; n < 5; n++) assert.equal((await get('/documents?limit=4')).status, 200);
  assert.equal((await get(`/documents/${id}`, a)).status, 200);
  assert([403, 404].includes((await get(`/documents/${id}`, b)).status), 'Account B must not read private document A');
  assert([401, 403, 404].includes((await get(`/documents/${id}`)).status));
  assert.equal((await get('/chat/conversations', a)).status, 200);
  assert.equal((await get('/payment/history', a)).status, 200);
  times.sort((x, y) => x - y);
  console.log(`PASS staging API smoke: auth, lists, private document isolation, history. Requests=${times.length}; p50=${Math.round(times[Math.floor(times.length / 2)])}ms; max=${Math.round(times.at(-1))}ms.`);
  console.log('NOT VERIFIED: login/OTP, upload/approval, storage delivery, AI generation, SePay delivery. Timings are a small sequential sample, not a load test.');
}
main().catch(() => { console.error('Staging smoke FAILED: check explicit configuration, fixture permissions and service availability. Tokens and response bodies are not logged.'); process.exitCode = 1; });
