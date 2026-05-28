const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { sellerAuth } = require('../../middleware/sellerAuth');
const prisma = new PrismaClient();

router.get('/', sellerAuth, async (req, res) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { sellerId: req.seller.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json(notifs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/read-all', sellerAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { sellerId: req.seller.id, isRead: false }, data: { isRead: true } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
