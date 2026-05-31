const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { adminAuth, requireRole, logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

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
// Params optionnels:
//   sellerId   — générer uniquement pour un vendeur spécifique
//   force      — recalculer même si le cycle existe déjà
//   statuses   — statuts inclus (défaut: LIVREE,EXPEDIEE)
//   month, year — période personnalisée
router.post('/payment-cycles/generate', async (req, res) => {
  try {
    const { sellerId, force = false, statuses, month, year } = req.body;

    const now = new Date();
    const m = month !== undefined ? parseInt(month) : now.getMonth();
    const y = year  !== undefined ? parseInt(year)  : now.getFullYear();
    const periodStart = new Date(y, m, 1);
    const periodEnd   = new Date(y, m + 1, 0, 23, 59, 59);

    const globalCommission = await prisma.commission.findFirst({ where: { type: 'GLOBAL', isActive: true } });
    const globalRate = globalCommission ? globalCommission.rate : 0.10;

    // Statuts éligibles au versement (LIVREE = livré et confirmé, EXPEDIEE = expédié)
    const eligibleStatuses = statuses || ['LIVREE', 'EXPEDIEE'];

    const sellers = sellerId
      ? await prisma.seller.findMany({ where: { id: parseInt(sellerId) } })
      : await prisma.seller.findMany({ where: { isActive: true } });

    const created = [];
    const updated = [];
    const skipped = [];

    for (const seller of sellers) {
      // ── Récupérer les périodes DÉJÀ PAYÉES pour ce vendeur
      // Ces commandes sont exclues du recalcul (même avec force=true)
      const paidCycles = await prisma.paymentCycle.findMany({
        where: { sellerId: seller.id, status: 'PAID' },
        select: { periodStart: true, periodEnd: true },
      });
      // Condition d'exclusion : commandes dont createdAt tombe dans une période payée
      const excludePaidPeriods = paidCycles.length > 0
        ? { NOT: { OR: paidCycles.map(c => ({ createdAt: { gte: c.periodStart, lte: c.periodEnd } })) } }
        : {};

      // Filtre de date : normal = mois courant, force = tout sauf les cycles déjà payés
      const dateFilter = force
        ? {} // pas de filtre de date — les cycles payés sont exclus ci-dessus
        : { createdAt: { gte: periodStart, lte: periodEnd } };

      const orderItems = await prisma.orderItem.findMany({
        where: {
          product: { sellerId: seller.id },
          order: {
            status: { in: eligibleStatuses },
            ...dateFilter,
            ...excludePaidPeriods, // ← toujours exclure les commandes des cycles payés
          },
        },
      });

      const grossAmount = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
      if (grossAmount === 0) { skipped.push(seller.name); continue; }

      const sellerCommission = await prisma.commission.findFirst({
        where: { sellerId: seller.id, isActive: true },
        orderBy: { type: 'desc' },
      });
      const commissionRate = sellerCommission ? sellerCommission.rate : globalRate;
      const commission = grossAmount * commissionRate;
      const netAmount  = grossAmount - commission;

      const existing = await prisma.paymentCycle.findFirst({
        where: { sellerId: seller.id, periodStart, periodEnd },
      });

      if (existing) {
        if (force && existing.status !== 'PAID') {
          // Recalculer si pas encore payé
          await prisma.paymentCycle.update({
            where: { id: existing.id },
            data: { grossAmount, commission, netAmount },
          });
          updated.push({ seller: seller.name, netAmount });
        } else {
          skipped.push(seller.name + (existing.status === 'PAID' ? ' (déjà payé)' : ' (existe déjà, utilisez force=true pour recalculer)'));
        }
      } else {
        const cycle = await prisma.paymentCycle.create({
          data: { sellerId: seller.id, periodStart, periodEnd, grossAmount, commission, netAmount },
        });
        created.push({ seller: seller.name, netAmount });
      }
    }

    await logAction(req.admin.id, 'GENERATE_CYCLES', 'finance', null,
      { created: created.length, updated: updated.length, skipped: skipped.length }, req.ip);

    res.json({
      period: `${periodStart.toLocaleDateString('fr-TN')} — ${periodEnd.toLocaleDateString('fr-TN')}`,
      statuses: eligibleStatuses,
      created, updated, skipped,
      message: `${created.length} créé(s), ${updated.length} mis à jour, ${skipped.length} ignoré(s)`,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/finance/seller/:sellerId/orders — toutes les commandes éligibles d'un vendeur
router.get('/seller/:sellerId/orders', async (req, res) => {
  try {
    const sellerId = parseInt(req.params.sellerId);
    const { statuses = 'LIVREE,EXPEDIEE' } = req.query;
    const eligibleStatuses = statuses.split(',');

    const items = await prisma.orderItem.findMany({
      where: {
        product: { sellerId },
        order: { status: { in: eligibleStatuses } },
      },
      include: {
        order: { select: { id:true, status:true, createdAt:true, updatedAt:true } },
        product: { select: { title:true } },
      },
      orderBy: { orderId: 'desc' },
    });

    const byOrder = {};
    for (const item of items) {
      const oid = item.orderId;
      if (!byOrder[oid]) byOrder[oid] = { order: item.order, items: [], total: 0 };
      byOrder[oid].items.push(item);
      byOrder[oid].total += item.price * item.qty;
    }

    res.json({
      orders: Object.values(byOrder),
      grandTotal: Object.values(byOrder).reduce((s,o)=>s+o.total,0),
    });
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
