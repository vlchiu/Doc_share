// Derive expiry from the persisted creation time: no schema migration is needed.
const ORDER_TTL_MS = 30 * 60 * 1000;
function expiresAt(payment) {
  const created = new Date(payment.created_at).getTime();
  if (!Number.isFinite(created)) throw new Error('INVALID_PAYMENT_CREATION_TIME');
  return new Date(created + ORDER_TTL_MS);
}
function expired(payment, now = new Date()) { return expiresAt(payment) <= now; }
module.exports = { expiresAt, expired };
