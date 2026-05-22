const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { adminAuth, requireRole, logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

// GET /api/admin/products/stats
router.get('/stats', async (req, res) => {
  try {
    const [total, active, inactive, byCategory] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: false } }),
      prisma.category.findMany({
        include: { _count: { select: { products: true } } }
      })
    ]);
    res.json({ total, active, inactive, byCategory: byCategory.map(c => ({ name: c.name, count: c._count.products })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/products/pending - products awaiting moderation
router.get('/pending', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: false },
        skip, take: parseInt(limit),
        include: { seller: { select: { name: true, logo: true } }, category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where: { isActive: false } })
    ]);
    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/products
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive, sellerId, categoryId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (isActive === 'true') where.isActive = true;
    else if (isActive === 'false') where.isActive = false;
    if (sellerId) where.sellerId = parseInt(sellerId);
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (search) where.OR = [{ title: { contains: search } }, { brand: { contains: search } }];

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, skip, take: parseInt(limit),
        include: { seller: { select: { name: true, logo: true } }, category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);
    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { seller: true, category: true, reviews: { include: { user: { select: { name: true } } } } }
    });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/products/:id
router.patch('/:id', requireRole('MODERATEUR'), async (req, res) => {
  try {
    const { title, brand, price, originalPrice, stock, isActive, description } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (brand !== undefined) data.brand = brand;
    if (price !== undefined) data.price = parseFloat(price);
    if (originalPrice !== undefined) data.originalPrice = parseFloat(originalPrice);
    if (stock !== undefined) data.stock = parseInt(stock);
    if (isActive !== undefined) data.isActive = isActive;
    if (description !== undefined) data.description = description;
    const product = await prisma.product.update({ where: { id: parseInt(req.params.id) }, data });
    await logAction(req.admin.id, 'UPDATE', 'products', req.params.id, data, req.ip);
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/products/:id/approve
router.patch('/:id/approve', requireRole('MODERATEUR'), async (req, res) => {
  try {
    const product = await prisma.product.update({ where: { id: parseInt(req.params.id) }, data: { isActive: true } });
    await logAction(req.admin.id, 'APPROVE', 'products', req.params.id, {}, req.ip);
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/products/:id/reject
router.patch('/:id/reject', requireRole('MODERATEUR'), async (req, res) => {
  try {
    const product = await prisma.product.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    await logAction(req.admin.id, 'REJECT', 'products', req.params.id, { reason: req.body.reason }, req.ip);
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/products/:id/feature
router.patch('/:id/feature', requireRole('MODERATEUR'), async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) }, select: { tags: true } });
    const tags = JSON.parse(product.tags || '[]');
    const idx = tags.indexOf('featured');
    if (idx === -1) tags.push('featured'); else tags.splice(idx, 1);
    const updated = await prisma.product.update({ where: { id: parseInt(req.params.id) }, data: { tags: JSON.stringify(tags) } });
    await logAction(req.admin.id, 'FEATURE_TOGGLE', 'products', req.params.id, { featured: idx === -1 }, req.ip);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/products/:id
router.delete('/:id', requireRole('MODERATEUR'), async (req, res) => {
  try {
    await prisma.product.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    await logAction(req.admin.id, 'DELETE', 'products', req.params.id, {}, req.ip);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
