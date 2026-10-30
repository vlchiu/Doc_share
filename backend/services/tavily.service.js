const axios = require('axios');

function normalizeSources(results, limit) {
  const seen = new Set();
  const sources = [];
  for (const item of results) {
    if (!item || typeof item.url !== 'string' || item.url.length > 2048) continue;
    let url;
    try { url = new URL(item.url); } catch { continue; }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) continue;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    const key = url.href.replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    const date = typeof item.published_date === 'string' ? Date.parse(item.published_date) : NaN;
    sources.push({ id: sources.length + 1, url: url.href,
      title: typeof item.title === 'string' ? item.title.slice(0, 300) : url.hostname,
      snippet: typeof item.content === 'string' ? item.content.slice(0, 1500) : '',
      source: url.hostname, publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : null });
    if (sources.length >= limit) break;
  }
  return sources;
}
async function search({ query, category, limit }, signal) {
  if (!process.env.TAVILY_API_KEY) throw Object.assign(new Error('Search unavailable'), { code: 'SEARCH_NOT_CONFIGURED' });
  const response = await axios.post('https://api.tavily.com/search', {
    query, topic: category === 'news' ? 'news' : 'general', max_results: limit,
    search_depth: 'basic', include_answer: false, include_raw_content: false,
    include_images: false,
  }, {
    headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    timeout: 15000, signal, maxRedirects: 0, maxContentLength: 1024 * 1024,
  });
  if (!Array.isArray(response.data?.results)) throw new Error('Invalid search response');
  return normalizeSources(response.data.results, limit);
}
module.exports = { search, normalizeSources };
