/**
 * Tracking public — accessible sans auth
 * GET /api/tracking/:ref → état de l'expédition
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/:ref', async (req, res) => {
  try {
    const { ref } = req.params;

    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          { trackingRef: ref },
          // Aussi chercher par numéro de commande préfixé (ex: "123")
          ...(isNaN(parseInt(ref)) ? [] : [{ orderId: parseInt(ref) }]),
        ],
      },
      include: {
        events: { orderBy: { createdAt: 'desc' }, take: 10 },
        carrier: { select: { name: true } },
      },
    });

    if (!shipment) return res.status(404).json({ error: 'Expédition introuvable' });

    // Ne pas exposer les infos internes
    const addr = (() => { try { return JSON.parse(shipment.deliveryAddress||'{}'); } catch { return {}; } })();

    res.json({
      trackingRef: shipment.trackingRef,
      status: shipment.status,
      mode: shipment.mode,
      isExpress: shipment.isExpress,
      estimatedDelivery: shipment.estimatedDelivery,
      carrier: shipment.carrier?.name || null,
      destinataire: addr.name ? addr.name.split(' ')[0] + '***' : '—',
      governorate: addr.governorate || '—',
      events: shipment.events.map(e => ({
        status: e.status,
        note: e.note,
        createdAt: e.createdAt,
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
