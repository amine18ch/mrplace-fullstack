const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { sellerAuth } = require('../../middleware/sellerAuth');
const prisma = new PrismaClient();

router.use(sellerAuth);

const parseP = p => p ? {
  ...p,
  images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images || [],
  tags:   typeof p.tags   === 'string' ? JSON.parse(p.tags)   : p.tags   || [],
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
    if (status === 'active')   where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: parseInt(limit), include: { category: true }, orderBy: { createdAt: 'desc' } }),
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
      include: { category: true },
    });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(parseP(product));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/seller/products — ajouter un produit
router.post('/', async (req, res) => {
  try {
    const {
      title, brand, categoryId, subcategory, price, originalPrice,
      description, specifications, variants, images, stock,
      warranty, returnPolicy, expressDelivery, freeDelivery, tags
    } = req.body;

    if (!title || !price || !categoryId) return res.status(400).json({ error: 'Titre, prix et catégorie requis' });

    const discount = originalPrice && originalPrice > price
      ? Math.round((1 - price / originalPrice) * 100) : 0;

    const product = await prisma.product.create({
      data: {
        title, brand: brand || req.seller.name,
        sellerId: req.seller.id,
        categoryId: parseInt(categoryId),
        subcategory: subcategory || '',
        price: parseFloat(price),
        originalPrice: parseFloat(originalPrice || price),
        discount,
        description: description || '',
        specifications: JSON.stringify(specifications || {}),
        variants: JSON.stringify(variants || {}),
        images: JSON.stringify(images || ['📦']),
        tags: JSON.stringify(tags || []),
        stock: parseInt(stock) || 100,
        lowStock: parseInt(stock) < 10,
        warranty: warranty || '1 an',
        returnPolicy: returnPolicy || 'Retour 15 jours',
        expressDelivery: expressDelivery !== false,
        freeDelivery: freeDelivery !== false,
        isActive: false, // En attente de modération admin
      },
      include: { category: true },
    });
    // Mettre à jour le compteur de produits du vendeur
    await prisma.seller.update({ where: { id: req.seller.id }, data: { productsCount: { increment: 1 } } });
    res.json(parseP(product));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/seller/products/:id — modifier un produit
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: parseInt(req.params.id), sellerId: req.seller.id } });
    if (!existing) return res.status(404).json({ error: 'Produit introuvable' });

    const { title, brand, categoryId, subcategory, price, originalPrice, description, specifications, variants, images, stock, warranty, returnPolicy, expressDelivery, freeDelivery, tags } = req.body;
    const discount = originalPrice && parseFloat(originalPrice) > parseFloat(price || existing.price)
      ? Math.round((1 - parseFloat(price || existing.price) / parseFloat(originalPrice)) * 100) : 0;

    const data = {};
    if (title)        data.title = title;
    if (brand)        data.brand = brand;
    if (categoryId)   data.categoryId = parseInt(categoryId);
    if (subcategory !== undefined) data.subcategory = subcategory;
    if (price)        { data.price = parseFloat(price); data.discount = discount; }
    if (originalPrice) data.originalPrice = parseFloat(originalPrice);
    if (description !== undefined) data.description = description;
    if (specifications) data.specifications = JSON.stringify(specifications);
    if (variants)     data.variants = JSON.stringify(variants);
    if (images)       data.images = JSON.stringify(images);
    if (tags)         data.tags = JSON.stringify(tags);
    if (stock !== undefined) { data.stock = parseInt(stock); data.lowStock = parseInt(stock) < 10; }
    if (warranty)     data.warranty = warranty;
    if (returnPolicy) data.returnPolicy = returnPolicy;
    if (expressDelivery !== undefined) data.expressDelivery = expressDelivery;
    if (freeDelivery  !== undefined)   data.freeDelivery  = freeDelivery;
    // Repasser en modération si changement de prix ou titre
    if (title || price) data.isActive = false;

    const product = await prisma.product.update({ where: { id: parseInt(req.params.id) }, data, include: { category: true } });
    res.json(parseP(product));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/seller/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: parseInt(req.params.id), sellerId: req.seller.id } });
    if (!existing) return res.status(404).json({ error: 'Produit introuvable' });
    await prisma.product.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    await prisma.seller.update({ where: { id: req.seller.id }, data: { productsCount: { decrement: 1 } } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
