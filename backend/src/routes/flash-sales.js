const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const parseProduct = (p) => {
  if (!p) return p;
  try {
    return {
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
      tags:   typeof p.tags   === 'string' ? JSON.parse(p.tags)   : (p.tags   || []),
    };
  } catch { return p; }
};

// GET /api/flash-sales — vente flash active en ce moment
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const sale = await prisma.flashSale.findFirst({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt:   { gte: now },
      },
      orderBy: { endAt: 'asc' }, // la plus proche de la fin en premier
    });

    if (!sale) return res.json({ sale: null, products: [] });

    // Charger les produits de la vente flash
    const ids = JSON.parse(sale.productIds || '[]').map(Number).filter(Boolean);
    if (!ids.length) return res.json({ sale, products: [] });

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      include: { seller: { select: { name:true, slug:true, logo:true } }, category: true },
      take: 20,
    });

    // Appliquer le prix flash
    const withFlashPrice = products.map(p => {
      const flashPrice = parseFloat((p.price * (1 - sale.discountPct / 100)).toFixed(3));
      return {
        ...parseProduct(p),
        flashPrice,
        flashDiscount: sale.discountPct,
      };
    });

    res.json({ sale, products: withFlashPrice });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/flash-sales/upcoming — prochaine vente flash à venir
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const sale = await prisma.flashSale.findFirst({
      where: { isActive: true, startAt: { gt: now } },
      orderBy: { startAt: 'asc' },
    });
    res.json(sale || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
