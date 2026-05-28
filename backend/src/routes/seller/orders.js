const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { sellerAuth } = require('../../middleware/sellerAuth');
const prisma = new PrismaClient();

router.use(sellerAuth);

// GET /api/seller/orders — commandes contenant des produits du vendeur
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Trouver les IDs de commandes qui contiennent au moins un produit du vendeur
    const sellerItems = await prisma.orderItem.findMany({
      where: { product: { sellerId: req.seller.id } },
      select: { orderId: true },
      distinct: ['orderId'],
    });
    const orderIds = sellerItems.map(i => i.orderId);

    const where = { id: { in: orderIds } };
    if (status) where.status = status;
    if (search) where.id = parseInt(search) || undefined;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: parseInt(limit),
        include: {
          items: { where: { product: { sellerId: req.seller.id } }, include: { product: { select: { id:true, title:true, images:true, price:true } } } },
          user:  { select: { id:true, name:true, email:true, phone:true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    // Parser les adresses
    const parsed = orders.map(o => {
      let addr = {};
      try { addr = JSON.parse(o.shippingAddress); } catch {}
      return {
        ...o,
        shippingAddress: addr,
        items: o.items.map(i => ({
          ...i,
          product: { ...i.product, images: (() => { try { return JSON.parse(i.product.images); } catch { return [i.product.images]; } })() }
        })),
        sellerTotal: o.items.reduce((s, i) => s + i.price * i.qty, 0),
      };
    });

    res.json({ orders: parsed, total, page: parseInt(page) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/seller/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: parseInt(req.params.id), items: { some: { product: { sellerId: req.seller.id } } } },
      include: {
        items: { where: { product: { sellerId: req.seller.id } }, include: { product: { select: { title:true, images:true, price:true, brand:true } } } },
        user:  { select: { name:true, email:true, phone:true } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    let addr = {};
    try { addr = JSON.parse(order.shippingAddress); } catch {}
    res.json({ ...order, shippingAddress: addr });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/seller/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, trackingNumber, note } = req.body;
    const ALLOWED = ['EN_PREPARATION', 'EXPEDIEE'];
    if (!ALLOWED.includes(status)) return res.status(400).json({ error: `Statut autorisé: ${ALLOWED.join(', ')}` });

    const order = await prisma.order.findFirst({
      where: { id: parseInt(req.params.id), items: { some: { product: { sellerId: req.seller.id } } } },
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });

    const data = { status };
    if (trackingNumber) data.trackingNumber = trackingNumber;

    const updated = await prisma.order.update({ where: { id: order.id }, data });
    await prisma.orderEvent.create({
      data: { orderId: order.id, status, note: note || '', createdBy: `SELLER:${req.seller.id}` },
    });
    // Notify client
    await prisma.notification.create({
      data: { userId: order.userId, type: 'ORDER_UPDATE', title: 'Commande mise à jour', message: `Votre commande #${String(order.id).padStart(4,'0')} est maintenant "${status}"`, link: '/orders' },
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
