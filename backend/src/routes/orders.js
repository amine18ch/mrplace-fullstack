const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, adminAuth } = require('../middleware/auth');
const prisma = new PrismaClient();

// POST /api/orders — passer une commande
router.post('/', auth, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, promoCode, items } = req.body;

    // Vérifier s'il y a une vente flash active en ce moment
    const now = new Date();
    const activeFlashSale = await prisma.flashSale.findFirst({
      where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
    });
    const flashProductIds = activeFlashSale
      ? new Set(JSON.parse(activeFlashSale.productIds || '[]').map(Number))
      : new Set();

    // Valider produits + calculer total (avec prix flash si applicable)
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(400).json({ error: `Produit ${item.productId} introuvable` });
      if (product.stock < item.qty) return res.status(400).json({ error: `Stock insuffisant pour ${product.title}` });

      // Appliquer le prix flash si le produit est dans la vente flash active
      let effectivePrice = product.price;
      let flashApplied = false;
      if (activeFlashSale && flashProductIds.has(product.id)) {
        effectivePrice = parseFloat((product.price * (1 - activeFlashSale.discountPct / 100)).toFixed(3));
        flashApplied = true;
      }

      subtotal += effectivePrice * item.qty;
      orderItems.push({
        productId: product.id, qty: item.qty,
        price: effectivePrice,  // ← prix réellement facturé (flash ou normal)
        variant: item.variant || {},
        _flashApplied: flashApplied,
        _originalPrice: product.price,
      });
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
        items: { create: orderItems.map(({ _flashApplied, _originalPrice, ...it }) => ({ ...it, variant: JSON.stringify(it.variant) })) },
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

    // Créer un OrderFulfillment par vendeur impliqué dans la commande
    const sellerIds = [...new Set(orderItems.map(i => {
      // Retrouver le sellerId depuis les produits
      return null; // sera fait ci-dessous
    }).filter(Boolean))];
    // Récupérer les sellerIds réels depuis les produits
    const productSellerMap = {};
    for (const item of orderItems) {
      const prod = await prisma.product.findUnique({ where: { id: item.productId }, select: { sellerId: true } });
      if (prod) productSellerMap[prod.sellerId] = true;
    }
    for (const sid of Object.keys(productSellerMap)) {
      await prisma.orderFulfillment.upsert({
        where: { orderId_sellerId: { orderId: order.id, sellerId: parseInt(sid) } },
        create: { orderId: order.id, sellerId: parseInt(sid), status: 'EN_ATTENTE' },
        update: {},
      });
    }

    // Créer l'événement initial (avec note si prix flash appliqué)
    const flashItems = orderItems.filter(i => i._flashApplied);
    const flashNote = activeFlashSale && flashItems.length
      ? ` | Vente flash "${activeFlashSale.name}" -${activeFlashSale.discountPct}% appliquée sur ${flashItems.length} article(s)`
      : '';
    await prisma.orderEvent.create({
      data: { orderId: order.id, status: 'EN_ATTENTE', note: `Commande passée${flashNote}`, createdBy: 'CLIENT' },
    });

    // Award loyalty points (1 point per DT spent)
    await prisma.loyaltyPoint.create({
      data: { userId: req.user.id, points: Math.floor(subtotal), type: 'EARNED', orderId: order.id, note: 'Achat' },
    });

    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/orders — mes commandes
router.get('/', auth, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: {
      items: { include: { product: { select: { title:true, images:true, brand:true, seller: { select: { name:true, slug:true } } } } } },
      events: { orderBy: { createdAt: 'asc' } },
      returnRequest: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders.map(o => ({ ...o, shippingAddress: (() => { try { return JSON.parse(o.shippingAddress); } catch { return {}; } })() })));
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: parseInt(req.params.id), userId: req.user.id },
    include: {
      items: { include: { product: { include: { seller: true } } } },
      events: { orderBy: { createdAt: 'asc' } },
      returnRequest: true,
    },
  });
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  res.json({ ...order, shippingAddress: (() => { try { return JSON.parse(order.shippingAddress); } catch { return {}; } })() });
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
