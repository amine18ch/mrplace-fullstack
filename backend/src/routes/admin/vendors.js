const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { adminAuth, requireRole, logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

// All vendor routes require auth
router.use(adminAuth);

// GET /api/admin/vendors/applications
router.get('/applications', requireRole('MODERATEUR', 'COMPTABLE'), async (req, res) => {
  try {
    const applications = await prisma.vendorApplication.findMany({
      include: { seller: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(applications);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/vendors/commissions
router.get('/commissions', requireRole('COMPTABLE'), async (req, res) => {
  try {
    const commissions = await prisma.commission.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(commissions);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/vendors/commissions
router.post('/commissions', requireRole('COMPTABLE'), async (req, res) => {
  try {
    const { type, sellerId, categoryId, rate, isActive } = req.body;
    const commission = await prisma.commission.create({
      data: { type: type || 'GLOBAL', sellerId: sellerId ? parseInt(sellerId) : null, categoryId: categoryId ? parseInt(categoryId) : null, rate: parseFloat(rate) || 0.10, isActive: isActive !== false }
    });
    res.json(commission);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/vendors/commissions/:id
router.patch('/commissions/:id', requireRole('COMPTABLE'), async (req, res) => {
  try {
    const { rate, isActive, type } = req.body;
    const data = {};
    if (rate !== undefined) data.rate = parseFloat(rate);
    if (isActive !== undefined) data.isActive = isActive;
    if (type !== undefined) data.type = type;
    const commission = await prisma.commission.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(commission);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/vendors/commissions/:id
router.delete('/commissions/:id', requireRole('COMPTABLE'), async (req, res) => {
  try {
    await prisma.commission.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/vendors - list sellers with pagination
router.get('/', requireRole('MODERATEUR', 'COMPTABLE'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (search) where.OR = [{ name: { contains: search } }, { location: { contains: search } }];
    if (status === 'Suspendu') where.badge = 'Suspendu';
    else if (status === 'active') where.badge = { not: 'Suspendu' };

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: { application: true, _count: { select: { products: true } } },
        orderBy: { id: 'desc' }
      }),
      prisma.seller.count({ where })
    ]);
    res.json({ sellers, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/vendors/:id - vendor detail with stats
router.get('/:id', requireRole('MODERATEUR', 'COMPTABLE'), async (req, res) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { products: true, application: true }
    });
    if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });

    const orderItems = await prisma.orderItem.findMany({
      where: { product: { sellerId: seller.id } },
      include: { order: true }
    });
    const totalRevenue = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const orderIds = [...new Set(orderItems.map(i => i.orderId))];
    const reviews = await prisma.review.findMany({ where: { product: { sellerId: seller.id } }, select: { rating: true } });
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : seller.rating;

    res.json({ ...seller, stats: { totalOrders: orderIds.length, totalRevenue, avgRating: parseFloat(avgRating.toFixed(1)) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/vendors/:id/level
router.patch('/:id/level', requireRole('MODERATEUR'), async (req, res) => {
  try {
    const { badge } = req.body;
    const seller = await prisma.seller.update({ where: { id: parseInt(req.params.id) }, data: { badge } });
    await logAction(req.admin.id, 'UPDATE_LEVEL', 'vendors', req.params.id, { badge }, req.ip);
    res.json(seller);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/vendors/:id/suspend
router.patch('/:id/suspend', requireRole('MODERATEUR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    const seller = await prisma.seller.update({ where: { id }, data: { badge: 'Suspendu' } });
    await prisma.vendorApplication.upsert({
      where: { sellerId: id },
      update: { status: 'SUSPENDED', rejectionReason: reason },
      create: { sellerId: id, status: 'SUSPENDED', rejectionReason: reason }
    });
    await logAction(req.admin.id, 'SUSPEND', 'vendors', req.params.id, { reason }, req.ip);
    res.json(seller);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/vendors/:id/approve
router.patch('/:id/approve', requireRole('MODERATEUR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const seller = await prisma.seller.update({ where: { id }, data: { verified: true } });
    await prisma.vendorApplication.upsert({
      where: { sellerId: id },
      update: { status: 'APPROVED', reviewedBy: req.admin.id, reviewedAt: new Date() },
      create: { sellerId: id, status: 'APPROVED', reviewedBy: req.admin.id, reviewedAt: new Date() }
    });
    await logAction(req.admin.id, 'APPROVE', 'vendors', req.params.id, {}, req.ip);
    res.json(seller);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/vendors/:id/reject
router.patch('/:id/reject', requireRole('MODERATEUR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    await prisma.vendorApplication.upsert({
      where: { sellerId: id },
      update: { status: 'REJECTED', rejectionReason: reason, reviewedBy: req.admin.id, reviewedAt: new Date() },
      create: { sellerId: id, status: 'REJECTED', rejectionReason: reason, reviewedBy: req.admin.id, reviewedAt: new Date() }
    });
    await logAction(req.admin.id, 'REJECT', 'vendors', req.params.id, { reason }, req.ip);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/vendors/:id/reactivate
router.patch('/:id/reactivate', requireRole('MODERATEUR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const seller = await prisma.seller.findUnique({ where: { id }, select: { badge: true } });
    const newBadge = seller?.badge === 'Suspendu' ? 'Nouveau' : seller?.badge;
    const updated = await prisma.seller.update({ where: { id }, data: { badge: newBadge, verified: true } });
    await prisma.vendorApplication.upsert({
      where: { sellerId: id },
      update: { status: 'APPROVED', reviewedBy: req.admin.id, reviewedAt: new Date() },
      create: { sellerId: id, status: 'APPROVED', reviewedBy: req.admin.id, reviewedAt: new Date() }
    });
    await logAction(req.admin.id, 'REACTIVATE', 'vendors', req.params.id, {}, req.ip);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
