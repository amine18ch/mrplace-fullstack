/**
 * Auth chauffeur — PWA Driver
 * Login avec CIN + mot de passe, JWT dédié avec isDriver:true
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

// POST /api/driver/auth/login
router.post('/login', async (req, res) => {
  try {
    const { cin, password } = req.body;
    if (!cin || !password) return res.status(400).json({ error: 'CIN et mot de passe requis' });
    const driver = await prisma.driver.findUnique({ where: { cin } });
    if (!driver || !driver.password) return res.status(401).json({ error: 'Identifiants incorrects' });
    if (driver.status === 'SUSPENDED') return res.status(403).json({ error: 'Compte suspendu' });
    const valid = await bcrypt.compare(password, driver.password);
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' });
    const token = jwt.sign({ id: driver.id, isDriver: true, name: driver.name }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, driver: { id: driver.id, name: driver.name, phone: driver.phone, cin: driver.cin, status: driver.status, codBalance: driver.codBalance } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/driver/auth/me
const { driverAuth } = require('../../middleware/driverAuth');
router.get('/me', driverAuth, async (req, res) => {
  res.json({ id: req.driver.id, name: req.driver.name, phone: req.driver.phone, cin: req.driver.cin, status: req.driver.status, codBalance: req.driver.codBalance });
});

module.exports = router;
