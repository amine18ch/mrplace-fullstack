const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const returns = await prisma.returnRequest.findMany({
      where,
      include: { order: { select: { id: true, total: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const userIds = [...new Set(returns.map(r => r.userId))];
    const sellerIds = [...new Set(returns.map(r => r.sellerId))];
    const [users, sellers] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
      prisma.seller.findMany({ where: { id: { in: sellerIds } }, select: { id: true, name: true, logo: true } }),
    ]);
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const sellerMap = Object.fromEntries(sellers.map(s => [s.id, s]));
    res.json(returns.map(r => ({ ...r, user: userMap[r.userId], seller: sellerMap[r.sellerId] })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const ret = await prisma.returnRequest.update({
      where: { id: parseInt(req.params.id) },
      data: { status, resolution: resolution || '', updatedAt: new Date() },
    });
    res.json(ret);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
