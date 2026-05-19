const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/sellers
router.get('/', async (req, res) => {
  const sellers = await prisma.seller.findMany({ orderBy: { rating: 'desc' } });
  res.json(sellers);
});

// GET /api/sellers/:slug
router.get('/:slug', async (req, res) => {
  const seller = await prisma.seller.findUnique({ where: { slug: req.params.slug } });
  if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });
  res.json(seller);
});

// GET /api/sellers/:slug/products
router.get('/:slug/products', async (req, res) => {
  const seller = await prisma.seller.findUnique({ where: { slug: req.params.slug } });
  if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });
  const products = await prisma.product.findMany({
    where: { sellerId: seller.id, isActive: true },
    include: { category: true },
    orderBy: { soldCount: 'desc' },
  });
  res.json(products);
});

module.exports = router;
