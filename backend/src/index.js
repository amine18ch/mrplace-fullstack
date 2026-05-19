require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
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

app.listen(PORT, () => {
  console.log(`🚀 MrPlace API running on port ${PORT}`);
});
