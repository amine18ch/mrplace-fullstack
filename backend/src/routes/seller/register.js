const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Public: vendor self-registration (creates pending application)
router.post('/', async (req, res) => {
  try {
    const { name, email, password, phone, companyName, taxId, bankAccount, location, description } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Champs obligatoires manquants' });

    const existing = await prisma.seller.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
    const hashed = await bcrypt.hash(password, 10);

    const seller = await prisma.seller.create({
      data: {
        name, slug, email, password: hashed, phone: phone || null,
        description: description || '', location: location || 'Tunisie',
        logo: '🏪', color: '#2563EB', joinedYear: new Date().getFullYear(),
        isActive: false,
        application: {
          create: {
            status: 'PENDING',
            companyName: companyName || name,
            taxId: taxId || '',
            bankAccount: bankAccount || '',
          },
        },
      },
      include: { application: true },
    });

    // Notify admins
    await prisma.notification.create({
      data: { type: 'VENDOR_APPLICATION', title: 'Nouvelle candidature vendeur', message: `${name} a soumis une candidature vendeur`, link: '/admin/vendors' },
    });

    res.json({ message: 'Candidature soumise. Vous recevrez une réponse sous 48h.', sellerId: seller.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
