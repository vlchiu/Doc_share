const prisma = require('../db');
const fail = (status, message) => Object.assign(new Error(message), { status });
function targetId(req) {
  const raw = req.params.userId;
  if (!/^[1-9]\d*$/.test(String(raw)) || !Number.isSafeInteger(Number(raw))) throw fail(400, 'ID người dùng không hợp lệ.');
  return Number(raw);
}
const wrap = fn => async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try { await fn(req, res); }
  catch (error) { res.status(error.status || 503).json({ message: error.status ? error.message : 'Chưa thể xử lý theo dõi. Vui lòng thử lại.' }); }
};
async function requireUser(db, id) {
  const user = await db.user.findUnique({ where: { id }, select: { id: true, is_active: true } });
  if (!user || !user.is_active) throw fail(404, 'Không tìm thấy người dùng.');
}
function changeFollow(desired) {
  return wrap(async (req, res) => {
    const followingId = targetId(req), followerId = req.user.userId;
    if (followerId === followingId) throw fail(400, 'Không thể tự theo dõi chính mình.');
    const isFollowing = await prisma.$transaction(async tx => {
      // One writer per viewer keeps legacy toggle and explicit set operations consistent.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${followerId} FOR UPDATE`;
      if (desired !== false) await requireUser(tx, followingId);
      const key = { follower_id: followerId, following_id: followingId };
      const existing = await tx.follow.findUnique({ where: { follower_id_following_id: key } });
      const next = desired ?? !existing;
      if (!next) await tx.follow.deleteMany({ where: key });
      else if (!existing) {
        await tx.follow.create({ data: key });
        const follower = await tx.user.findUnique({ where: { id: followerId }, select: { name: true } });
        // Preserve the existing user-follow notification; no collection notifications added.
        await tx.notification.create({ data: { user_id: followingId, content: `👤 ${follower.name} đã bắt đầu theo dõi bạn`, link: `/users/${followerId}` } });
      }
      return next;
    });
    res.json({ isFollowing, message: isFollowing ? 'Đã theo dõi' : 'Đã bỏ theo dõi' });
  });
}
exports.toggleFollow = changeFollow(undefined);
exports.follow = changeFollow(true);
exports.unfollow = changeFollow(false);
exports.getFollowStatus = wrap(async (req, res) => {
  const id = targetId(req), viewer = req.user?.userId;
  await requireUser(prisma, id);
  const [followers, following, relation] = await Promise.all([
    prisma.follow.count({ where: { following_id: id } }),
    prisma.follow.count({ where: { follower_id: id } }),
    viewer ? prisma.follow.findUnique({ where: { follower_id_following_id: { follower_id: viewer, following_id: id } } }) : null,
  ]);
  res.json({ followers, following, isFollowing: !!relation, isSelf: viewer === id });
});
function list(kind) {
  return wrap(async (req, res) => {
    const id = targetId(req), viewer = req.user?.userId;
    await requireUser(prisma, id);
    const relation = kind === 'followers' ? 'follower' : 'following';
    const rows = await prisma.follow.findMany({
      where: kind === 'followers' ? { following_id: id } : { follower_id: id },
      select: { [relation]: { select: { id: true, name: true, avatar_url: true } } },
      orderBy: [{ created_at: 'desc' }, { follower_id: 'asc' }, { following_id: 'asc' }],
    });
    const users = rows.map(row => row[relation]);
    const mine = viewer && users.length ? await prisma.follow.findMany({ where: { follower_id: viewer, following_id: { in: users.map(u => u.id) } }, select: { following_id: true } }) : [];
    const following = new Set(mine.map(row => row.following_id));
    res.json(users.map(user => ({ ...user, isFollowing: following.has(user.id), isSelf: user.id === viewer })));
  });
}
exports.getFollowers = list('followers');
exports.getFollowing = list('following');
