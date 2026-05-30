const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireRole, logAction } = require('../../middleware/adminAuth');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Seul SUPER_ADMIN peut gérer les admins
router.use(requireRole('SUPER_ADMIN'));

// GET /api/admin/admins — liste tous les admins
router.get('/', async (req, res) => {
  try {
    const admins = await prisma.adminUser.findMany({
      select: {
        id:true, name:true, email:true, role:true, permissions:true,
        isActive:true, lastLogin:true, createdAt:true,
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(admins.map(a => ({
      ...a,
      permissions: JSON.parse(a.permissions || '[]'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/admins — créer un admin
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    if (password.length < 8) return res.status(400).json({ error: 'Mot de passe minimum 8 caractères' });

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });

    const validRoles = ['MODERATEUR', 'SUPPORT', 'COMPTABLE', 'MARKETING'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Rôle invalide' });

    const hashed = await bcrypt.hash(password, 10);
    const admin = await prisma.adminUser.create({
      data: {
        name, email, password: hashed,
        role,
        permissions: JSON.stringify(permissions || []),
        isActive: true,
      },
    });
    await logAction(req.admin.id, 'CREATE_ADMIN', 'admins', admin.id, { name, email, role }, req.ip);
    const { password: _, ...safe } = admin;
    res.json({ ...safe, permissions: JSON.parse(safe.permissions || '[]') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/admins/:id — modifier rôle, permissions, statut
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const target = await prisma.adminUser.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Admin introuvable' });
    if (target.role === 'SUPER_ADMIN') return res.status(403).json({ error: 'Impossible de modifier un Super Admin' });

    const { name, role, permissions, isActive, password } = req.body;
    const data = {};
    if (name        !== undefined) data.name        = name;
    if (role        !== undefined) data.role        = role;
    if (permissions !== undefined) data.permissions = JSON.stringify(permissions);
    if (isActive    !== undefined) data.isActive    = isActive;
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'Mot de passe minimum 8 caractères' });
      data.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.adminUser.update({ where: { id }, data });
    await logAction(req.admin.id, 'UPDATE_ADMIN', 'admins', id, { role, isActive }, req.ip);
    const { password: _, ...safe } = updated;
    res.json({ ...safe, permissions: JSON.parse(safe.permissions || '[]') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/admins/:id — désactiver (pas supprimer, pour garder les logs)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.admin.id) return res.status(400).json({ error: 'Impossible de vous supprimer vous-même' });
    const target = await prisma.adminUser.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Admin introuvable' });
    if (target.role === 'SUPER_ADMIN') return res.status(403).json({ error: 'Impossible de supprimer un Super Admin' });
    await prisma.adminUser.update({ where: { id }, data: { isActive: false } });
    await logAction(req.admin.id, 'DISABLE_ADMIN', 'admins', id, { name: target.name }, req.ip);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
