const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { sellerAuth } = require('../../middleware/sellerAuth');
const prisma = new PrismaClient();

const sign = (seller) => jwt.sign(
  { id: seller.id, email: seller.email, name: seller.name, slug: seller.slug, isSeller: true },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// POST /api/seller/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    const seller = await prisma.seller.findUnique({ where: { email } });
    if (!seller || !seller.password) return res.status(401).json({ error: 'Identifiants incorrects' });
    if (!seller.isActive) return res.status(403).json({ error: 'Compte suspendu. Contactez l\'administration.' });
    const ok = await bcrypt.compare(password, seller.password);
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });
    const { password: _, ...safe } = seller;
    res.json({ token: sign(seller), seller: safe });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/seller/auth/me
router.get('/me', sellerAuth, async (req, res) => {
  const { password: _, ...safe } = req.seller;
  res.json(safe);
});

// PATCH /api/seller/auth/password — changer le mot de passe
router.patch('/password', sellerAuth, async (req, res) => {
  try {
    const { current, newPassword } = req.body;
    if (!current || !newPassword) return res.status(400).json({ error: 'Champs requis' });
    const seller = await prisma.seller.findUnique({ where: { id: req.seller.id } });
    if (seller.password) {
      const ok = await bcrypt.compare(current, seller.password);
      if (!ok) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.seller.update({ where: { id: req.seller.id }, data: { password: hashed } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
