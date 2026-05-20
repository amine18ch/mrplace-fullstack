const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

// GET /api/admin/settings - all platform settings grouped
router.get('/', async (req, res) => {
  try {
    const settings = await prisma.platformSetting.findMany({ orderBy: { group: 'asc' } });
    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.group]) grouped[s.group] = {};
      grouped[s.group][s.key] = s.value;
    });
    res.json({ settings, grouped });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/settings - batch update
router.patch('/', async (req, res) => {
  try {
    const { updates } = req.body; // [{ key, value }]
    const results = [];
    for (const { key, value } of updates) {
      const s = await prisma.platformSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, group: 'GENERAL' }
      });
      results.push(s);
    }
    await logAction(req.admin.id, 'UPDATE_SETTINGS', 'settings', null, { keys: updates.map(u => u.key) }, req.ip);
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/settings/admins
router.get('/admins', async (req, res) => {
  try {
    const admins = await prisma.adminUser.findMany({
      select: { id: true, name: true, email: true, role: true, permissions: true, isActive: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(admins.map(a => ({ ...a, permissions: JSON.parse(a.permissions || '[]') })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/settings/admins
router.post('/admins', async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Champs requis manquants' });
    const exists = await prisma.adminUser.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: 'Email déjà utilisé' });
    const hashed = await bcrypt.hash(password, 10);
    const admin = await prisma.adminUser.create({
      data: { name, email, password: hashed, role: role || 'SUPPORT', permissions: JSON.stringify(permissions || []) }
    });
    await logAction(req.admin.id, 'CREATE_ADMIN', 'settings', admin.id, { email, role }, req.ip);
    const { password: _, ...safe } = admin;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/settings/admins/:id
router.patch('/admins/:id', async (req, res) => {
  try {
    const { name, role, permissions, isActive, password } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (permissions !== undefined) data.permissions = JSON.stringify(permissions);
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.password = await bcrypt.hash(password, 10);
    const admin = await prisma.adminUser.update({ where: { id: parseInt(req.params.id) }, data });
    await logAction(req.admin.id, 'UPDATE_ADMIN', 'settings', req.params.id, { role }, req.ip);
    const { password: _, ...safe } = admin;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/settings/admins/:id
router.delete('/admins/:id', async (req, res) => {
  try {
    await prisma.adminUser.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    await logAction(req.admin.id, 'DISABLE_ADMIN', 'settings', req.params.id, {}, req.ip);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/settings/logs
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, module, adminId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (module) where.module = module;
    if (adminId) where.adminId = parseInt(adminId);

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where, skip, take: parseInt(limit),
        include: { admin: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.adminLog.count({ where })
    ]);
    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
