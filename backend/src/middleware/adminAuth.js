const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const adminAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.isAdmin) return res.status(403).json({ error: 'Accès admin requis' });
    const admin = await prisma.adminUser.findUnique({ where: { id: payload.id, isActive: true } });
    if (!admin) return res.status(401).json({ error: 'Admin introuvable' });
    req.admin = admin;
    next();
  } catch { res.status(401).json({ error: 'Token invalide' }); }
};

const superAdminAuth = (req, res, next) => {
  adminAuth(req, res, () => {
    if (req.admin.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Super admin requis' });
    next();
  });
};

const logAction = async (adminId, action, module, targetId, details, ip) => {
  try {
    await prisma.adminLog.create({
      data: {
        adminId,
        action,
        module,
        targetId: String(targetId || ''),
        details: JSON.stringify(details || {}),
        ip: ip || ''
      }
    });
  } catch {}
};

module.exports = { adminAuth, superAdminAuth, logAction };
