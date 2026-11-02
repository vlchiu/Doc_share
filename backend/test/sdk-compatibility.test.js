const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');

test('Cloudinary v2 and multer adapter retain private upload options and returned file metadata', async () => {
  const original = cloudinary.uploader.upload_stream;
  let options;
  cloudinary.uploader.upload_stream = (opts, done) => {
    options = opts;
    return new Writable({ write(chunk, encoding, next) { next(); }, final(next) {
      done(null, { secure_url: 'https://example.invalid/private.pdf', bytes: 7, public_id: 'docshare/test.pdf' }); next();
    } });
  };
  try {
    const storage = new CloudinaryStorage({ cloudinary, params: async () => ({ resource_type: 'raw', type: 'authenticated', public_id: 'docshare/test.pdf' }) });
    const result = await new Promise((resolve, reject) => storage._handleFile({}, { stream: Readable.from('fixture') }, (error, file) => error ? reject(error) : resolve(file)));
    assert.equal(options.type, 'authenticated');
    assert.equal(options.resource_type, 'raw');
    assert.equal(result.filename, 'docshare/test.pdf');
    assert.equal(result.size, 7);
  } finally { cloudinary.uploader.upload_stream = original; }
});

test('Nodemailer builds UTF-8 confirmation mail locally without SMTP delivery', async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const result = await transport.sendMail({ from: 'DocShare <sender@example.invalid>', to: 'reader@example.invalid', subject: 'Xác nhận VIP', text: 'Thanh toán thành công', html: '<p>Thanh toán thành công</p>' });
  assert.deepEqual(result.envelope.to, ['reader@example.invalid']);
  assert.match(result.message.toString(), /multipart\/alternative/);
  transport.close();
});
