const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/categories
router.get('/', async (req, res) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } }
  });
  res.json(categories);
});

// GET /api/categories/:slug
router.get('/:slug', async (req, res) => {
  const cat = await prisma.category.findUnique({ where: { slug: req.params.slug } });
  if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
  res.json(cat);
});

// GET /api/categories/:slug/brands — marques disponibles pour filtrer
router.get('/:slug/brands', async (req, res) => {
  const cat = await prisma.category.findUnique({ where: { slug: req.params.slug } });
  if (!cat) return res.status(404).json([]);
  const brands = await prisma.product.groupBy({
    by: ['brand'],
    where: { categoryId: cat.id, isActive: true },
    _count: { brand: true },
    orderBy: { _count: { brand: 'desc' } },
  });
  res.json(brands.map(b => ({ name: b.brand, count: b._count.brand })));
});

module.exports = router;
