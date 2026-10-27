const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');

function loader(mocks = {}, env = {}) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const realRequire = createRequire(filename);
    const customRequire = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      const resolved = realRequire.resolve(name);
      const relative = path.relative(root, resolved);
      if (Object.hasOwn(mocks, relative)) return mocks[relative];
      if (resolved.startsWith(root + path.sep) && !resolved.includes('/node_modules/') && resolved.endsWith('.js')) return load(relative);
      return realRequire(name);
    };
    const context = { require: customRequire, module, exports: module.exports, __dirname: path.dirname(filename),
      process: { env: { JWT_SECRET: 'local-test-only', ...env } }, Buffer, URL, console: { log() {}, warn() {}, error() {} },
      setTimeout, clearTimeout };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
    return module.exports;
  }
  return load;
}
function response() {
  return { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }, send(data) { this.data = data; return this; },
    setHeader(k, v) { this.headers[k] = v; }, redirect(url) { this.url = url; return this; } };
}
function match(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some(item => match(row, item));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('gt' in value) return row[key] > value.gt;
      if ('gte' in value) return row[key] >= value.gte;
      if ('in' in value) return value.in.includes(row[key]);
    }
    return row[key] === value;
  });
}
function database(seed = {}) {
  let state = structuredClone({ user: [], payment: [], sepayReceipt: [], document: [], downloadHistory: [], ...seed });
  const db = {};
  for (const model of Object.keys(state)) {
    db[model] = {
      async findUnique({ where }) { return structuredClone(state[model].find(row => match(row, where)) || null); },
      async findFirst(args) { return this.findUnique(args); },
      async findMany({ where = {} } = {}) { return structuredClone(state[model].filter(row => match(row, where))); },
      async create({ data }) {
        if (state[model].some(row => data.id !== undefined && row.id === data.id)) throw Object.assign(new Error('Duplicate'), { code: 'P2002' });
        const row = { id: state[model].length + 1, ...(model === 'user' ? { is_active: true, token_version: 1, is_email_verified: false } : {}), ...structuredClone(data) };
        state[model].push(row); return structuredClone(row);
      },
      async updateMany({ where, data }) {
        let count = 0;
        for (const row of state[model].filter(row => match(row, where))) {
          for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === 'object' && 'increment' in value ? (row[key] || 0) + value.increment : structuredClone(value);
          count++;
        }
        return { count };
      },
      async update(args) { const row = await this.findUnique({ where: args.where }); if (!row) throw new Error('Missing row'); await this.updateMany(args); return this.findUnique({ where: { id: row.id } }); },
    };
  }
  let queue = Promise.resolve();
  db.$transaction = work => {
    const run = queue.then(async () => {
      const before = structuredClone(state);
      try { return await work(db); } catch (error) { state = before; throw error; }
    });
    queue = run.catch(() => {});
    return run;
  };
  db.snapshot = () => structuredClone(state);
  return db;
}
module.exports = { loader, response, database };
