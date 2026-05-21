const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { adminAuth, requireRole, logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

router.use(adminAuth);

// GET /api/admin/customers/segments
router.get('/segments', requireRole('SUPPORT', 'MODERATEUR'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['CLIENT', 'BLACKLISTED'] } },
      include: { orders: { select: { total: true, createdAt: true } } }
    });
    const now = new Date();
    const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90);
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);

    const segments = {
      Champions: { count: 0, users: [] },
      Fideles: { count: 0, users: [] },
      Nouveaux: { count: 0, users: [] },
      ARisque: { count: 0, users: [] },
      Inactifs: { count: 0, users: [] },
      Blacklisted: { count: 0, users: [] }
    };

    users.forEach(u => {
      const entry = { id: u.id, name: u.name, email: u.email };
      if (u.role === 'BLACKLISTED') {
        segments.Blacklisted.count++;
        segments.Blacklisted.users.push(entry);
        return;
      }
      const orderCount = u.orders.length;
      const totalSpent = u.orders.reduce((s, o) => s + o.total, 0);
      const lastOrderDate = orderCount > 0 ? new Date(Math.max(...u.orders.map(o => new Date(o.createdAt)))) : null;
      const isNew = u.createdAt ? new Date(u.createdAt) >= thirtyDaysAgo : false;

      if (orderCount > 5 && totalSpent > 500) {
        segments.Champions.count++; segments.Champions.users.push(entry);
      } else if (orderCount >= 2 && orderCount <= 5) {
        segments.Fideles.count++; segments.Fideles.users.push(entry);
      } else if (orderCount === 1 && isNew) {
        segments.Nouveaux.count++; segments.Nouveaux.users.push(entry);
      } else if (lastOrderDate && lastOrderDate < ninetyDaysAgo) {
        segments.ARisque.count++; segments.ARisque.users.push(entry);
      } else {
        segments.Inactifs.count++; segments.Inactifs.users.push(entry);
      }
    });

    res.json(segments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/customers
router.get('/', requireRole('SUPPORT', 'MODERATEUR'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, filter } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (filter === 'BLACKLISTED') where.role = 'BLACKLISTED';
    else if (filter === 'NEW') {
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.role = 'CLIENT';
      where.createdAt = { gte: thirtyDaysAgo };
    } else {
      where.role = { in: ['CLIENT', 'BLACKLISTED'] };
    }

    if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }];

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: { orders: { select: { total: true } }, _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    const enriched = users.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, avatar: u.avatar,
      createdAt: u.createdAt, orderCount: u._count.orders,
      totalSpent: u.orders.reduce((s, o) => s + o.total, 0),
      segment: (() => {
        const c = u._count.orders;
        const t = u.orders.reduce((s, o) => s + o.total, 0);
        if (u.role === 'BLACKLISTED') return 'Blacklisted';
        if (c > 5 && t > 500) return 'Champion';
        if (c >= 2 && c <= 5) return 'Fidèle';
        if (c === 1) return 'Nouveau';
        return 'Inactif';
      })()
    }));

    res.json({ customers: enriched, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/customers/:id
router.get('/:id', requireRole('SUPPORT', 'MODERATEUR'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        orders: { include: { items: { include: { product: { select: { title: true } } } } }, orderBy: { createdAt: 'desc' } },
        addresses: true
      }
    });
    if (!user) return res.status(404).json({ error: 'Client introuvable' });
    const totalSpent = user.orders.reduce((s, o) => s + o.total, 0);
    const disputeCount = await prisma.dispute.count({ where: { userId: user.id } });
    const { password, ...safe } = user;
    res.json({ ...safe, totalSpent, disputeCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/customers/:id/blacklist
router.patch('/:id/blacklist', requireRole('SUPPORT'), async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { role: 'BLACKLISTED' } });
    await logAction(req.admin.id, 'BLACKLIST', 'customers', req.params.id, {}, req.ip);
    const { password, ...safe } = user;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/customers/:id/unblacklist
router.patch('/:id/unblacklist', requireRole('SUPPORT'), async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { role: 'CLIENT' } });
    await logAction(req.admin.id, 'UNBLACKLIST', 'customers', req.params.id, {}, req.ip);
    const { password, ...safe } = user;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/customers/:id - anonymize RGPD
router.delete('/:id', requireRole('SUPPORT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({
      where: { id },
      data: { name: 'Utilisateur supprimé', email: `deleted_${id}@deleted.com`, phone: null, avatar: null }
    });
    await logAction(req.admin.id, 'ANONYMIZE_RGPD', 'customers', req.params.id, {}, req.ip);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
