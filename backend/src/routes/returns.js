const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const prisma = new PrismaClient();

// Client: request a return
router.post('/', auth, async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;
    const order = await prisma.order.findFirst({
      where: { id: parseInt(orderId), userId: req.user.id },
      include: { items: { include: { product: { select: { sellerId: true } } } }, returnRequest: true },
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.returnRequest) return res.status(400).json({ error: 'Retour déjà demandé pour cette commande' });
    if (!['LIVREE'].includes(order.status)) return res.status(400).json({ error: 'Le retour est uniquement possible après livraison' });

    const daysSinceDelivery = (Date.now() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 14) return res.status(400).json({ error: 'La période de retour de 14 jours est dépassée' });

    const sellerId = order.items[0]?.product?.sellerId || 0;
    const ret = await prisma.returnRequest.create({
      data: { orderId: order.id, userId: req.user.id, sellerId, reason, description: description || '' },
    });
    // Notify seller
    await prisma.notification.create({
      data: { sellerId, type: 'RETURN', title: 'Demande de retour', message: `Retour demandé pour commande #${String(order.id).padStart(4,'0')}`, link: '/seller/returns' },
    });
    await prisma.orderEvent.create({
      data: { orderId: order.id, status: 'RETOUR_DEMANDE', note: `Raison: ${reason}`, createdBy: 'CLIENT' },
    });
    res.json(ret);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Client: list own returns
router.get('/', auth, async (req, res) => {
  try {
    const returns = await prisma.returnRequest.findMany({
      where: { userId: req.user.id },
      include: { order: { select: { id: true, createdAt: true, total: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(returns);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
