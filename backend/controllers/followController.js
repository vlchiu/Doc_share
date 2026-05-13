const prisma = require('../db');

// [POST] Toggle follow/unfollow
const toggleFollow = async (req, res) => {
  try {
    const followerId = req.user.userId;
    const followingId = parseInt(req.params.userId);

    if (followerId === followingId) return res.status(400).json({ message: "Không thể tự follow mình" });

    const existing = await prisma.follow.findUnique({
      where: { follower_id_following_id: { follower_id: followerId, following_id: followingId } }
    });

    if (existing) {
      await prisma.follow.delete({
        where: { follower_id_following_id: { follower_id: followerId, following_id: followingId } }
      });
      return res.json({ isFollowing: false, message: "Đã bỏ theo dõi" });
    }

    await prisma.follow.create({ data: { follower_id: followerId, following_id: followingId } });

    // Thông báo cho người được follow
    const follower = await prisma.user.findUnique({ where: { id: followerId }, select: { name: true } });
    prisma.notification.create({
      data: {
        user_id: followingId,
        content: `👤 ${follower.name} đã bắt đầu theo dõi bạn`,
        link: `/users/${followerId}`
      }
    }).catch(() => {});

    res.json({ isFollowing: true, message: "Đã theo dõi" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [GET] Kiểm tra đang follow không + số lượng
const getFollowStatus = async (req, res) => {
  try {
    // Optional auth: lấy userId từ token nếu có
    let currentUserId = null;
    const authHeader = req.header('Authorization');
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const verified = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        currentUserId = verified.userId;
      } catch {} // token lỗi/hết hạn → bỏ qua
    }

    const targetId = parseInt(req.params.userId);

    const [followers, following, isFollowing] = await Promise.all([
      prisma.follow.count({ where: { following_id: targetId } }),
      prisma.follow.count({ where: { follower_id: targetId } }),
      currentUserId ? prisma.follow.findUnique({
        where: { follower_id_following_id: { follower_id: currentUserId, following_id: targetId } }
      }) : Promise.resolve(null)
    ]);

    res.json({ followers, following, isFollowing: !!isFollowing });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [GET] Danh sách followers của user
const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const followers = await prisma.follow.findMany({
      where: { following_id: parseInt(userId) },
      include: { follower: { select: { id: true, name: true, avatar_url: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(followers.map(f => f.follower));
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [GET] Danh sách user đang được follow bởi userId
const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const following = await prisma.follow.findMany({
      where: { follower_id: parseInt(userId) },
      include: { following: { select: { id: true, name: true, avatar_url: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(following.map(f => f.following));
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = { toggleFollow, getFollowStatus, getFollowers, getFollowing };
