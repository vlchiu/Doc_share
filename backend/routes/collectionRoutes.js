const router = require('express').Router();

const {
  verifyToken,
  optionalAuth
} = require('../middleware/authMiddleware');

const c = require('../controllers/collectionController');
router.get('/', verifyToken, c.list);
router.post('/', verifyToken, c.create);
router.get('/following', verifyToken, c.following);
router.put('/:id/follow', verifyToken, c.follow);
router.delete('/:id/follow', verifyToken, c.unfollow);
router.get('/:id', optionalAuth, c.read);
router.put('/:id', verifyToken, c.update);
router.delete('/:id', verifyToken, c.remove);
router.post('/:id/items', verifyToken, c.addItem);
router.delete('/:id/items/:documentId', verifyToken, c.removeItem);
router.patch('/:id/items/:documentId', verifyToken, c.moveItem);
module.exports = router;
