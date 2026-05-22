const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sellerAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.isSeller) return res.status(403).json({ error: 'Accès vendeur requis' });
    const seller = await prisma.seller.findUnique({ where: { id: payload.id, isActive: true } });
    if (!seller) return res.status(401).json({ error: 'Vendeur introuvable ou inactif' });
    req.seller = seller;
    next();
  } catch { res.status(401).json({ error: 'Token invalide ou expiré' }); }
};

module.exports = { sellerAuth };
