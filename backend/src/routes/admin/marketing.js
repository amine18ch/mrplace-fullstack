const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { adminAuth, requireRole, logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();


// PROMO CODES - GET (all roles)
router.get('/promo-codes', async (req, res) => {
  try {
    const promos = await prisma.promoCode.findMany({ orderBy: { id: 'desc' } });
    res.json(promos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/promo-codes', requireRole('MARKETING'), async (req, res) => {
  try {
    const { code, discount, isActive } = req.body;
    const promo = await prisma.promoCode.create({
      data: { code: code.toUpperCase(), discount: parseFloat(discount), isActive: isActive !== false }
    });
    await logAction(req.admin.id, 'CREATE_PROMO', 'marketing', promo.id, { code }, req.ip);
    res.json(promo);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/promo-codes/:id', requireRole('MARKETING'), async (req, res) => {
  try {
    const { code, discount, isActive } = req.body;
    const data = {};
    if (code !== undefined) data.code = code.toUpperCase();
    if (discount !== undefined) data.discount = parseFloat(discount);
    if (isActive !== undefined) data.isActive = isActive;
    const promo = await prisma.promoCode.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(promo);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/promo-codes/:id', requireRole('MARKETING'), async (req, res) => {
  try {
    await prisma.promoCode.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/promo-codes/:id/toggle', requireRole('MARKETING'), async (req, res) => {
  try {
    const promo = await prisma.promoCode.findUnique({ where: { id: parseInt(req.params.id) } });
    const updated = await prisma.promoCode.update({
      where: { id: parseInt(req.params.id) }, data: { isActive: !promo.isActive }
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// For backward compat - POST toggle (old route)
router.post('/promo-codes/:id/toggle', requireRole('MARKETING'), async (req, res) => {
  try {
    const promo = await prisma.promoCode.findUnique({ where: { id: parseInt(req.params.id) } });
    const updated = await prisma.promoCode.update({
      where: { id: parseInt(req.params.id) }, data: { isActive: !promo.isActive }
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// BANNERS - GET (all roles)
router.get('/banners', async (req, res) => {
  try {
    const { type } = req.query;
    const where = type ? { type } : {};
    const banners = await prisma.banner.findMany({ where, orderBy: { sortOrder: 'asc' } });
    res.json(banners);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/banners', requireRole('MARKETING', 'MODERATEUR'), async (req, res) => {
  try {
    const { title, subtitle, description, ctaText, catSlug, sellerSlug, bgFrom, bgTo, bgImageUrl, emoji, sortOrder } = req.body;
    const banner = await prisma.banner.create({
      data: {
        type: req.body.type || 'HERO',
        title: title || 'Nouveau banner',
        subtitle: subtitle || '', description: description || '',
        ctaText: ctaText || 'Découvrir',
        catSlug: catSlug || '', sellerSlug: sellerSlug || '',
        bgFrom: bgFrom || '#1E3A8A', bgTo: bgTo || '#2563EB',
        bgImageUrl: bgImageUrl || '', emoji: emoji || '🎉',
        isActive: true, sortOrder: parseInt(sortOrder) || 0,
      },
    });
    await logAction(req.admin.id, 'CREATE_BANNER', 'marketing', banner.id, { title }, req.ip);
    res.json(banner);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/banners/:id', requireRole('MARKETING', 'MODERATEUR'), async (req, res) => {
  try {
    const { title, subtitle, description, ctaText, catSlug, sellerSlug, bgFrom, bgTo, bgImageUrl, emoji, isActive, sortOrder } = req.body;
    const data = {};
    if (title        !== undefined) data.title        = title;
    if (subtitle     !== undefined) data.subtitle     = subtitle;
    if (description  !== undefined) data.description  = description;
    if (ctaText      !== undefined) data.ctaText      = ctaText;
    if (catSlug      !== undefined) data.catSlug      = catSlug;
    if (sellerSlug   !== undefined) data.sellerSlug   = sellerSlug;
    if (bgFrom       !== undefined) data.bgFrom       = bgFrom;
    if (bgTo         !== undefined) data.bgTo         = bgTo;
    if (bgImageUrl   !== undefined) data.bgImageUrl   = bgImageUrl;
    if (emoji        !== undefined) data.emoji        = emoji;
    if (isActive     !== undefined) data.isActive     = isActive;
    if (sortOrder    !== undefined) data.sortOrder    = parseInt(sortOrder);
    const banner = await prisma.banner.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(banner);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/banners/:id', requireRole('MARKETING'), async (req, res) => {
  try {
    await prisma.banner.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/banners/:id/toggle', requireRole('MARKETING'), async (req, res) => {
  try {
    const banner = await prisma.banner.findUnique({ where: { id: parseInt(req.params.id) } });
    const updated = await prisma.banner.update({
      where: { id: parseInt(req.params.id) }, data: { isActive: !banner.isActive }
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FLASH SALES
router.get('/flash-sales', async (req, res) => {
  try {
    const sales = await prisma.flashSale.findMany({ orderBy: { startAt: 'desc' } });
    // Enrichir avec les produits
    const enriched = await Promise.all(sales.map(async s => {
      const ids = JSON.parse(s.productIds || '[]').map(Number).filter(Boolean);
      const products = ids.length ? await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id:true, title:true, price:true, images:true, isActive:true },
      }) : [];
      const now = new Date();
      const status = !s.isActive ? 'inactive'
        : s.endAt < now ? 'expired'
        : s.startAt > now ? 'upcoming'
        : 'active';
      return { ...s, products, status };
    }));
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/flash-sales', requireRole('MARKETING', 'MODERATEUR'), async (req, res) => {
  try {
    const { name, startAt, endAt, discountPct, productIds } = req.body;
    if (!name || !startAt || !endAt || !discountPct) return res.status(400).json({ error: 'Champs requis manquants' });
    const sale = await prisma.flashSale.create({
      data: {
        name, startAt: new Date(startAt), endAt: new Date(endAt),
        discountPct: parseInt(discountPct),
        isActive: true,
        productIds: JSON.stringify(productIds || []),
      },
    });
    await logAction(req.admin.id, 'CREATE_FLASH_SALE', 'marketing', sale.id, { name }, req.ip);
    res.json(sale);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/flash-sales/:id', requireRole('MARKETING', 'MODERATEUR'), async (req, res) => {
  try {
    const { name, startAt, endAt, discountPct, isActive, productIds } = req.body;
    const data = {};
    if (name        !== undefined) data.name        = name;
    if (startAt     !== undefined) data.startAt     = new Date(startAt);
    if (endAt       !== undefined) data.endAt       = new Date(endAt);
    if (discountPct !== undefined) data.discountPct = parseInt(discountPct);
    if (isActive    !== undefined) data.isActive    = isActive;
    if (productIds  !== undefined) data.productIds  = JSON.stringify(productIds);
    const sale = await prisma.flashSale.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(sale);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/flash-sales/:id/toggle', requireRole('MARKETING', 'MODERATEUR'), async (req, res) => {
  try {
    const s = await prisma.flashSale.findUnique({ where: { id: parseInt(req.params.id) } });
    const updated = await prisma.flashSale.update({ where: { id: s.id }, data: { isActive: !s.isActive } });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/flash-sales/:id', requireRole('MARKETING', 'MODERATEUR'), async (req, res) => {
  try {
    await prisma.flashSale.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Recherche de produits pour le sélecteur flash sale
router.get('/flash-sales/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: q ? [{ title: { contains: q } }, { brand: { contains: q } }] : undefined,
      },
      select: { id:true, title:true, brand:true, price:true, images:true, seller:{ select:{ name:true } } },
      orderBy: { soldCount: 'desc' },
      take: 20,
    });
    const parsed = products.map(p => ({
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
    }));
    res.json(parsed);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
