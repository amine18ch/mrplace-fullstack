const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { sellerAuth } = require('../../middleware/sellerAuth');
const prisma = new PrismaClient();

router.use(sellerAuth);

// GET /api/seller/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const sid = req.seller.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalProducts, activeProducts,
      orderItems, monthItems, lastMonthItems,
      reviews, pendingOrders
    ] = await Promise.all([
      prisma.product.count({ where: { sellerId: sid } }),
      prisma.product.count({ where: { sellerId: sid, isActive: true } }),
      prisma.orderItem.findMany({ where: { product: { sellerId: sid } }, include: { order: { select: { status: true, createdAt: true } } } }),
      prisma.orderItem.findMany({ where: { product: { sellerId: sid }, order: { createdAt: { gte: monthStart } } }, include: { order: true } }),
      prisma.orderItem.findMany({ where: { product: { sellerId: sid }, order: { createdAt: { gte: lastMonthStart, lt: monthStart } } }, include: { order: true } }),
      prisma.review.findMany({ where: { product: { sellerId: sid } }, select: { rating: true, createdAt: true } }),
      prisma.orderItem.count({ where: { product: { sellerId: sid }, order: { status: 'EN_ATTENTE' } } }),
    ]);

    const totalRevenue = orderItems.filter(i => i.order.status === 'LIVREE').reduce((s, i) => s + i.price * i.qty, 0);
    const monthRevenue = monthItems.filter(i => i.order.status !== 'ANNULEE').reduce((s, i) => s + i.price * i.qty, 0);
    const lastMonthRevenue = lastMonthItems.filter(i => i.order.status !== 'ANNULEE').reduce((s, i) => s + i.price * i.qty, 0);
    const totalOrders = [...new Set(orderItems.map(i => i.orderId))].length;
    const monthOrders = [...new Set(monthItems.map(i => i.orderId))].length;
    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;
    const commission = totalRevenue * 0.10;

    // Ventes par jour (30 derniers jours)
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
    const recentItems = orderItems.filter(i => new Date(i.order.createdAt) >= thirtyDaysAgo && i.order.status !== 'ANNULEE');
    const salesByDay = {};
    recentItems.forEach(i => {
      const d = new Date(i.order.createdAt).toISOString().split('T')[0];
      if (!salesByDay[d]) salesByDay[d] = { date: d, amount: 0, count: 0 };
      salesByDay[d].amount += i.price * i.qty;
      salesByDay[d].count += 1;
    });
    const salesByDayArr = Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date));

    // Top produits
    const productSales = {};
    orderItems.forEach(i => {
      if (!productSales[i.productId]) productSales[i.productId] = { productId: i.productId, revenue: 0, qty: 0 };
      productSales[i.productId].revenue += i.price * i.qty;
      productSales[i.productId].qty += i.qty;
    });
    const topProductIds = Object.values(productSales).sort((a,b) => b.revenue - a.revenue).slice(0,5).map(p => p.productId);
    const topProducts = await prisma.product.findMany({ where: { id: { in: topProductIds } }, select: { id: true, title: true, price: true, images: true, soldCount: true } });

    res.json({
      products: { total: totalProducts, active: activeProducts, inactive: totalProducts - activeProducts },
      revenue: { total: totalRevenue, month: monthRevenue, lastMonth: lastMonthRevenue, commission, net: totalRevenue - commission },
      orders: { total: totalOrders, month: monthOrders, pending: pendingOrders },
      reviews: { count: reviews.length, avg: parseFloat(avgRating) },
      salesByDay: salesByDayArr,
      topProducts,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
