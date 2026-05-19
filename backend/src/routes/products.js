const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, adminAuth } = require('../middleware/auth');
const prisma = new PrismaClient();

// SQLite stores arrays/objects as JSON strings — parse them back
const parseProduct = (p) => {
  if (!p) return p;
  try {
    return {
      ...p,
      images:         typeof p.images         === 'string' ? JSON.parse(p.images)         : (p.images || []),
      tags:           typeof p.tags           === 'string' ? JSON.parse(p.tags)           : (p.tags || []),
      specifications: typeof p.specifications === 'string' ? JSON.parse(p.specifications) : (p.specifications || {}),
      variants:       typeof p.variants       === 'string' ? JSON.parse(p.variants)       : (p.variants || {}),
    };
  } catch { return p; }
};
const parseProducts = (ps) => ps.map(parseProduct);

// GET /api/products — liste avec filtres
router.get('/', async (req, res) => {
  try {
    const {
      category, subcategory, brand, sellerId, search,
      minPrice, maxPrice, minRating, minDiscount,
      express, inStock, tags,
      sort = 'popular', page = 1, limit = 40
    } = req.query;

    const where = { isActive: true };
    if (category) where.category = { slug: category };
    if (subcategory) where.subcategory = subcategory;
    if (brand) where.brand = { in: brand.split(',') };
    if (sellerId) where.sellerId = parseInt(sellerId);
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
    if (minPrice || maxPrice) where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
    if (minRating) where.rating = { gte: parseFloat(minRating) };
    if (minDiscount) where.discount = { gte: parseInt(minDiscount) };
    if (express === 'true') where.expressDelivery = true;
    if (inStock === 'true') where.stock = { gt: 0 };
    if (tags) where.tags = { hasSome: tags.split(',') };

    const orderBy = {
      popular: { soldCount: 'desc' },
      'price-asc': { price: 'asc' },
      'price-desc': { price: 'desc' },
      rating: { rating: 'desc' },
      newest: { createdAt: 'desc' },
      discount: { discount: 'desc' },
    }[sort] || { soldCount: 'desc' };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (parseInt(page)-1) * parseInt(limit),
        take: parseInt(limit),
        include: { seller: true, category: true },
      }),
    ]);

    res.json({ total, page: parseInt(page), limit: parseInt(limit), products: parseProducts(products) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/products/search/suggestions
router.get('/search/suggestions', async (req, res) => {
  const { q, cat } = req.query;
  if (!q || q.length < 2) return res.json([]);
  const where = {
    isActive: true,
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { brand: { contains: q, mode: 'insensitive' } },
    ],
  };
  if (cat && cat !== 'all') where.category = { slug: cat };
  const products = await prisma.product.findMany({
    where, take: 6,
    include: { category: true },
  });
  res.json(parseProducts(products).map(p => ({ id:p.id, title:p.title, brand:p.brand, price:p.price, images:p.images, category:p.category })));
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      seller: true,
      category: true,
      reviews: { include: { user: { select: { id:true, name:true, avatar:true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  res.json(parseProduct(product));
});

// POST /api/products/:id/reviews
router.post('/:id/reviews', auth, async (req, res) => {
  const { rating, comment } = req.body;
  const review = await prisma.review.create({
    data: { userId: req.user.id, productId: parseInt(req.params.id), rating: parseInt(rating), comment },
    include: { user: { select: { name:true } } },
  });
  // Update product avg rating
  const agg = await prisma.review.aggregate({ where: { productId: parseInt(req.params.id) }, _avg: { rating: true }, _count: true });
  await prisma.product.update({
    where: { id: parseInt(req.params.id) },
    data: { rating: agg._avg.rating, reviewsCount: agg._count },
  });
  res.json(review);
});

// --- ADMIN ---
// POST /api/products
router.post('/', adminAuth, async (req, res) => {
  try {
    const product = await prisma.product.create({ data: req.body, include: { seller:true, category:true } });
    res.json(product);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// PUT /api/products/:id
router.put('/:id', adminAuth, async (req, res) => {
  const product = await prisma.product.update({
    where: { id: parseInt(req.params.id) },
    data: req.body,
    include: { seller:true, category:true },
  });
  res.json(product);
});

// DELETE /api/products/:id
router.delete('/:id', adminAuth, async (req, res) => {
  await prisma.product.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
  res.json({ success: true });
});

module.exports = router;
