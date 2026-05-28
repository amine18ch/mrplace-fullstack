const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { sellerAuth } = require('../../middleware/sellerAuth');
const prisma = new PrismaClient();

// List returns for this seller
router.get('/', sellerAuth, async (req, res) => {
  try {
    const returns = await prisma.returnRequest.findMany({
      where: { sellerId: req.seller.id },
      include: {
        order: { select: { id: true, total: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const userIds = [...new Set(returns.map(r => r.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, phone: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    res.json(returns.map(r => ({ ...r, user: userMap[r.userId] })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Approve or reject a return
router.patch('/:id', sellerAuth, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const ret = await prisma.returnRequest.findFirst({
      where: { id: parseInt(req.params.id), sellerId: req.seller.id },
    });
    if (!ret) return res.status(404).json({ error: 'Retour introuvable' });
    const updated = await prisma.returnRequest.update({
      where: { id: ret.id },
      data: { status, resolution: resolution || '', resolvedBy: req.seller.id, updatedAt: new Date() },
    });
    // Notify client
    const label = status === 'APPROVED' ? 'approuvée' : 'refusée';
    await prisma.notification.create({
      data: { userId: ret.userId, type: 'RETURN_UPDATE', title: `Demande de retour ${label}`, message: resolution || `Votre demande de retour a été ${label}`, link: '/orders' },
    });
    await prisma.orderEvent.create({
      data: { orderId: ret.orderId, status: `RETOUR_${status}`, note: resolution || '', createdBy: 'SELLER' },
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
