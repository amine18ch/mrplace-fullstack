/**
 * API PWA Chauffeur — Tournée du jour, stops, signature POD, COD
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { driverAuth } = require('../../middleware/driverAuth');
const { recuCOD } = require('../../lib/deliveryDocs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const getPlatform = async () => {
  const s = await prisma.platformSetting.findMany();
  const m = Object.fromEntries(s.map(x => [x.key, x.value]));
  return { name: m['marketplace_name']||'MARKET', nif: m['marketplace_nif']||'', email: m['marketplace_email']||'' };
};

// GET /api/driver/tours/today — Tournée du jour
router.get('/today', driverAuth, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);

    const tour = await prisma.tour.findFirst({
      where: {
        driverId: req.driver.id,
        date: { gte: startOfDay, lt: endOfDay },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      include: {
        vehicle: { select: { plate: true, brand: true, model: true } },
        stops: {
          orderBy: { position: 'asc' },
          include: {},
        },
      },
    });

    if (!tour) return res.json({ tour: null });

    // Enrichir chaque stop avec les infos expédition
    const stopIds = tour.stops.map(s => s.shipmentId);
    const shipments = await prisma.shipment.findMany({ where: { id: { in: stopIds } } });
    const shipMap = Object.fromEntries(shipments.map(s => [s.id, s]));

    const enrichedStops = tour.stops.map(stop => ({
      ...stop,
      shipment: shipMap[stop.shipmentId] || null,
      deliveryAddress: (() => { try { return JSON.parse(shipMap[stop.shipmentId]?.deliveryAddress||'{}'); } catch { return {}; } })(),
    }));

    res.json({ tour: { ...tour, stops: enrichedStops } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/driver/tours/:id
router.get('/:id', driverAuth, async (req, res) => {
  try {
    const tour = await prisma.tour.findFirst({
      where: { id: parseInt(req.params.id), driverId: req.driver.id },
      include: { stops: { orderBy: { position: 'asc' } }, vehicle: true },
    });
    if (!tour) return res.status(404).json({ error: 'Tournée introuvable' });
    const stopIds = tour.stops.map(s => s.shipmentId);
    const shipments = await prisma.shipment.findMany({ where: { id: { in: stopIds } } });
    const shipMap = Object.fromEntries(shipments.map(s => [s.id, s]));
    const enrichedStops = tour.stops.map(stop => ({
      ...stop,
      shipment: shipMap[stop.shipmentId] || null,
      deliveryAddress: (() => { try { return JSON.parse(shipMap[stop.shipmentId]?.deliveryAddress||'{}'); } catch { return {}; } })(),
    }));
    res.json({ ...tour, stops: enrichedStops });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/driver/tours/:id/start — Démarrer tournée
router.patch('/:id/start', driverAuth, async (req, res) => {
  try {
    const tour = await prisma.tour.findFirst({ where: { id: parseInt(req.params.id), driverId: req.driver.id } });
    if (!tour) return res.status(404).json({ error: 'Tournée introuvable' });
    const updated = await prisma.tour.update({ where: { id: tour.id }, data: { status: 'IN_PROGRESS', departAt: new Date() } });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/driver/tours/:tourId/stops/:stopId/deliver — Livraison réussie
router.post('/:tourId/stops/:stopId/deliver', driverAuth, async (req, res) => {
  try {
    const { signatureUrl, photoUrl, codAmount, codMethod, lat, lng } = req.body;
    const stopId = parseInt(req.params.stopId);
    const stop = await prisma.tourStop.findUnique({ where: { id: stopId } });
    if (!stop) return res.status(404).json({ error: 'Stop introuvable' });

    const shipment = await prisma.shipment.findUnique({ where: { id: stop.shipmentId } });
    if (!shipment) return res.status(400).json({ error: 'Expédition introuvable' });

    // Marquer le stop comme fait
    await prisma.tourStop.update({ where: { id: stopId }, data: { status: 'DONE', doneAt: new Date() } });

    // Mettre à jour l'expédition
    await prisma.shipment.update({ where: { id: shipment.id }, data: { status: 'DELIVERED' } });

    // Événement shipment
    await prisma.shipmentEvent.create({
      data: { shipmentId: shipment.id, status: 'DELIVERED', note: `Livré par chauffeur #${req.driver.id}`, createdBy: 'DRIVER', actorId: req.driver.id, lat: lat||null, lng: lng||null },
    });

    // Synchroniser OrderFulfillment
    if (shipment.fulfillmentId) {
      await prisma.orderFulfillment.update({ where: { id: shipment.fulfillmentId }, data: { status: 'LIVREE' } });
    }

    // COD : créer la collection si applicable
    let collection = null;
    if (shipment.isCod && codAmount) {
      const amount = parseFloat(codAmount);
      collection = await prisma.codCollection.create({
        data: { shipmentId: shipment.id, driverId: req.driver.id, amount, method: codMethod||'CASH', signatureUrl: signatureUrl||'', photoUrl: photoUrl||'' },
      });
      // Incrémenter solde COD du chauffeur
      await prisma.driver.update({ where: { id: req.driver.id }, data: { codBalance: { increment: amount } } });
    }

    // Enregistrer signature si fournie (également pour non-COD)
    if (!shipment.isCod && signatureUrl) {
      await prisma.codCollection.upsert({
        where: { shipmentId: shipment.id },
        update: { signatureUrl, photoUrl: photoUrl||'' },
        create: { shipmentId: shipment.id, driverId: req.driver.id, amount: 0, method: 'CASH', signatureUrl, photoUrl: photoUrl||'' },
      }).catch(()=>{}); // Non bloquant
    }

    res.json({ ok: true, collection });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/driver/tours/:tourId/stops/:stopId/fail — Échec de livraison
router.post('/:tourId/stops/:stopId/fail', driverAuth, async (req, res) => {
  try {
    const { reason, lat, lng } = req.body;
    const stopId = parseInt(req.params.stopId);
    const stop = await prisma.tourStop.findUnique({ where: { id: stopId } });
    if (!stop) return res.status(404).json({ error: 'Stop introuvable' });

    await prisma.tourStop.update({ where: { id: stopId }, data: { status: 'FAILED', failReason: reason||'', doneAt: new Date() } });
    await prisma.shipment.update({ where: { id: stop.shipmentId }, data: { status: 'FAILED' } });
    await prisma.shipmentEvent.create({
      data: { shipmentId: stop.shipmentId, status: 'FAILED', note: reason||'Échec de livraison', createdBy: 'DRIVER', actorId: req.driver.id, lat: lat||null, lng: lng||null },
    });

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/driver/tours/:id/complete — Clôturer tournée
router.patch('/:id/complete', driverAuth, async (req, res) => {
  try {
    const { kmActual } = req.body;
    const tour = await prisma.tour.findFirst({ where: { id: parseInt(req.params.id), driverId: req.driver.id } });
    if (!tour) return res.status(404).json({ error: 'Tournée introuvable' });
    const updated = await prisma.tour.update({
      where: { id: tour.id },
      data: { status: 'COMPLETED', returnAt: new Date(), kmActual: parseFloat(kmActual)||0 },
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/driver/tours/stops/:shipmentId/recu — Reçu COD HTML
router.get('/stops/:shipmentId/recu', async (req, res) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).send('<h1>Non authentifié</h1>');
    try { jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).send('<h1>Session expirée</h1>'); }

    const shipment = await prisma.shipment.findUnique({ where: { id: parseInt(req.params.shipmentId) } });
    if (!shipment) return res.status(404).send('<h1>Introuvable</h1>');
    const collection = await prisma.codCollection.findUnique({ where: { shipmentId: shipment.id } });
    if (!collection) return res.status(404).send('<h1>Aucun encaissement</h1>');
    const [platform, order] = await Promise.all([
      getPlatform(),
      prisma.order.findUnique({ where: { id: shipment.orderId }, include: { user: { select: { name: true } } } }),
    ]);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(recuCOD(shipment, collection, platform, order));
  } catch (e) { res.status(500).send(e.message); }
});

module.exports = router;
