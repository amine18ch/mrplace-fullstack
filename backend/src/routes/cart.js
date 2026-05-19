const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/cart
router.get('/', auth, async (req, res) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.user.id },
    include: { product: { include: { seller: true, category: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(items);
});

// POST /api/cart — ajouter ou mettre à jour
router.post('/', auth, async (req, res) => {
  const { productId, qty = 1, variant = {} } = req.body;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  if (product.stock < qty) return res.status(400).json({ error: 'Stock insuffisant' });

  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId: req.user.id, productId } },
    update: { qty: { increment: qty }, variant },
    create: { userId: req.user.id, productId, qty, variant },
    include: { product: { include: { seller: true } } },
  });
  res.json(item);
});

// PUT /api/cart/:productId — changer la quantité
router.put('/:productId', auth, async (req, res) => {
  const { qty } = req.body;
  const productId = parseInt(req.params.productId);
  if (qty < 1) {
    await prisma.cartItem.deleteMany({ where: { userId: req.user.id, productId } });
    return res.json({ deleted: true });
  }
  const item = await prisma.cartItem.update({
    where: { userId_productId: { userId: req.user.id, productId } },
    data: { qty },
    include: { product: { include: { seller: true } } },
  });
  res.json(item);
});

// DELETE /api/cart/:productId
router.delete('/:productId', auth, async (req, res) => {
  await prisma.cartItem.deleteMany({
    where: { userId: req.user.id, productId: parseInt(req.params.productId) },
  });
  res.json({ success: true });
});

// DELETE /api/cart — vider le panier
router.delete('/', auth, async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });
  res.json({ success: true });
});

module.exports = router;
