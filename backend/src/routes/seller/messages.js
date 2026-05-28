const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { sellerAuth } = require('../../middleware/sellerAuth');
const prisma = new PrismaClient();

router.use(sellerAuth);

// GET /api/seller/messages — list conversations
router.get('/', async (req, res) => {
  try {
    const convs = await prisma.conversation.findMany({
      where: { sellerId: req.seller.id },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
    const users = await prisma.user.findMany({
      where: { id: { in: convs.map(c => c.userId) } },
      select: { id: true, name: true, email: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    res.json(convs.map(c => ({
      ...c,
      user: userMap[c.userId],
      unread: c.messages.filter(m => !m.isRead && m.senderType === 'CLIENT').length,
      lastMessage: c.messages[0] || null,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/seller/messages/:convId — messages d'une conversation
router.get('/:convId', async (req, res) => {
  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: parseInt(req.params.convId), sellerId: req.seller.id },
    });
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });
    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
    });
    await prisma.message.updateMany({
      where: { conversationId: conv.id, senderType: 'CLIENT', isRead: false },
      data: { isRead: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: conv.userId },
      select: { id: true, name: true, email: true },
    });
    res.json({ conv: { ...conv, user }, messages });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/seller/messages/:convId/send
router.post('/:convId/send', async (req, res) => {
  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: parseInt(req.params.convId), sellerId: req.seller.id },
    });
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });
    const msg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: req.seller.id,
        senderType: 'SELLER',
        content: req.body.content,
      },
    });
    await prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });
    await prisma.notification.create({
      data: {
        userId: conv.userId,
        type: 'MESSAGE',
        title: 'Réponse du vendeur',
        message: `Nouveau message de ${req.seller.name}`,
        link: '/messages',
      },
    });
    res.json(msg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
