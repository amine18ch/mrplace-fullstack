const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/wishlist
router.get('/', auth, async (req, res) => {
  const items = await prisma.wishlist.findMany({
    where: { userId: req.user.id },
    include: { product: { include: { seller: true, category: true } } },
  });
  res.json(items.map(i => i.product));
});

// POST /api/wishlist/:productId — toggle
router.post('/:productId', auth, async (req, res) => {
  const productId = parseInt(req.params.productId);
  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: req.user.id, productId } },
  });
  if (existing) {
    await prisma.wishlist.delete({ where: { userId_productId: { userId: req.user.id, productId } } });
    return res.json({ added: false });
  }
  await prisma.wishlist.create({ data: { userId: req.user.id, productId } });
  res.json({ added: true });
});

// GET /api/wishlist/ids — liste des IDs seulement (pour le bouton heart)
router.get('/ids', auth, async (req, res) => {
  const items = await prisma.wishlist.findMany({
    where: { userId: req.user.id },
    select: { productId: true },
  });
  res.json(items.map(i => i.productId));
});

module.exports = router;
