const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

// PROMO CODES
router.get('/promo-codes', async (req, res) => {
  try {
    const promos = await prisma.promoCode.findMany({ orderBy: { id: 'desc' } });
    res.json(promos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/promo-codes', async (req, res) => {
  try {
    const { code, discount, isActive } = req.body;
    const promo = await prisma.promoCode.create({ data: { code: code.toUpperCase(), discount: parseFloat(discount), isActive: isActive !== false } });
    await logAction(req.admin.id, 'CREATE_PROMO', 'marketing', promo.id, { code }, req.ip);
    res.json(promo);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/promo-codes/:id', async (req, res) => {
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

router.delete('/promo-codes/:id', async (req, res) => {
  try {
    await prisma.promoCode.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/promo-codes/:id/toggle', async (req, res) => {
  try {
    const promo = await prisma.promoCode.findUnique({ where: { id: parseInt(req.params.id) } });
    const updated = await prisma.promoCode.update({ where: { id: parseInt(req.params.id) }, data: { isActive: !promo.isActive } });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// BANNERS
router.get('/banners', async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json(banners);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/banners', async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, position, isActive, sortOrder } = req.body;
    const banner = await prisma.banner.create({
      data: { title, imageUrl, linkUrl, position: position || 'HOME_HERO', isActive: isActive !== false, sortOrder: sortOrder || 0 }
    });
    res.json(banner);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/banners/:id', async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, position, isActive, sortOrder } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (linkUrl !== undefined) data.linkUrl = linkUrl;
    if (position !== undefined) data.position = position;
    if (isActive !== undefined) data.isActive = isActive;
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
    const banner = await prisma.banner.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(banner);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/banners/:id', async (req, res) => {
  try {
    await prisma.banner.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FLASH SALES
router.get('/flash-sales', async (req, res) => {
  try {
    const sales = await prisma.flashSale.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(sales);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/flash-sales', async (req, res) => {
  try {
    const { name, startAt, endAt, discountPct, isActive, productIds } = req.body;
    const sale = await prisma.flashSale.create({
      data: {
        name, startAt: new Date(startAt), endAt: new Date(endAt),
        discountPct: parseInt(discountPct), isActive: isActive !== false,
        productIds: JSON.stringify(productIds || [])
      }
    });
    res.json(sale);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/flash-sales/:id', async (req, res) => {
  try {
    const { name, startAt, endAt, discountPct, isActive, productIds } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (startAt !== undefined) data.startAt = new Date(startAt);
    if (endAt !== undefined) data.endAt = new Date(endAt);
    if (discountPct !== undefined) data.discountPct = parseInt(discountPct);
    if (isActive !== undefined) data.isActive = isActive;
    if (productIds !== undefined) data.productIds = JSON.stringify(productIds);
    const sale = await prisma.flashSale.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(sale);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/flash-sales/:id', async (req, res) => {
  try {
    await prisma.flashSale.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
