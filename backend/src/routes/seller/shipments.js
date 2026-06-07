const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { sellerAuth } = require('../../middleware/sellerAuth');
const prisma = new PrismaClient();

router.use(sellerAuth);

// GET /api/seller/shipments
router.get('/', async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  const where = { sellerId: req.seller.id };
  if (status) where.status = status;

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where, skip: parseInt(offset), take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { carrier: { select: { name: true } } },
    }),
    prisma.shipment.count({ where }),
  ]);

  res.json({ shipments, total });
});

// GET /api/seller/shipments/:id
router.get('/:id', async (req, res) => {
  const s = await prisma.shipment.findFirst({
    where: { id: parseInt(req.params.id), sellerId: req.seller.id },
    include: {
      events: { orderBy: { createdAt: 'asc' } },
      carrier: { select: { name: true } },
    },
  });
  if (!s) return res.status(404).json({ error: 'Expédition introuvable' });
  res.json(s);
});

// PATCH /api/seller/shipments/:id/ready — vendeur marque la commande prête à être enlevée
router.patch('/:id/ready', async (req, res) => {
  const s = await prisma.shipment.findFirst({
    where: { id: parseInt(req.params.id), sellerId: req.seller.id, status: 'DRAFT' },
  });
  if (!s) return res.status(404).json({ error: 'Expédition introuvable ou déjà traitée' });

  const updated = await prisma.shipment.update({
    where: { id: s.id },
    data: {
      status: 'READY',
      events: { create: { status: 'READY', note: 'Prêt à être enlevé — vendeur', createdBy: 'SELLER', actorId: req.seller.id } },
    },
  });

  if (s.fulfillmentId) {
    await prisma.orderFulfillment.update({
      where: { id: s.fulfillmentId },
      data: { status: 'PRET_A_EXPEDIER' },
    }).catch(() => {});
  }

  res.json(updated);
});

module.exports = router;
