const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { adminAuth, requireRole, logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

router.use(adminAuth);
router.use(requireRole('COMPTABLE'));

// GET /api/admin/finance/overview
router.get('/overview', async (req, res) => {
  try {
    const globalCommission = await prisma.commission.findFirst({ where: { type: 'GLOBAL', isActive: true } });
    const rate = globalCommission ? globalCommission.rate : 0.10;

    const orders = await prisma.order.findMany({ select: { total: true } });
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalCommissions = totalRevenue * rate;
    const totalNetToVendors = totalRevenue - totalCommissions;

    const cycles = await prisma.paymentCycle.findMany({ select: { status: true, netAmount: true } });
    const pendingCyclesCount = cycles.filter(c => c.status === 'PENDING').length;
    const paidCyclesCount = cycles.filter(c => c.status === 'PAID').length;
    const totalPaid = cycles.filter(c => c.status === 'PAID').reduce((s, c) => s + c.netAmount, 0);

    res.json({ totalRevenue, totalCommissions, totalNetToVendors, pendingCyclesCount, paidCyclesCount, totalPaid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/finance/payment-cycles
router.get('/payment-cycles', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [cycles, total] = await Promise.all([
      prisma.paymentCycle.findMany({
        include: { seller: { select: { name: true, logo: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(limit)
      }),
      prisma.paymentCycle.count()
    ]);
    res.json({ cycles, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/finance/payment-cycles/generate
router.post('/payment-cycles/generate', async (req, res) => {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const globalCommission = await prisma.commission.findFirst({ where: { type: 'GLOBAL', isActive: true } });
    const rate = globalCommission ? globalCommission.rate : 0.10;

    const sellers = await prisma.seller.findMany();
    const created = [];

    for (const seller of sellers) {
      const orderItems = await prisma.orderItem.findMany({
        where: {
          product: { sellerId: seller.id },
          order: { status: 'LIVREE', createdAt: { gte: periodStart, lte: periodEnd } }
        }
      });

      const grossAmount = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
      if (grossAmount === 0) continue;

      const sellerCommission = await prisma.commission.findFirst({
        where: { sellerId: seller.id, isActive: true }
      }) || globalCommission;
      const commissionRate = sellerCommission ? sellerCommission.rate : rate;
      const commission = grossAmount * commissionRate;
      const netAmount = grossAmount - commission;

      const existing = await prisma.paymentCycle.findFirst({
        where: { sellerId: seller.id, periodStart, periodEnd }
      });
      if (!existing) {
        const cycle = await prisma.paymentCycle.create({
          data: { sellerId: seller.id, periodStart, periodEnd, grossAmount, commission, netAmount }
        });
        created.push(cycle);
      }
    }

    await logAction(req.admin.id, 'GENERATE_CYCLES', 'finance', null, { count: created.length }, req.ip);
    res.json({ created: created.length, cycles: created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/finance/payment-cycles/:id/pay
router.patch('/payment-cycles/:id/pay', async (req, res) => {
  try {
    const cycle = await prisma.paymentCycle.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'PAID', paidAt: new Date() }
    });
    await logAction(req.admin.id, 'MARK_PAID', 'finance', req.params.id, {}, req.ip);
    res.json(cycle);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/finance/report
router.get('/report', async (req, res) => {
  try {
    const globalCommission = await prisma.commission.findFirst({ where: { type: 'GLOBAL', isActive: true } });
    const defaultRate = globalCommission ? globalCommission.rate : 0.10;

    const sellers = await prisma.seller.findMany();
    const report = [];

    for (const seller of sellers) {
      const orderItems = await prisma.orderItem.findMany({
        where: { product: { sellerId: seller.id } },
        include: { order: { select: { id: true } } }
      });
      if (orderItems.length === 0) continue;

      const grossAmount = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
      const sellerCommission = await prisma.commission.findFirst({
        where: { sellerId: seller.id, isActive: true }
      });
      const rate = sellerCommission ? sellerCommission.rate : defaultRate;
      const commission = grossAmount * rate;
      const netAmount = grossAmount - commission;
      const ordersCount = [...new Set(orderItems.map(i => i.order?.id))].filter(Boolean).length;

      report.push({
        seller: { id: seller.id, name: seller.name, logo: seller.logo },
        ordersCount, grossRevenue: grossAmount, commissionRate: rate, commissionAmount: commission, netAmount
      });
    }

    report.sort((a, b) => b.grossRevenue - a.grossRevenue);
    res.json(report);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
