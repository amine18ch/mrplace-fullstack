/**
 * Admin — Gestion des prestataires 3PL
 * Carriers + Contrats + Grilles tarifaires + Factures entrantes
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

// ── CARRIERS ──────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const carriers = await prisma.carrier.findMany({
      include: {
        contracts: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { shipments: true, pricingGrids: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(carriers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const carrier = await prisma.carrier.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        contracts: { orderBy: { createdAt: 'desc' } },
        pricingGrids: { orderBy: { governorate: 'asc' } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { shipments: true } },
      },
    });
    if (!carrier) return res.status(404).json({ error: 'Transporteur introuvable' });
    res.json(carrier);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, slug, nif, rne, phone, email, type } = req.body;
    const carrier = await prisma.carrier.create({
      data: { name, slug: slug || name.toLowerCase().replace(/\s+/g,'-'), nif:nif||'', rne:rne||'', phone:phone||'', email:email||'', type:type||'NATIONAL' },
    });
    logAction(req.admin.id, 'CREATE_CARRIER', 'carriers', carrier.id, { name }, req.ip);
    res.status(201).json(carrier);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const { name, nif, rne, phone, email, type, status } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (nif !== undefined) data.nif = nif;
    if (rne !== undefined) data.rne = rne;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    const carrier = await prisma.carrier.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(carrier);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CONTRATS ─────────────────────────────────────────────────────────────────

router.post('/:id/contracts', async (req, res) => {
  try {
    const { ref, startDate, endDate, billingMode, slaDays, penaltyPct, docUrl } = req.body;
    const contract = await prisma.carrierContract.create({
      data: {
        carrierId: parseInt(req.params.id),
        ref: ref || `CTR-${req.params.id}-${Date.now()}`,
        startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null,
        billingMode: billingMode||'PER_SHIPMENT', slaDays: parseInt(slaDays)||3,
        penaltyPct: parseFloat(penaltyPct)||0, docUrl: docUrl||'',
      },
    });
    res.status(201).json(contract);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/contracts/:contractId', async (req, res) => {
  try {
    const { status, endDate, docUrl } = req.body;
    const data = {};
    if (status !== undefined) data.status = status;
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (docUrl !== undefined) data.docUrl = docUrl;
    const contract = await prisma.carrierContract.update({ where: { id: parseInt(req.params.contractId) }, data });
    res.json(contract);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GRILLES TARIFAIRES ────────────────────────────────────────────────────────

router.get('/:id/pricing', async (req, res) => {
  try {
    const grids = await prisma.pricingGrid.findMany({ where: { carrierId: parseInt(req.params.id) }, orderBy: { governorate: 'asc' } });
    res.json(grids);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/pricing', async (req, res) => {
  try {
    const { governorate, minWeightKg, maxWeightKg, basePrice, codSurcharge, fragileExtra, expressExtra } = req.body;
    const grid = await prisma.pricingGrid.create({
      data: {
        carrierId: parseInt(req.params.id),
        governorate: governorate||'ALL',
        minWeightKg: parseFloat(minWeightKg)||0, maxWeightKg: parseFloat(maxWeightKg)||30,
        basePrice: parseFloat(basePrice), codSurcharge: parseFloat(codSurcharge)||0,
        fragileExtra: parseFloat(fragileExtra)||0, expressExtra: parseFloat(expressExtra)||0,
      },
    });
    res.status(201).json(grid);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/pricing/:gridId', async (req, res) => {
  try {
    const { basePrice, codSurcharge, fragileExtra, expressExtra, minWeightKg, maxWeightKg } = req.body;
    const data = {};
    if (basePrice !== undefined) data.basePrice = parseFloat(basePrice);
    if (codSurcharge !== undefined) data.codSurcharge = parseFloat(codSurcharge);
    if (fragileExtra !== undefined) data.fragileExtra = parseFloat(fragileExtra);
    if (expressExtra !== undefined) data.expressExtra = parseFloat(expressExtra);
    if (minWeightKg !== undefined) data.minWeightKg = parseFloat(minWeightKg);
    if (maxWeightKg !== undefined) data.maxWeightKg = parseFloat(maxWeightKg);
    const grid = await prisma.pricingGrid.update({ where: { id: parseInt(req.params.gridId) }, data });
    res.json(grid);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/pricing/:gridId', async (req, res) => {
  try {
    await prisma.pricingGrid.delete({ where: { id: parseInt(req.params.gridId) } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── FACTURES ENTRANTES ────────────────────────────────────────────────────────

router.get('/:id/invoices', async (req, res) => {
  try {
    const invoices = await prisma.carrierInvoice.findMany({ where: { carrierId: parseInt(req.params.id) }, orderBy: { createdAt: 'desc' } });
    res.json(invoices);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/invoices', async (req, res) => {
  try {
    const { ref, amount, periodStart, periodEnd, docUrl } = req.body;
    const invoice = await prisma.carrierInvoice.create({
      data: { carrierId: parseInt(req.params.id), ref, amount: parseFloat(amount), periodStart: new Date(periodStart), periodEnd: new Date(periodEnd), docUrl: docUrl||'' },
    });
    res.status(201).json(invoice);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/invoices/:invoiceId', async (req, res) => {
  try {
    const { status, docUrl } = req.body;
    const invoice = await prisma.carrierInvoice.update({
      where: { id: parseInt(req.params.invoiceId) },
      data: { status, docUrl },
    });
    res.json(invoice);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
