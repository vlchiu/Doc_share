const path = require('path');
const prisma = require('../db');

// Legacy local avatars remain public, but the uploads directory itself does not.
async function legacyAvatar(req, res) {
  const name = req.params.filename;
  if (path.basename(name) !== name || !/\.(png|jpe?g|gif)$/i.test(name)) return res.sendStatus(404);
  try {
    const user = await prisma.user.findFirst({ where: { avatar_url: `/uploads/${name}` }, select: { id: true } });
    if (!user) return res.sendStatus(404);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    return res.sendFile(name, { root: path.resolve(__dirname, '../uploads'), dotfiles: 'deny' }, error => {
      if (error && !res.headersSent) res.sendStatus(404);
    });
  } catch { return res.sendStatus(503); }
}

module.exports = { legacyAvatar };
