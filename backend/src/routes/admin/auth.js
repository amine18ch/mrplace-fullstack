const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { adminAuth } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

const signAdmin = (admin) => jwt.sign(
  { id: admin.id, email: admin.email, role: admin.role, name: admin.name, isAdmin: true },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);

// POST /api/admin/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.isActive) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLogin: new Date() } });
    const token = signAdmin(admin);
    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, permissions: JSON.parse(admin.permissions || '[]') }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/auth/me
router.get('/me', adminAuth, async (req, res) => {
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: req.admin.id },
      select: { id: true, name: true, email: true, role: true, permissions: true, lastLogin: true, createdAt: true }
    });
    res.json({ ...admin, permissions: JSON.parse(admin.permissions || '[]') });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
