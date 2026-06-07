/**
 * Admin — Gestion de la flotte : Véhicules + Chauffeurs + Documents + Alertes
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { logAction } = require('../../middleware/adminAuth');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ── VÉHICULES ─────────────────────────────────────────────────────────────────

router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { docs: { orderBy: { expiresAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(vehicles);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/vehicles/:id', async (req, res) => {
  try {
    const v = await prisma.vehicle.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        docs: true,
        tours: { orderBy: { date: 'desc' }, take: 5, include: { driver: { select: { name: true } } } },
        shipments: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' });
    res.json(v);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/vehicles', async (req, res) => {
  try {
    const { plate, brand, model, type, ptacKg, capacityKg, capacityL } = req.body;
    const vehicle = await prisma.vehicle.create({
      data: { plate, brand, model: model||'', type: type||'VL', ptacKg: parseFloat(ptacKg)||3500, capacityKg: parseFloat(capacityKg)||500, capacityL: parseFloat(capacityL)||1000 },
    });
    logAction(req.admin.id, 'CREATE_VEHICLE', 'fleet', vehicle.id, { plate }, req.ip);
    res.status(201).json(vehicle);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/vehicles/:id', async (req, res) => {
  try {
    const { brand, model, type, ptacKg, capacityKg, capacityL, status, assignedDriverId } = req.body;
    const data = {};
    if (brand !== undefined) data.brand = brand;
    if (model !== undefined) data.model = model;
    if (type !== undefined) data.type = type;
    if (ptacKg !== undefined) data.ptacKg = parseFloat(ptacKg);
    if (capacityKg !== undefined) data.capacityKg = parseFloat(capacityKg);
    if (capacityL !== undefined) data.capacityL = parseFloat(capacityL);
    if (status !== undefined) data.status = status;
    if (assignedDriverId !== undefined) data.assignedDriverId = assignedDriverId ? parseInt(assignedDriverId) : null;
    const v = await prisma.vehicle.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(v);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Documents véhicule
router.post('/vehicles/:id/docs', async (req, res) => {
  try {
    const { type, url, expiresAt } = req.body;
    const doc = await prisma.vehicleDoc.create({
      data: { vehicleId: parseInt(req.params.id), type, url, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/vehicles/:id/docs/:docId', async (req, res) => {
  try {
    await prisma.vehicleDoc.delete({ where: { id: parseInt(req.params.docId) } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CHAUFFEURS ────────────────────────────────────────────────────────────────

router.get('/drivers', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: { docs: { orderBy: { expiresAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(drivers.map(d => ({ ...d, password: undefined })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/drivers/:id', async (req, res) => {
  try {
    const d = await prisma.driver.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        docs: true,
        tours: { orderBy: { date: 'desc' }, take: 5 },
        settlements: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!d) return res.status(404).json({ error: 'Chauffeur introuvable' });
    res.json({ ...d, password: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/drivers', async (req, res) => {
  try {
    const { name, phone, cin, licenseNo, licenseType, password } = req.body;
    const existing = await prisma.driver.findUnique({ where: { cin } });
    if (existing) return res.status(400).json({ error: 'CIN déjà enregistré' });
    const hash = password ? await bcrypt.hash(password, 10) : null;
    const driver = await prisma.driver.create({
      data: { name, phone, cin, licenseNo, licenseType: licenseType||'B', password: hash },
    });
    logAction(req.admin.id, 'CREATE_DRIVER', 'fleet', driver.id, { name, cin }, req.ip);
    res.status(201).json({ ...driver, password: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/drivers/:id', async (req, res) => {
  try {
    const { name, phone, licenseNo, licenseType, status, password } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (licenseNo !== undefined) data.licenseNo = licenseNo;
    if (licenseType !== undefined) data.licenseType = licenseType;
    if (status !== undefined) data.status = status;
    if (password) data.password = await bcrypt.hash(password, 10);
    const d = await prisma.driver.update({ where: { id: parseInt(req.params.id) }, data });
    res.json({ ...d, password: undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Documents chauffeur
router.post('/drivers/:id/docs', async (req, res) => {
  try {
    const { type, url, expiresAt } = req.body;
    const doc = await prisma.driverDoc.create({
      data: { driverId: parseInt(req.params.id), type, url, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/drivers/:id/docs/:docId', async (req, res) => {
  try {
    await prisma.driverDoc.delete({ where: { id: parseInt(req.params.docId) } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ZONES ─────────────────────────────────────────────────────────────────────

router.get('/zones', async (req, res) => {
  try {
    const zones = await prisma.fleetZone.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json(zones);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/zones/:governorate', async (req, res) => {
  try {
    const { mode, isActive } = req.body;
    const zone = await prisma.fleetZone.upsert({
      where: { governorate: req.params.governorate },
      update: { mode, isActive },
      create: { governorate: req.params.governorate, mode: mode||'THIRD_PARTY', isActive: isActive!==false },
    });
    res.json(zone);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ALERTES DE CONFORMITÉ ─────────────────────────────────────────────────────

router.get('/compliance-alerts', async (req, res) => {
  try {
    // Recalculer les alertes à la volée
    const now = new Date();
    const alerts = [];

    const vehicleDocs = await prisma.vehicleDoc.findMany({ include: { vehicle: { select: { plate: true, brand: true } } } });
    for (const doc of vehicleDocs) {
      if (!doc.expiresAt) continue;
      const daysLeft = Math.floor((new Date(doc.expiresAt) - now) / (1000*60*60*24));
      if (daysLeft <= 60) {
        alerts.push({
          entityType: 'VEHICLE', entityId: doc.vehicleId, entityName: `${doc.vehicle.brand} ${doc.vehicle.plate}`,
          docType: doc.type, expiresAt: doc.expiresAt, daysLeft,
          severity: daysLeft <= 0 ? 'EXPIRED' : daysLeft <= 7 ? 'CRITICAL' : daysLeft <= 15 ? 'WARNING' : 'INFO',
        });
      }
    }

    const driverDocs = await prisma.driverDoc.findMany({ include: { driver: { select: { name: true } } } });
    for (const doc of driverDocs) {
      if (!doc.expiresAt) continue;
      const daysLeft = Math.floor((new Date(doc.expiresAt) - now) / (1000*60*60*24));
      if (daysLeft <= 60) {
        alerts.push({
          entityType: 'DRIVER', entityId: doc.driverId, entityName: doc.driver.name,
          docType: doc.type, expiresAt: doc.expiresAt, daysLeft,
          severity: daysLeft <= 0 ? 'EXPIRED' : daysLeft <= 7 ? 'CRITICAL' : daysLeft <= 15 ? 'WARNING' : 'INFO',
        });
      }
    }

    alerts.sort((a, b) => a.daysLeft - b.daysLeft);
    res.json(alerts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
