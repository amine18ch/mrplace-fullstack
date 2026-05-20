const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

// GET /api/admin/customers/segments
router.get('/segments', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['CLIENT', 'BLACKLISTED'] } },
      include: { orders: { select: { total: true } } }
    });
    const segments = { Champions: 0, Fideles: 0, Nouveaux: 0, Inactifs: 0, Blacklisted: 0 };
    users.forEach(u => {
      if (u.role === 'BLACKLISTED') { segments.Blacklisted++; return; }
      const orderCount = u.orders.length;
      const totalSpent = u.orders.reduce((s, o) => s + o.total, 0);
      if (orderCount > 5 && totalSpent > 500) segments.Champions++;
      else if (orderCount > 2) segments.Fideles++;
      else if (orderCount === 1) segments.Nouveaux++;
      else segments.Inactifs++;
    });
    res.json(segments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/customers
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
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
        if (c > 2) return 'Fidèle';
        if (c === 1) return 'Nouveau';
        return 'Inactif';
      })()
    }));

    res.json({ customers: enriched, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/customers/:id
router.get('/:id', async (req, res) => {
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
    const { password, ...safe } = user;
    res.json({ ...safe, totalSpent });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/customers/:id/blacklist
router.patch('/:id/blacklist', async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { role: 'BLACKLISTED' } });
    await logAction(req.admin.id, 'BLACKLIST', 'customers', req.params.id, {}, req.ip);
    const { password, ...safe } = user;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/customers/:id/unblacklist
router.patch('/:id/unblacklist', async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { role: 'CLIENT' } });
    await logAction(req.admin.id, 'UNBLACKLIST', 'customers', req.params.id, {}, req.ip);
    const { password, ...safe } = user;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/customers/:id - anonymize
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({
      where: { id },
      data: { name: 'Utilisateur supprimé', email: `deleted_${id}@deleted.com`, phone: null, avatar: null }
    });
    await logAction(req.admin.id, 'ANONYMIZE', 'customers', req.params.id, {}, req.ip);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
