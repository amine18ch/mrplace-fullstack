const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const parseP = p => p ? {
  ...p,
  images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images || [],
  tags:   typeof p.tags   === 'string' ? JSON.parse(p.tags)   : p.tags   || [],
} : p;

const safeSeller = ({ password, email, ...s }) => s;

// GET /api/sellers
router.get('/', async (req, res) => {
  try {
    const sellers = await prisma.seller.findMany({
      where: { isActive: true },
      orderBy: { rating: 'desc' },
    });
    res.json(sellers.map(safeSeller));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/sellers/:slug
router.get('/:slug', async (req, res) => {
  try {
    const seller = await prisma.seller.findUnique({ where: { slug: req.params.slug } });
    if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });
    res.json(safeSeller(seller));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/sellers/:slug/products
router.get('/:slug/products', async (req, res) => {
  try {
    const seller = await prisma.seller.findUnique({ where: { slug: req.params.slug } });
    if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });
    const products = await prisma.product.findMany({
      where: { sellerId: seller.id, isActive: true },
      include: { category: true },
      orderBy: { soldCount: 'desc' },
    });
    res.json(products.map(parseP));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
