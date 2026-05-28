const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/messages — liste des conversations du client
router.get('/', auth, async (req, res) => {
  try {
    const convs = await prisma.conversation.findMany({
      where: { userId: req.user.id },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
    const sellers = await prisma.seller.findMany({
      where: { id: { in: convs.map(c => c.sellerId) } },
      select: { id: true, name: true, logo: true, slug: true },
    });
    const sellerMap = Object.fromEntries(sellers.map(s => [s.id, s]));
    res.json(convs.map(c => ({
      ...c,
      seller: sellerMap[c.sellerId],
      unread: c.messages.filter(m => !m.isRead && m.senderType === 'SELLER').length,
      lastMessage: c.messages[0] || null,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/messages/seller/:sellerId — créer ou récupérer une conversation
router.post('/seller/:sellerId', auth, async (req, res) => {
  try {
    const sellerId = parseInt(req.params.sellerId);
    const { subject, productId } = req.body;
    let conv = await prisma.conversation.findFirst({
      where: { userId: req.user.id, sellerId },
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          userId: req.user.id,
          sellerId,
          subject: subject || '',
          productId: productId ? parseInt(productId) : null,
        },
      });
    }
    res.json(conv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/messages/:convId — messages d'une conversation
router.get('/:convId', auth, async (req, res) => {
  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: parseInt(req.params.convId), userId: req.user.id },
    });
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });
    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
    });
    await prisma.message.updateMany({
      where: { conversationId: conv.id, senderType: 'SELLER', isRead: false },
      data: { isRead: true },
    });
    const seller = await prisma.seller.findUnique({
      where: { id: conv.sellerId },
      select: { id: true, name: true, logo: true },
    });
    res.json({ conv: { ...conv, seller }, messages });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/messages/:convId/send — envoyer un message
router.post('/:convId/send', auth, async (req, res) => {
  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: parseInt(req.params.convId), userId: req.user.id },
    });
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });
    const msg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: req.user.id,
        senderType: 'CLIENT',
        content: req.body.content,
      },
    });
    await prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });
    await prisma.notification.create({
      data: {
        sellerId: conv.sellerId,
        type: 'MESSAGE',
        title: 'Nouveau message client',
        message: `Message de ${req.user.name}`,
        link: '/seller/messages',
      },
    });
    res.json(msg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
