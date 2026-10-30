const axios = require('axios');

async function complete(messages, { signal, maxTokens = 2048, temperature = 0.7 } = {}) {
  if (!process.env.GROQ_API_KEY) throw new Error('NO_GROQ_KEY');
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model, messages, max_tokens: maxTokens, temperature,
  }, {
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 25000, signal, maxRedirects: 0, maxContentLength: 256 * 1024,
  });
  return { reply: response.data.choices?.[0]?.message?.content || '', modelUsed: model };
}
module.exports = { complete };
