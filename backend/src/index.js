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

// Serve frontend static files if dist exists
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
  console.log(`📦 Serving frontend from ${FRONTEND_DIST}`);
}

app.listen(PORT, () => {
  console.log(`🚀 MrPlace running on port ${PORT}`);
});
