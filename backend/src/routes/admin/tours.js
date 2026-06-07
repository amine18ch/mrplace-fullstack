/**
 * Admin — Gestion des tournées + Dispatch + Manifeste
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { manifesteTournee } = require('../../lib/deliveryDocs');
const { logAction } = require('../../middleware/adminAuth');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const getPlatform = async () => {
  const s = await prisma.platformSetting.findMany();
  const m = Object.fromEntries(s.map(x => [x.key, x.value]));
  return { name: m['marketplace_name']||'MARKET', nif: m['marketplace_nif']||'', rne: m['marketplace_rne']||'', address: m['marketplace_address']||'' };
};

// GET /api/admin/tours
router.get('/', async (req, res) => {
  try {
    const { date, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      where.date = { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: new Date(d.getFullYear(), d.getMonth(), d.getDate()+1) };
    }
    const tours = await prisma.tour.findMany({
      where, include: {
        driver: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, plate: true, brand: true } },
        stops: true,
        _count: { select: { stops: true } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(tours);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/tours/:id
router.get('/:id', async (req, res) => {
  try {
    const tour = await prisma.tour.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        driver: true, vehicle: true,
        stops: { orderBy: { position: 'asc' } },
        shipments: true,
        settlements: { include: { collections: true } },
      },
    });
    if (!tour) return res.status(404).json({ error: 'Tournée introuvable' });
    res.json(tour);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/tours — Créer une tournée
router.post('/', async (req, res) => {
  try {
    const { date, driverId, vehicleId, shipmentIds, notes } = req.body;

    // Vérifier conformité véhicule
    const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) }, include: { docs: true } });
    if (!vehicle) return res.status(400).json({ error: 'Véhicule introuvable' });
    const expiredDoc = vehicle.docs.find(d => d.expiresAt && new Date(d.expiresAt) < new Date());
    if (expiredDoc) return res.status(400).json({ error: `Document expiré : ${expiredDoc.type} — mise à jour requise avant toute affectation` });
    if (vehicle.status !== 'ACTIVE') return res.status(400).json({ error: 'Véhicule non actif' });

    // Vérifier conformité chauffeur
    const driver = await prisma.driver.findUnique({ where: { id: parseInt(driverId) }, include: { docs: true } });
    if (!driver) return res.status(400).json({ error: 'Chauffeur introuvable' });
    const expiredDriverDoc = driver.docs.find(d => d.expiresAt && new Date(d.expiresAt) < new Date());
    if (expiredDriverDoc) return res.status(400).json({ error: `Document chauffeur expiré : ${expiredDriverDoc.type}` });
    if (driver.status !== 'ACTIVE') return res.status(400).json({ error: 'Chauffeur non actif ou suspendu' });

    const ids = (shipmentIds || []).map(Number);

    // Calculer totaux COD
    const shipments = await prisma.shipment.findMany({ where: { id: { in: ids } } });
    const codTotal = shipments.filter(s => s.isCod).reduce((sum, s) => sum + s.codAmount, 0);

    const tour = await prisma.tour.create({
      data: {
        date: new Date(date), driverId: parseInt(driverId), vehicleId: parseInt(vehicleId),
        notes: notes || '', codTotal,
        stops: {
          create: ids.map((shipmentId, i) => ({ shipmentId, position: i+1 })),
        },
      },
      include: { stops: true },
    });

    // Affecter les expéditions à cette tournée
    if (ids.length > 0) {
      await prisma.shipment.updateMany({
        where: { id: { in: ids } },
        data: { tourId: tour.id, driverId: parseInt(driverId), vehicleId: parseInt(vehicleId), status: 'ASSIGNED' },
      });
    }

    logAction(req.admin.id, 'CREATE_TOUR', 'tours', tour.id, { driverId, vehicleId, shipmentCount: ids.length }, req.ip);
    res.status(201).json(tour);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/tours/:id — Modifier tournée (ajout/suppression stop, statut)
router.patch('/:id', async (req, res) => {
  try {
    const { status, kmActual, returnAt, notes } = req.body;
    const data = {};
    if (status !== undefined) data.status = status;
    if (kmActual !== undefined) data.kmActual = parseFloat(kmActual);
    if (returnAt !== undefined) data.returnAt = new Date(returnAt);
    if (notes !== undefined) data.notes = notes;
    const tour = await prisma.tour.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(tour);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/tours/:id/stops — Ajouter un stop
router.post('/:id/stops', async (req, res) => {
  try {
    const { shipmentId } = req.body;
    const id = parseInt(req.params.id);
    const maxPos = await prisma.tourStop.aggregate({ where: { tourId: id }, _max: { position: true } });
    const stop = await prisma.tourStop.create({
      data: { tourId: id, shipmentId: parseInt(shipmentId), position: (maxPos._max.position || 0) + 1 },
    });
    await prisma.shipment.update({ where: { id: parseInt(shipmentId) }, data: { tourId: id } });
    res.status(201).json(stop);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/tours/:id/stops/:stopId
router.delete('/:id/stops/:stopId', async (req, res) => {
  try {
    const stop = await prisma.tourStop.findUnique({ where: { id: parseInt(req.params.stopId) } });
    await prisma.tourStop.delete({ where: { id: parseInt(req.params.stopId) } });
    if (stop) await prisma.shipment.update({ where: { id: stop.shipmentId }, data: { tourId: null } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/tours/:id/manifeste — Document manifeste HTML
const docAuth = (req, res, next) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send('<h1>Non authentifié</h1>');
  try { req.admin = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).send('<h1>Session expirée</h1>'); }
};

router.get('/:id/manifeste', docAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tour = await prisma.tour.findUnique({ where: { id } });
    if (!tour) return res.status(404).send('<h1>Tournée introuvable</h1>');
    const stops = await prisma.tourStop.findMany({ where: { tourId: id }, orderBy: { position: 'asc' } });
    const shipmentIds = stops.map(s => s.shipmentId);
    const [driver, vehicle, shipments, platform] = await Promise.all([
      prisma.driver.findUnique({ where: { id: tour.driverId } }),
      prisma.vehicle.findUnique({ where: { id: tour.vehicleId } }),
      prisma.shipment.findMany({ where: { id: { in: shipmentIds } } }),
      getPlatform(),
    ]);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(manifesteTournee(tour, driver, vehicle, stops, shipments, platform));
  } catch (e) { res.status(500).send(e.message); }
});

module.exports = router;
