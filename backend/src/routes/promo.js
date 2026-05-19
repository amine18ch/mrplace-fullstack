const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/promo/validate
router.post('/validate', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code manquant' });
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!promo || !promo.isActive) return res.status(404).json({ error: 'Code promo invalide' });
  res.json({ code: promo.code, discount: promo.discount, percent: Math.round(promo.discount * 100) });
});

module.exports = router;
