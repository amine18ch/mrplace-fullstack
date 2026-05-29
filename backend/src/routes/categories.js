const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/categories — arbre complet (parents + enfants)
router.get('/', async (req, res) => {
  try {
    const all = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { id: 'asc' },
    });
    // Séparer parents et enfants
    const parents = all.filter(c => !c.parentId);
    const children = all.filter(c => c.parentId);
    const tree = parents.map(p => ({
      ...p,
      children: children.filter(c => c.parentId === p.id),
    }));
    res.json(tree);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/categories/flat — liste plate (pour sélecteurs)
router.get('/flat', async (req, res) => {
  try {
    const cats = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    res.json(cats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/categories/:slug — une catégorie avec ses enfants
router.get('/:slug', async (req, res) => {
  try {
    const cat = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: { children: true, parent: true },
    });
    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
    res.json(cat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/categories/:slug/brands
router.get('/:slug/brands', async (req, res) => {
  try {
    const cat = await prisma.category.findUnique({ where: { slug: req.params.slug } });
    if (!cat) return res.json([]);
    // Inclure aussi les sous-catégories
    const children = await prisma.category.findMany({ where: { parentId: cat.id } });
    const catIds = [cat.id, ...children.map(c => c.id)];
    const brands = await prisma.product.groupBy({
      by: ['brand'],
      where: { categoryId: { in: catIds }, isActive: true },
      _count: { brand: true },
      orderBy: { _count: { brand: 'desc' } },
    });
    res.json(brands.map(b => ({ name: b.brand, count: b._count.brand })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
