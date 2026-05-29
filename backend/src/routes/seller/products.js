const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { sellerAuth } = require('../../middleware/sellerAuth');
const prisma = new PrismaClient();

router.use(sellerAuth);

const parseP = p => p ? {
  ...p,
  images:         typeof p.images         === 'string' ? JSON.parse(p.images)         : p.images         || [],
  tags:           typeof p.tags           === 'string' ? JSON.parse(p.tags)           : p.tags           || [],
  specifications: typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications || {},
  variants:       typeof p.variants       === 'string' ? JSON.parse(p.variants)       : p.variants       || {},
} : p;

// GET /api/seller/products
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { sellerId: req.seller.id };
    if (search) where.OR = [{ title: { contains: search } }, { brand: { contains: search } }];
    if (status === 'active')   where.status = 'PUBLISHED';
    if (status === 'inactive') where.status = 'PENDING';
    if (status === 'draft')    where.status = 'DRAFT';

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, skip, take: parseInt(limit),
        include: { category: { include: { parent: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);
    res.json({ products: products.map(parseP), total, page: parseInt(page) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/seller/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: parseInt(req.params.id), sellerId: req.seller.id },
      include: { category: { include: { parent: true } } },
    });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(parseP(product));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/seller/products
router.post('/', async (req, res) => {
  try {
    const {
      title, brand, categoryId, sku, price, originalPrice,
      description, specifications, variants, images, stock,
      warranty, returnPolicy, expressDelivery, freeDelivery, tags,
    } = req.body;

    if (!title || !price || !categoryId) return res.status(400).json({ error: 'Titre, prix et catégorie requis' });

    const discount = originalPrice && parseFloat(originalPrice) > parseFloat(price)
      ? Math.round((1 - parseFloat(price) / parseFloat(originalPrice)) * 100) : 0;

    const product = await prisma.product.create({
      data: {
        title, brand: brand || req.seller.name,
        sellerId: req.seller.id,
        categoryId: parseInt(categoryId),
        subcategory: '',
        sku: sku || null,
        price: parseFloat(price),
        originalPrice: parseFloat(originalPrice || price),
        discount,
        description: description || '',
        specifications: JSON.stringify(specifications || {}),
        variants:       JSON.stringify(variants       || {}),
        images:         JSON.stringify(images         || ['📦']),
        tags:           JSON.stringify(tags           || []),
        stock:    parseInt(stock) || 100,
        lowStock: parseInt(stock) < 10,
        warranty:      warranty      || '1 an',
        returnPolicy:  returnPolicy  || 'Retour 15 jours',
        expressDelivery: expressDelivery !== false,
        freeDelivery:    freeDelivery    !== false,
        isActive: false,
        status: 'PENDING',
      },
      include: { category: { include: { parent: true } } },
    });
    await prisma.seller.update({ where: { id: req.seller.id }, data: { productsCount: { increment: 1 } } });
    res.json(parseP(product));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/seller/products/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: parseInt(req.params.id), sellerId: req.seller.id },
    });
    if (!existing) return res.status(404).json({ error: 'Produit introuvable' });

    const {
      title, brand, categoryId, sku, price, originalPrice,
      description, specifications, variants, images, stock,
      warranty, returnPolicy, expressDelivery, freeDelivery, tags,
    } = req.body;

    const newPrice    = price    ? parseFloat(price)    : existing.price;
    const newOriginal = originalPrice ? parseFloat(originalPrice) : existing.originalPrice;
    const discount    = newOriginal > newPrice ? Math.round((1 - newPrice / newOriginal) * 100) : 0;

    const data = {
      ...(title        !== undefined && { title }),
      ...(brand        !== undefined && { brand }),
      ...(categoryId   !== undefined && { categoryId: parseInt(categoryId), subcategory: '' }),
      ...(sku          !== undefined && { sku: sku || null }),
      ...(price        !== undefined && { price: newPrice, discount }),
      ...(originalPrice !== undefined && { originalPrice: newOriginal }),
      ...(description  !== undefined && { description }),
      ...(specifications !== undefined && { specifications: JSON.stringify(specifications) }),
      ...(variants     !== undefined && { variants: JSON.stringify(variants) }),
      ...(images       !== undefined && { images: JSON.stringify(images) }),
      ...(tags         !== undefined && { tags: JSON.stringify(tags) }),
      ...(stock        !== undefined && { stock: parseInt(stock), lowStock: parseInt(stock) < 10 }),
      ...(warranty     !== undefined && { warranty }),
      ...(returnPolicy !== undefined && { returnPolicy }),
      ...(expressDelivery !== undefined && { expressDelivery }),
      ...(freeDelivery    !== undefined && { freeDelivery }),
    };
    // Repasser en modération UNIQUEMENT si le titre ou le prix change
    // Un changement de catégorie/SKU/stock/description ne remet PAS en modération
    const needsReview = (title && title !== existing.title) || (price && Math.abs(parseFloat(price) - existing.price) > 0.001);
    if (needsReview) { data.isActive = false; data.status = 'PENDING'; }

    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) }, data,
      include: { category: { include: { parent: true } } },
    });
    res.json(parseP(product));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/seller/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: parseInt(req.params.id), sellerId: req.seller.id },
    });
    if (!existing) return res.status(404).json({ error: 'Produit introuvable' });
    await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false, status: 'DRAFT' },
    });
    await prisma.seller.update({ where: { id: req.seller.id }, data: { productsCount: { decrement: 1 } } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
