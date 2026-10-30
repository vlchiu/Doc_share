const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers');
const messages = [{ role: 'system', content: 'System' }, { role: 'user', content: 'Question' }];
test('Gemini rejects missing key without contacting provider', async () => {
  const service = loader({ axios: { post() { assert.fail('Unexpected request'); } } })('services/gemini.service.js');
  await assert.rejects(service.complete(messages), /NO_GEMINI_KEY/);
});
test('Gemini rejects blocked, truncated and empty outputs', async () => {
  for (const data of [
    { promptFeedback: { blockReason: 'SAFETY' } },
    { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Partial [1]' }] } }] },
    { candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'Hidden [1]' }] } }] },
  ]) {
    const service = loader({ axios: { post: async () => ({ data }) } }, { GEMINI_API_KEY: 'test' })('services/gemini.service.js');
    await assert.rejects(service.complete(messages), /GEMINI_(INCOMPLETE|EMPTY)_RESPONSE/);
  }
});
test('Gemini forwards cancellation and propagates timeout', async () => {
  const controller = new AbortController();
  const service = loader({ axios: { post: async (url, body, options) => {
    assert.equal(options.signal, controller.signal); assert.equal(options.timeout, 25000);
    throw Object.assign(new Error('Timeout'), { code: 'ECONNABORTED' });
  } } }, { GEMINI_API_KEY: 'test' })('services/gemini.service.js');
  await assert.rejects(service.complete(messages, { signal: controller.signal }), { code: 'ECONNABORTED' });
});
