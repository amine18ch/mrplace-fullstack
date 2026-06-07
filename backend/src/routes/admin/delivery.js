/**
 * Admin — Gestion des expéditions (Shipments)
 * CRUD + routing override + documents
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { computeRouting, generateTrackingRef } = require('../../services/routingEngine');
const { lettreDeVoiture, bonDeLivraison } = require('../../lib/deliveryDocs');
const { logAction } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

const getPlatform = async () => {
  const s = await prisma.platformSetting.findMany();
  const m = Object.fromEntries(s.map(x => [x.key, x.value]));
  return { name: m['marketplace_name']||'MARKET', nif: m['marketplace_nif']||'', rne: m['marketplace_rne']||'', address: m['marketplace_address']||'Tunis, Tunisie', email: m['marketplace_email']||'' };
};

// GET /api/admin/delivery/shipments
router.get('/shipments', async (req, res) => {
  try {
    const { page=1, limit=20, status, mode, sellerId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (mode) where.mode = mode;
    if (sellerId) where.sellerId = parseInt(sellerId);
    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where, skip: (parseInt(page)-1)*parseInt(limit), take: parseInt(limit),
        include: {
          fulfillment: { select: { status: true, orderId: true } },
          driver: { select: { id: true, name: true, phone: true } },
          vehicle: { select: { id: true, plate: true, brand: true } },
          carrier: { select: { id: true, name: true } },
          tour: { select: { id: true, date: true, status: true } },
          events: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shipment.count({ where }),
    ]);
    res.json({ shipments, total, page: parseInt(page), pages: Math.ceil(total/parseInt(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/delivery/shipments/:id
router.get('/shipments/:id', async (req, res) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        events: { orderBy: { createdAt: 'desc' } },
        driver: true, vehicle: true, carrier: true, tour: true,
        fulfillment: true,
        codCollection: { include: { settlement: true } },
      },
    });
    if (!shipment) return res.status(404).json({ error: 'Expédition introuvable' });
    res.json(shipment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/delivery/shipments — Créer une expédition manuellement
router.post('/shipments', async (req, res) => {
  try {
    const { fulfillmentId, orderId, sellerId, weightKg=0, isFragile=false, declaredValue=0, isCod=false, codAmount=0, isExpress=false } = req.body;

    // Récupérer l'adresse de livraison depuis l'ordre
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { items: { include: { product: { select: { sellerId: true } } } } },
    });
    if (!order) return res.status(400).json({ error: 'Commande introuvable' });

    const deliveryAddress = order.shippingAddress;
    const addrObj = (() => { try { return JSON.parse(deliveryAddress); } catch { return {}; } })();

    // Récupérer adresse d'enlèvement (vendeur)
    const seller = await prisma.seller.findUnique({ where: { id: parseInt(sellerId) }, select: { adresseComplete: true, location: true, name: true } });
    const pickupAddress = JSON.stringify({ name: seller?.name, street: seller?.adresseComplete || seller?.location || '' });

    // Calculer le routage
    const routing = await computeRouting({
      deliveryGovernorate: addrObj.governorate || '',
      weightKg: parseFloat(weightKg),
      isFragile, isCod, isExpress, declaredValue: parseFloat(declaredValue),
    });

    const trackingRef = generateTrackingRef();
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + (routing.estimatedDeliveryDays || 3));

    const shipment = await prisma.shipment.create({
      data: {
        fulfillmentId: fulfillmentId ? parseInt(fulfillmentId) : null,
        orderId: parseInt(orderId), sellerId: parseInt(sellerId),
        mode: routing.mode, status: 'DRAFT',
        weightKg: parseFloat(weightKg), isFragile, declaredValue: parseFloat(declaredValue),
        isCod, codAmount: parseFloat(codAmount),
        isExpress, estimatedDelivery,
        pickupAddress, deliveryAddress,
        routingRationale: routing.rationale,
        trackingRef,
        vehicleId: routing.vehicleId || null,
        carrierId: routing.carrierId || null,
      },
    });

    // Créer l'événement initial
    await prisma.shipmentEvent.create({
      data: { shipmentId: shipment.id, status: 'DRAFT', note: 'Expédition créée — ' + routing.rationale, createdBy: 'ADMIN', actorId: req.admin.id },
    });

    logAction(req.admin.id, 'CREATE_SHIPMENT', 'delivery', shipment.id, { orderId, mode: routing.mode }, req.ip);
    res.status(201).json(shipment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/delivery/shipments/:id/status — Changer statut
router.patch('/shipments/:id/status', async (req, res) => {
  try {
    const { status, note, driverId, vehicleId, carrierId } = req.body;
    const id = parseInt(req.params.id);
    const data = { status };
    if (driverId) data.driverId = parseInt(driverId);
    if (vehicleId) data.vehicleId = parseInt(vehicleId);
    if (carrierId) data.carrierId = parseInt(carrierId);

    const shipment = await prisma.shipment.update({ where: { id }, data });

    await prisma.shipmentEvent.create({
      data: { shipmentId: id, status, note: note || '', createdBy: 'ADMIN', actorId: req.admin.id },
    });

    // Synchroniser OrderFulfillment si lié
    if (shipment.fulfillmentId) {
      const fulfillmentStatus = {
        DRAFT: 'EN_PREPARATION', READY: 'PRET_A_EXPEDIER',
        ASSIGNED: 'PRET_A_EXPEDIER', PICKED_UP: 'ENLEVE',
        IN_TRANSIT: 'EN_TRANSIT', OUT_FOR_DELIVERY: 'EN_COURS_LIVRAISON',
        DELIVERED: 'LIVREE', FAILED: 'ECHEC_LIVRAISON',
        RETURNED: 'RETOUR_VENDEUR', CANCELLED: 'ANNULEE',
      }[status];
      if (fulfillmentStatus) {
        await prisma.orderFulfillment.update({
          where: { id: shipment.fulfillmentId },
          data: { status: fulfillmentStatus },
        });
      }
    }

    logAction(req.admin.id, 'UPDATE_SHIPMENT_STATUS', 'delivery', id, { status }, req.ip);
    res.json(shipment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/delivery/shipments/:id/reroute — Override routing
router.post('/shipments/:id/reroute', async (req, res) => {
  try {
    const { mode, driverId, vehicleId, carrierId, reason } = req.body;
    const id = parseInt(req.params.id);
    const shipment = await prisma.shipment.update({
      where: { id },
      data: { mode, driverId: driverId||null, vehicleId: vehicleId||null, carrierId: carrierId||null, routingRationale: `[OVERRIDE ADMIN] ${reason || ''}` },
    });
    await prisma.shipmentEvent.create({
      data: { shipmentId: id, status: shipment.status, note: `Routage modifié manuellement : ${mode} — ${reason||''}`, createdBy: 'ADMIN', actorId: req.admin.id },
    });
    logAction(req.admin.id, 'OVERRIDE_ROUTING', 'delivery', id, { mode, reason }, req.ip);
    res.json(shipment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/delivery/route-quote — Simuler le routage sans créer
router.post('/route-quote', async (req, res) => {
  try {
    const { governorate, weightKg=0, isFragile=false, isCod=false, isExpress=false } = req.body;
    const result = await computeRouting({ deliveryGovernorate: governorate, weightKg: parseFloat(weightKg), isFragile, isCod, isExpress });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/delivery/stats
router.get('/stats', async (req, res) => {
  try {
    const [total, byStatus, byMode, pendingCod] = await Promise.all([
      prisma.shipment.count(),
      prisma.shipment.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.shipment.groupBy({ by: ['mode'], _count: { id: true } }),
      prisma.shipment.count({ where: { isCod: true, status: { not: 'DELIVERED' } } }),
    ]);
    res.json({ total, byStatus, byMode, pendingCod });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Documents ────────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const docAuth = (req, res, next) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send('<h1>Non authentifié</h1>');
  try { req.admin = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).send('<h1>Session expirée</h1>'); }
};

router.get('/shipments/:id/lettre-voiture', docAuth, async (req, res) => {
  try {
    const shipment = await prisma.shipment.findUnique({ where: { id: parseInt(req.params.id) }, include: { events: false } });
    if (!shipment) return res.status(404).send('<h1>Introuvable</h1>');
    const [platform, seller, order] = await Promise.all([
      getPlatform(),
      prisma.seller.findUnique({ where: { id: shipment.sellerId } }),
      prisma.order.findUnique({ where: { id: shipment.orderId }, include: { items: { include: { product: { select: { title: true } } } }, user: { select: { name: true, phone: true } } } }),
    ]);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(lettreDeVoiture(shipment, platform, seller, order));
  } catch (e) { res.status(500).send(e.message); }
});

router.get('/shipments/:id/bon-livraison', docAuth, async (req, res) => {
  try {
    const shipment = await prisma.shipment.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!shipment) return res.status(404).send('<h1>Introuvable</h1>');
    const [platform, order] = await Promise.all([
      getPlatform(),
      prisma.order.findUnique({ where: { id: shipment.orderId }, include: { user: { select: { name: true, phone: true } } } }),
    ]);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(bonDeLivraison(shipment, platform, order));
  } catch (e) { res.status(500).send(e.message); }
});

module.exports = router;
