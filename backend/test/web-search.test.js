const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { loader } = require('./helpers');
const { normalizeSources } = require('../services/tavily.service');
const { validateSummary } = require('../services/aiSummary.service');
const raw = [{ title: 'Nguồn thật', url: 'https://example.com/article', content: 'Nội dung nghiên cứu.' }];
async function fixture(t, { results = raw, tavilyError, geminiError, reply = 'Nội dung [1].', delay = false } = {}) {
  const calls = [];
  const load = loader({
    'db.js': { user: { findUnique: async ({ where }) => ({ id: where.id, role: 'USER', is_active: true, is_email_verified: true, token_version: 1 }) } },
    axios: { post: async (url, body, options) => {
      calls.push({ url, body, options });
      if (delay) await new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true }));
      if (url.includes('tavily')) { if (tavilyError) throw tavilyError; return { data: { results } }; }
      if (geminiError) throw geminiError;
      return { data: { candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'Internal reasoning' }, { text: reply }] } }] } };
    } },
  }, { TAVILY_API_KEY: 'test-tavily', GEMINI_API_KEY: 'test-gemini', GEMINI_WEB_SEARCH_MODEL: 'test-gemini-model' });
  const app = express(); app.use(express.json()); app.use('/api/web-search', load('routes/webSearchRoutes.js'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/api/web-search`;
  const send = async (body = { query: 'AI giáo dục' }, userId = 1, signal) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json',
      ...(userId ? { Authorization: `Bearer ${jwt.sign({ userId, tokenVersion: 1 }, 'local-test-only')}` } : {}) }, body: JSON.stringify(body), signal });
    return { status: response.status, data: await response.json() };
  };
  return { send, calls };
}
test('success, provider contracts, news filter and per-user cache', async t => {
  const { send, calls } = await fixture(t);
  const result = await send(); assert.equal(result.status, 200); assert.equal(result.data.summaryStatus, 'ok');
  assert.equal(result.data.sources[0].source, 'example.com'); assert.equal(result.data.total, 1);
  assert.equal(calls[0].body.topic, 'general'); assert.equal(calls[0].body.max_results, 10);
  assert.equal(calls[0].options.timeout, 15000); assert.ok(calls[1].url.endsWith('/models/test-gemini-model:generateContent'));
  assert.equal(calls[1].options.headers['x-goog-api-key'], 'test-gemini');
  assert.equal(calls[1].body.generationConfig.maxOutputTokens, 1600);
  assert.equal(calls[1].options.timeout, 25000);
  assert.equal(calls[1].body.contents[0].role, 'user');
  assert.ok(calls[1].body.systemInstruction.parts[0].text.includes('DocShare'));
  assert.ok(!result.data.summary.includes('Internal reasoning'));
  await send(); assert.equal(calls.length, 2); await send(undefined, 2); assert.equal(calls.length, 4);
  await send({ query: 'Tin mới', category: 'news', limit: 2 }); assert.equal(calls[4].body.topic, 'news');
});
test('empty, oversized and invalid categories/limits rejected', async t => {
  const { send, calls } = await fixture(t);
  for (const body of [{ query: '' }, { query: ' ' }, { query: 'a'.repeat(501) }, { query: 12 }, { query: 'x', category: 'academic' }, { query: 'x', limit: 11 }]) assert.equal((await send(body)).status, 400);
  assert.equal(calls.length, 0);
});
test('empty sources skip Gemini', async t => {
  const { send, calls } = await fixture(t, { results: [] });
  const { data } = await send(); assert.equal(data.total, 0); assert.equal(data.summaryStatus, 'insufficient_sources'); assert.equal(calls.length, 1);
});
test('Tavily timeout, rate limit and errors sanitized', async t => {
  for (const [error, status] of [[{ code: 'ECONNABORTED' }, 504], [{ response: { status: 429 }, message: 'secret' }, 503], [new Error('secret'), 502]]) {
    const { send } = await fixture(t, { tavilyError: error }); const result = await send();
    assert.equal(result.status, status); assert.ok(!JSON.stringify(result).includes('secret'));
  }
});
test('Gemini failure retains results without caching failure', async t => {
  const { send, calls } = await fixture(t, { geminiError: new Error('secret') });
  const { data } = await send(); assert.equal(data.total, 1); assert.equal(data.summary, null); assert.equal(data.summaryStatus, 'unavailable');
  await send(); assert.equal(calls.length, 4);
});
test('unauthenticated request denied', async t => {
  const { send, calls } = await fixture(t); assert.equal((await send(undefined, null)).status, 401); assert.equal(calls.length, 0);
});
test('rate limit applies per user including cache hits', async t => {
  const { send } = await fixture(t);
  for (let i = 0; i < 10; i++) assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 429); assert.equal((await send(undefined, 2)).status, 200);
});
test('deduplicate URLs, reject unsafe schemes, bound content', () => {
  const sources = normalizeSources([...raw, { ...raw[0], url: raw[0].url + '?utm_source=test#part' },
    { url: 'javascript:alert(1)' }, { url: 'https://user:pass@example.com' }, { url: 'bad' },
    { url: 'https://example.org', content: 'a'.repeat(2000), published_date: 'bad' }], 10);
  assert.equal(sources.length, 2); assert.equal(sources[1].id, 2); assert.equal(sources[1].snippet.length, 1500); assert.equal(sources[1].publishedAt, null);
});
test('unknown citations and invented URLs rejected', async t => {
  const { send } = await fixture(t, { reply: 'Bịa nguồn [99]' });
  const { data } = await send(); assert.equal(data.summaryStatus, 'unavailable'); assert.equal(data.total, 1);
  for (const text of ['Không trích dẫn', 'https://fake.test [1]', 'Nguồn [0]']) assert.throws(() => validateSummary(text, [{ id: 1 }]));
});
test('disconnect cancels upstream request', async t => {
  const { send, calls } = await fixture(t, { delay: true });
  const controller = new AbortController(); const pending = send(undefined, 1, controller.signal);
  while (!calls.length) await new Promise(resolve => setTimeout(resolve, 5));
  controller.abort(); await assert.rejects(pending); await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(calls[0].options.signal.aborted, true);
});
