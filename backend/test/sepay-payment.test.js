const test = require('node:test');
const assert = require('node:assert/strict');
const { loader, response, database } = require('./helpers');
const env = { SEPAY_WEBHOOK_KEY: 'test-key', SEPAY_ACCOUNT_NUMBER: '000123', SEPAY_ACCOUNT_NAME: 'TEST ACCOUNT', SEPAY_BANK_CODE: 'TEST' };
function setup(overrides = {}) {
  const db = database({ user: [{ id: 1, email: 'test@example.invalid', name: 'Test', is_active: true, plan: 'FREE' }] });
  const emails = [];
  const controller = loader({ 'db.js': db, 'utils/emailService.js': { sendVIPConfirmEmail: async (...args) => { emails.push(args); } } }, { ...env, ...overrides })('controllers/sepayController.js');
  async function create(body = { planMonths: 1 }) {
    const res = response();
    await controller.createSepayPayment({ body, user: { userId: 1 } }, res);
    // The in-memory helper does not implement Prisma schema defaults.
    for (const row of db.snapshot().payment) if (!row.status) await db.payment.update({ where: { id: row.id }, data: { status: 'PENDING' } });
    return res;
  }
  async function webhook(body) {
    const res = response();
    await controller.sepayWebhook({ headers: { authorization: 'Apikey test-key' }, body }, res);
    return res;
  }
  const event = (order, extra = {}) => ({ id: 123, transferType: 'in', accountNumber: env.SEPAY_ACCOUNT_NUMBER, transferAmount: order.amount, content: order.transferContent, ...extra });
  return { db, controller, create, webhook, event, emails };
}

test('SePay QR uses server prices for all plans and ignores client amount, account and owner', async () => {
  const ctx = setup();
  const ids = new Set();
  for (const [months, amount] of [[1, 29000], [3, 79000], [12, 249000]]) {
    const res = await ctx.create({ planMonths: months, amount: 1, userId: 999, accountNumber: 'attacker' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.amount, amount);
    assert.match(res.data.orderId, /^SEPAY[A-F0-9]{24}$/);
    ids.add(res.data.orderId);
    const qr = new URL(res.data.qrUrl);
    assert.equal(qr.searchParams.get('amount'), String(amount));
    assert.equal(qr.searchParams.get('addInfo'), res.data.orderId);
    assert.equal(qr.searchParams.get('accountName'), env.SEPAY_ACCOUNT_NAME);
    assert(qr.pathname.includes(env.SEPAY_ACCOUNT_NUMBER));
    const saved = ctx.db.snapshot().payment.at(-1);
    assert.equal(saved.user_id, 1);
    assert.equal(saved.amount, amount);
    assert.equal(saved.plan_months, months);
  }
  assert.equal(ids.size, 3);
});

test('unsupported plans and incomplete configuration create no orders', async () => {
  const ctx = setup();
  for (const planMonths of [0, -1, 2, 1.5, '1', null]) assert.equal((await ctx.create({ planMonths })).statusCode, 400);
  assert.equal(ctx.db.snapshot().payment.length, 0);
  for (const name of Object.keys(env)) {
    const incomplete = setup({ [name]: '' });
    assert.equal((await incomplete.create()).statusCode, 503);
    assert.equal(incomplete.db.snapshot().payment.length, 0);
  }
});

test('personal transfers with the exact VIP price are acknowledged but never activate or send email', async () => {
  const ctx = setup();
  const { data: order } = await ctx.create();
  for (const [index, content] of ['Tien sinh hoat', 'Tra tien an', ''].entries()) {
    const res = await ctx.webhook(ctx.event(order, { id: 200 + index, content }));
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
  }
  const state = ctx.db.snapshot();
  assert.equal(state.payment[0].status, 'PENDING');
  assert.equal(state.user[0].plan, 'FREE');
  assert(state.sepayReceipt.every(r => r.status === 'UNMATCHED' && r.reason === 'MISSING_OR_AMBIGUOUS_ORDER'));
  assert.equal(ctx.emails.length, 0);
});

test('created order can be paid once; repeated deliveries and a second transfer do not extend VIP again', async () => {
  const ctx = setup();
  const { data: order } = await ctx.create();
  const event = ctx.event(order, { content: `Chuyen tien ${order.transferContent} thanh toan` });
  assert.equal((await ctx.webhook(event)).data.success, true);
  const expiry = ctx.db.snapshot().user[0].plan_expires_at.getTime();
  for (let i = 0; i < 3; i++) await ctx.webhook(event);
  await ctx.webhook({ ...event, id: 124 });
  const state = ctx.db.snapshot();
  assert.equal(state.payment[0].status, 'SUCCESS');
  assert.equal(state.user[0].plan, 'VIP');
  assert.equal(state.user[0].plan_expires_at.getTime(), expiry);
  assert.equal(state.sepayReceipt.filter(r => r.status === 'APPLIED').length, 1);
  assert.equal(state.sepayReceipt.at(-1).reason, 'ORDER_NOT_PENDING');
  assert.equal(ctx.emails.length, 1);
});

test('conflicting code and content cannot apply either pending order', async () => {
  const ctx = setup();
  const { data: first } = await ctx.create();
  const { data: second } = await ctx.create();
  await ctx.webhook(ctx.event(first, { code: second.orderId }));
  assert(ctx.db.snapshot().payment.every(row => row.status === 'PENDING'));
  assert.equal(ctx.db.snapshot().sepayReceipt[0].reason, 'MISSING_OR_AMBIGUOUS_ORDER');
  assert.equal(ctx.emails.length, 0);
});

test('underpayment and overpayment preserve pending order; a separate exact payment succeeds', async () => {
  const ctx = setup();
  const { data: order } = await ctx.create();
  for (const [index, amount] of [order.amount - 1, order.amount + 1].entries()) {
    await ctx.webhook(ctx.event(order, { id: 300 + index, transferAmount: amount }));
    assert.equal(ctx.db.snapshot().payment[0].status, 'PENDING');
    assert.equal(ctx.db.snapshot().sepayReceipt.at(-1).reason, 'AMOUNT_MISMATCH');
  }
  await ctx.webhook(ctx.event(order));
  assert.equal(ctx.db.snapshot().payment[0].status, 'SUCCESS');
  assert.equal(ctx.emails.length, 1);
});

test('disabled account cannot receive VIP even with a matching payment', async () => {
  const ctx = setup();
  const { data: order } = await ctx.create();
  await ctx.db.user.update({ where: { id: 1 }, data: { is_active: false } });
  await ctx.webhook(ctx.event(order));
  assert.equal(ctx.db.snapshot().payment[0].status, 'PENDING');
  assert.equal(ctx.db.snapshot().sepayReceipt[0].reason, 'ACCOUNT_UNAVAILABLE');
  assert.equal(ctx.emails.length, 0);
});

test('status polling returns persisted success only to the order owner with no-store', async () => {
  const ctx = setup();
  const { data: order } = await ctx.create();
  await ctx.webhook(ctx.event(order));
  for (const userId of [1, 2]) {
    const res = response();
    await ctx.controller.checkPaymentStatus({ params: { orderId: order.orderId }, user: { userId } }, res);
    assert.equal(res.statusCode, userId === 1 ? 200 : 404);
    if (userId === 1) {
      assert.equal(res.data.status, 'SUCCESS');
      assert.equal(res.headers['Cache-Control'], 'no-store');
    } else assert.equal(res.data.status, undefined);
  }
});
