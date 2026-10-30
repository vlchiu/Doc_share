const axios = require('axios');

// Reuse AI Chat's Gemini key and first-choice model. REST keeps cancellation
// and timeouts explicit without adding a second Gemini SDK dependency.
async function complete(messages, { signal, maxTokens = 1600, temperature = 0.2 } = {}) {
  if (!process.env.GEMINI_API_KEY) throw new Error('NO_GEMINI_KEY');
  const model = process.env.GEMINI_WEB_SEARCH_MODEL || 'gemini-3.5-flash-lite';
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('INVALID_GEMINI_MODEL');
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      systemInstruction: { parts: messages.filter(message => message.role === 'system').map(message => ({ text: message.content })) },
      contents: messages.filter(message => message.role !== 'system').map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }],
      })),
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    },
    {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      timeout: 25000, signal, maxRedirects: 0, maxContentLength: 256 * 1024,
    }
  );
  const candidate = response.data?.candidates?.[0];
  if (response.data?.promptFeedback?.blockReason || candidate?.finishReason !== 'STOP') {
    throw new Error('GEMINI_INCOMPLETE_RESPONSE');
  }
  const reply = (candidate.content?.parts || [])
    .filter(part => !part.thought && typeof part.text === 'string')
    .map(part => part.text).join('');
  if (!reply.trim()) throw new Error('GEMINI_EMPTY_RESPONSE');
  return { reply, modelUsed: model };
}
module.exports = { complete };
