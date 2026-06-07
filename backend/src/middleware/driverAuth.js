const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const driverAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.isDriver) return res.status(403).json({ error: 'Accès chauffeur requis' });
    const driver = await prisma.driver.findUnique({ where: { id: payload.id } });
    if (!driver || driver.status === 'SUSPENDED') return res.status(401).json({ error: 'Chauffeur introuvable ou suspendu' });
    req.driver = driver;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = { driverAuth };
