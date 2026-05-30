const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/banners?type=HERO   → slides du carrousel principal
// GET /api/banners?type=PROMO  → mini-cartes promotionnelles
// GET /api/banners             → tous les actifs
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const where = { isActive: true };
    if (type) where.type = type;
    const banners = await prisma.banner.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    res.json(banners);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
