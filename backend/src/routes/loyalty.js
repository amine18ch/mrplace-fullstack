const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', auth, async (req, res) => {
  try {
    const points = await prisma.loyaltyPoint.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const total = points.reduce((s, p) => p.type === 'SPENT' ? s - p.points : s + p.points, 0);
    res.json({ total, points });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
