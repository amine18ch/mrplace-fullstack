const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

// GET /api/admin/orders/stats
router.get('/stats', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ select: { status: true, total: true } });
    const byStatus = {};
    let totalRevenue = 0;
    orders.forEach(o => {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      totalRevenue += o.total;
    });
    res.json({ total: orders.length, byStatus, totalRevenue });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/orders/disputes
router.get('/disputes', async (req, res) => {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        order: { include: { user: { select: { name: true, email: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(disputes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/orders/disputes
router.post('/disputes', async (req, res) => {
  try {
    const { orderId, userId, sellerId, reason, description } = req.body;
    const dispute = await prisma.dispute.create({
      data: { orderId: parseInt(orderId), userId: parseInt(userId), sellerId: parseInt(sellerId), reason, description }
    });
    res.json(dispute);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/orders/disputes/:id/resolve
router.patch('/disputes/:id/resolve', async (req, res) => {
  try {
    const { resolution, refund } = req.body;
    const dispute = await prisma.dispute.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'RESOLVED', resolution, resolvedBy: req.admin.id, updatedAt: new Date() }
    });
    await logAction(req.admin.id, 'RESOLVE_DISPUTE', 'orders', req.params.id, { resolution, refund }, req.ip);
    res.json(dispute);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/orders
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, dateFrom, dateTo } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (status) where.status = status;
    if (search) where.OR = [
      { user: { name: { contains: search } } },
      { user: { email: { contains: search } } }
    ];
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: parseInt(limit),
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: { include: { seller: { select: { name: true } } } } } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);
    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: true,
        items: { include: { product: { include: { seller: true } } } },
        dispute: true
      }
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({ where: { id: parseInt(req.params.id) }, data: { status } });
    await logAction(req.admin.id, 'UPDATE_STATUS', 'orders', req.params.id, { status }, req.ip);
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
