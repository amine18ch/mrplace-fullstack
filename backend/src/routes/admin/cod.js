/**
 * Admin — COD (Cash on Delivery) : rapprochement, remises, états
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { bordereauRemiseCOD } = require('../../lib/deliveryDocs');
const { logAction } = require('../../middleware/adminAuth');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const getPlatform = async () => {
  const s = await prisma.platformSetting.findMany();
  const m = Object.fromEntries(s.map(x => [x.key, x.value]));
  return { name: m['marketplace_name']||'MARKET', nif: m['marketplace_nif']||'' };
};

// GET /api/admin/cod/collections — Liste des encaissements COD
router.get('/collections', async (req, res) => {
  try {
    const { settled, driverId } = req.query;
    const where = {};
    if (settled === 'false') where.settlementId = null;
    if (settled === 'true') where.settlementId = { not: null };
    if (driverId) where.driverId = parseInt(driverId);

    const collections = await prisma.codCollection.findMany({
      where,
      include: {
        shipment: { select: { id: true, orderId: true, trackingRef: true, deliveryAddress: true } },
        settlement: { select: { id: true, status: true } },
      },
      orderBy: { collectedAt: 'desc' },
    });
    res.json(collections);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/cod/settlements — Liste des remises
router.get('/settlements', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const settlements = await prisma.codSettlement.findMany({
      where,
      include: {
        driver: { select: { id: true, name: true, cin: true } },
        tour: { select: { id: true, date: true } },
        collections: { select: { id: true, amount: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(settlements);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/cod/settlements — Créer une remise (clôture tournée)
router.post('/settlements', async (req, res) => {
  try {
    const { driverId, tourId, carrierId, totalActual, notes } = req.body;
    const dId = parseInt(driverId);

    // Récupérer toutes les collections non encore remises pour ce chauffeur
    const collections = await prisma.codCollection.findMany({
      where: { driverId: dId, settlementId: null },
    });
    if (collections.length === 0 && !carrierId) return res.status(400).json({ error: 'Aucun encaissement en attente pour ce chauffeur' });

    const totalExpected = collections.reduce((s, c) => s + c.amount, 0);
    const actual = parseFloat(totalActual);
    const diff = actual - totalExpected;

    const settlement = await prisma.codSettlement.create({
      data: {
        driverId: dId,
        tourId: tourId ? parseInt(tourId) : null,
        carrierId: carrierId ? parseInt(carrierId) : null,
        totalExpected, totalActual: actual, diff,
        notes: notes || '',
      },
    });

    // Relier les collections à ce settlement
    if (collections.length > 0) {
      await prisma.codCollection.updateMany({
        where: { id: { in: collections.map(c => c.id) } },
        data: { settlementId: settlement.id },
      });
    }

    // Mettre à jour solde COD du chauffeur (remettre à zéro)
    await prisma.driver.update({ where: { id: dId }, data: { codBalance: 0 } });

    logAction(req.admin.id, 'CREATE_COD_SETTLEMENT', 'cod', settlement.id, { driverId, totalExpected, totalActual: actual, diff }, req.ip);
    res.status(201).json(settlement);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/cod/settlements/:id/validate
router.patch('/settlements/:id/validate', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const settlement = await prisma.codSettlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: status||'VALIDATED', validatedBy: req.admin.id, validatedAt: new Date(), notes: notes||'' },
    });
    logAction(req.admin.id, 'VALIDATE_COD_SETTLEMENT', 'cod', settlement.id, { status }, req.ip);
    res.json(settlement);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/cod/pending-balance — Solde COD en attente par chauffeur
router.get('/pending-balance', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({ where: { codBalance: { gt: 0 } }, select: { id: true, name: true, cin: true, codBalance: true } });
    const result = await Promise.all(drivers.map(async d => {
      const collections = await prisma.codCollection.findMany({ where: { driverId: d.id, settlementId: null } });
      return { ...d, pendingCount: collections.length, pendingTotal: collections.reduce((s,c)=>s+c.amount,0) };
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/cod/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalCollected, totalSettled, pendingSettlement, disputedCount] = await Promise.all([
      prisma.codCollection.aggregate({ _sum: { amount: true } }),
      prisma.codSettlement.aggregate({ where: { status: 'VALIDATED' }, _sum: { totalActual: true } }),
      prisma.codCollection.aggregate({ where: { settlementId: null }, _sum: { amount: true }, _count: { id: true } }),
      prisma.codSettlement.count({ where: { status: 'DISPUTED' } }),
    ]);
    res.json({
      totalCollected: totalCollected._sum.amount || 0,
      totalSettled: totalSettled._sum.totalActual || 0,
      pendingAmount: pendingSettlement._sum.amount || 0,
      pendingCount: pendingSettlement._count.id || 0,
      disputedCount,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/cod/settlements/:id/bordereau — Document HTML
const docAuth = (req, res, next) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send('<h1>Non authentifié</h1>');
  try { req.admin = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).send('<h1>Session expirée</h1>'); }
};

router.get('/settlements/:id/bordereau', docAuth, async (req, res) => {
  try {
    const settlement = await prisma.codSettlement.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { driver: true, tour: true, collections: true },
    });
    if (!settlement) return res.status(404).send('<h1>Introuvable</h1>');
    const platform = await getPlatform();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(bordereauRemiseCOD(settlement, settlement.driver, settlement.tour, settlement.collections, platform));
  } catch (e) { res.status(500).send(e.message); }
});

module.exports = router;
