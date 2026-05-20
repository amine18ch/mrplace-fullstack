require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/cart',       require('./routes/cart'));
app.use('/api/wishlist',   require('./routes/wishlist'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/sellers',    require('./routes/sellers'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/promo',      require('./routes/promo'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MrPlace API', time: new Date() });
});

// Admin routes
const { adminAuth } = require('./middleware/adminAuth');
app.use('/api/admin/auth',      require('./routes/admin/auth'));
app.use('/api/admin/dashboard', adminAuth, require('./routes/admin/dashboard'));
app.use('/api/admin/vendors',   adminAuth, require('./routes/admin/vendors'));
app.use('/api/admin/products',  adminAuth, require('./routes/admin/products'));
app.use('/api/admin/orders',    adminAuth, require('./routes/admin/orders'));
app.use('/api/admin/customers', adminAuth, require('./routes/admin/customers'));
app.use('/api/admin/finance',   adminAuth, require('./routes/admin/finance'));
app.use('/api/admin/marketing', adminAuth, require('./routes/admin/marketing'));
app.use('/api/admin/settings',  adminAuth, require('./routes/admin/settings'));

// Serve frontend static files if dist exists
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // Admin SPA fallback
  app.get('/admin', (req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
  app.get('/admin/*', (req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
  console.log(`📦 Serving frontend from ${FRONTEND_DIST}`);
}

app.listen(PORT, () => {
  console.log(`🚀 MrPlace running on port ${PORT}`);
});
