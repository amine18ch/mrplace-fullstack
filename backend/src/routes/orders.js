const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, adminAuth } = require('../middleware/auth');
const prisma = new PrismaClient();

// POST /api/orders — passer une commande
router.post('/', auth, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, promoCode, items } = req.body;

    // Valider produits + calculer total
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(400).json({ error: `Produit ${item.productId} introuvable` });
      if (product.stock < item.qty) return res.status(400).json({ error: `Stock insuffisant pour ${product.title}` });
      subtotal += product.price * item.qty;
      orderItems.push({ productId: product.id, qty: item.qty, price: product.price, variant: item.variant || {} });
    }

    // Promo
    let discount = 0;
    if (promoCode) {
      const promo = await prisma.promoCode.findUnique({ where: { code: promoCode.toUpperCase(), isActive: true } });
      if (promo) {
        discount = subtotal * promo.discount;
        await prisma.promoCode.update({ where: { code: promo.code }, data: { uses: { increment: 1 } } });
      }
    }

    const afterDiscount = subtotal - discount;
    const shippingCost = afterDiscount >= 200 ? 0 : 25;
    const vat = afterDiscount * 0.19; // TVA tunisienne 19%
    const total = afterDiscount + shippingCost + vat;

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        subtotal, discount, shippingCost, vat, total,
        promoCode: promoCode?.toUpperCase() || null,
        shippingAddress: JSON.stringify(shippingAddress),
        paymentMethod,
        items: { create: orderItems.map(it => ({ ...it, variant: JSON.stringify(it.variant) })) },
      },
      include: { items: { include: { product: true } } },
    });

    // Décrémenter stock + incrémenter soldCount
    for (const item of orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.qty }, soldCount: { increment: item.qty } },
      });
    }

    // Vider panier
    await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });

    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/orders — mes commandes
router.get('/', auth, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: { include: { product: { select: { title:true, images:true, brand:true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: parseInt(req.params.id), userId: req.user.id },
    include: { items: { include: { product: { include: { seller: true } } } } },
  });
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  res.json(order);
});

// PATCH /api/orders/:id/status — admin only
router.patch('/:id/status', adminAuth, async (req, res) => {
  const order = await prisma.order.update({
    where: { id: parseInt(req.params.id) },
    data: { status: req.body.status },
  });
  res.json(order);
});

// GET /api/orders/admin/all — admin only
router.get('/admin/all', adminAuth, async (req, res) => {
  const { page = 1, status } = req.query;
  const where = status ? { status } : {};
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where, take: 20, skip: (parseInt(page)-1)*20,
      include: { user: { select:{name:true,email:true} }, items: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  res.json({ total, orders });
});

module.exports = router;
