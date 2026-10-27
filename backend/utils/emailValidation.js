const { Resolver } = require('node:dns').promises;

function validEmail(email) {
  if (typeof email !== 'string' || email.length > 254) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length > 0 && local.length <= 64 &&
    /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local) &&
    !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') &&
    domain.includes('.') && domain.split('.').every(label =>
      /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
}

async function checkEmailDomain(email) {
  if (!validEmail(email)) return { status: 400, message: 'Email không đúng định dạng.' };
  const resolver = new Resolver({ timeout: 2000, tries: 1 });
  const domain = email.split('@')[1].toLowerCase();
  const invalid = { status: 400, message: 'Tên miền email không tồn tại hoặc không nhận thư. Vui lòng kiểm tra lại địa chỉ email.' };
  const unavailable = { status: 503, message: 'Chưa kiểm tra được tên miền email. Vui lòng thử lại sau.' };
  try {
    let mx;
    try { mx = await resolver.resolveMx(domain); }
    catch (error) {
      if (error.code === 'ENOTFOUND') return invalid;
      if (error.code !== 'ENODATA') return unavailable;
      mx = [];
    }
    if (mx.length) return mx.some(record => record.exchange && record.exchange !== '.') ? null : invalid;
    // SMTP permits implicit MX via A/AAAA when MX records are absent.
    const addresses = await Promise.allSettled([resolver.resolve4(domain), resolver.resolve6(domain)]);
    if (addresses.some(result => result.status === 'fulfilled' && result.value.length)) return null;
    if (addresses.some(result => result.status === 'rejected' && !['ENODATA', 'ENOTFOUND'].includes(result.reason.code))) return unavailable;
    return invalid;
  } finally { resolver.cancel(); }
}
module.exports = { validEmail, checkEmailDomain };
