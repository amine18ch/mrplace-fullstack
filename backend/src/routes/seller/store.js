const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { sellerAuth } = require('../../middleware/sellerAuth');
const prisma = new PrismaClient();

router.use(sellerAuth);

// GET /api/seller/store — infos de la boutique
router.get('/', async (req, res) => {
  try {
    const { password: _, ...seller } = req.seller;
    res.json(seller);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/seller/store — personnaliser la boutique
router.patch('/', async (req, res) => {
  try {
    const { name, logo, color, bannerColor, location, responseTime, phone, description } = req.body;
    const data = {};
    if (name        !== undefined) data.name        = name;
    if (logo        !== undefined) data.logo        = logo;
    if (color       !== undefined) data.color       = color;
    if (bannerColor !== undefined) data.bannerColor = bannerColor;
    if (location    !== undefined) data.location    = location;
    if (responseTime!== undefined) data.responseTime= responseTime;
    if (phone       !== undefined) data.phone       = phone;
    if (description !== undefined) data.description = description;

    const updated = await prisma.seller.update({ where: { id: req.seller.id }, data });
    const { password: _, ...safe } = updated;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/seller/store/email — changer l'email
router.patch('/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });
    const exists = await prisma.seller.findFirst({ where: { email, id: { not: req.seller.id } } });
    if (exists) return res.status(400).json({ error: 'Email déjà utilisé' });
    await prisma.seller.update({ where: { id: req.seller.id }, data: { email } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/seller/store/reviews — avis reçus sur les produits
router.get('/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { product: { sellerId: req.seller.id } },
        include: {
          product: { select: { title: true, images: true } },
          user:    { select: { name: true } },
        },
        skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where: { product: { sellerId: req.seller.id } } }),
    ]);
    res.json({ reviews, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/seller/store/finance — revenus et commissions
router.get('/finance', async (req, res) => {
  try {
    const items = await prisma.orderItem.findMany({
      where: { product: { sellerId: req.seller.id }, order: { status: 'LIVREE' } },
      include: { order: { select: { createdAt: true } } },
    });
    const commission = await prisma.commission.findFirst({
      where: { OR: [{ type: 'GLOBAL' }, { type: 'SELLER', sellerId: req.seller.id }], isActive: true },
      orderBy: { type: 'desc' }, // SELLER > GLOBAL
    });
    const rate = commission?.rate || 0.10;
    const totalGross = items.reduce((s, i) => s + i.price * i.qty, 0);
    const totalCommission = totalGross * rate;
    const totalNet = totalGross - totalCommission;

    const paymentCycles = await prisma.paymentCycle.findMany({
      where: { sellerId: req.seller.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    res.json({ totalGross, totalCommission, totalNet, commissionRate: rate, paymentCycles });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
