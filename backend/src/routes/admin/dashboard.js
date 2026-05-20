const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/admin/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);

    // Revenue
    const [allOrders, todayOrders, weekOrders, monthOrders] = await Promise.all([
      prisma.order.findMany({ select: { total: true, status: true, createdAt: true } }),
      prisma.order.findMany({ where: { createdAt: { gte: todayStart } }, select: { total: true } }),
      prisma.order.findMany({ where: { createdAt: { gte: weekStart } }, select: { total: true } }),
      prisma.order.findMany({ where: { createdAt: { gte: monthStart } }, select: { total: true } }),
    ]);

    const sumTotal = (arr) => arr.reduce((s, o) => s + o.total, 0);
    const revenue = {
      total: sumTotal(allOrders),
      today: sumTotal(todayOrders),
      week: sumTotal(weekOrders),
      month: sumTotal(monthOrders),
    };

    // Orders by status
    const byStatus = {};
    allOrders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
    const orders = {
      total: allOrders.length,
      today: todayOrders.length,
      pending: byStatus['EN_ATTENTE'] || 0,
      byStatus,
    };

    // Vendors
    const [totalSellers, vendorApplications] = await Promise.all([
      prisma.seller.count(),
      prisma.vendorApplication.findMany({ select: { status: true } }),
    ]);
    const pendingVendors = vendorApplications.filter(a => a.status === 'PENDING').length;
    const vendors = { total: totalSellers, active: totalSellers - pendingVendors, pending: pendingVendors };

    // Customers
    const [totalUsers, newUsers] = await Promise.all([
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.count({ where: { role: 'CLIENT', createdAt: { gte: monthStart } } }),
    ]);
    const customers = { total: totalUsers, new: newUsers };

    // Commissions
    const globalCommission = await prisma.commission.findFirst({ where: { type: 'GLOBAL', isActive: true } });
    const commissionRate = globalCommission ? globalCommission.rate : 0.10;
    const commissions = revenue.total * commissionRate;

    // Top vendors
    const orderItems = await prisma.orderItem.findMany({
      include: { product: { include: { seller: true } }, order: true }
    });
    const vendorMap = {};
    orderItems.forEach(item => {
      const sid = item.product.sellerId;
      if (!vendorMap[sid]) vendorMap[sid] = { seller: item.product.seller, revenue: 0, orders: new Set() };
      vendorMap[sid].revenue += item.price * item.qty;
      vendorMap[sid].orders.add(item.orderId);
    });
    const topVendors = Object.values(vendorMap)
      .map(v => ({ id: v.seller.id, name: v.seller.name, logo: v.seller.logo, revenue: v.revenue, orders: v.orders.size, rating: v.seller.rating }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top products
    const productSales = {};
    orderItems.forEach(item => {
      if (!productSales[item.productId]) productSales[item.productId] = { product: item.product, qty: 0, revenue: 0 };
      productSales[item.productId].qty += item.qty;
      productSales[item.productId].revenue += item.price * item.qty;
    });
    const topProducts = Object.values(productSales)
      .map(p => ({ id: p.product.id, title: p.product.title, qty: p.qty, revenue: p.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top categories
    const categories = await prisma.category.findMany({ include: { products: { include: { orderItems: true } } } });
    const topCategories = categories.map(cat => {
      const rev = cat.products.reduce((s, p) => s + p.orderItems.reduce((ss, i) => ss + i.price * i.qty, 0), 0);
      return { id: cat.id, name: cat.name, icon: cat.icon, revenue: rev, productCount: cat.products.length };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

    // Sales by day (last 30 days)
    const recentOrders = await prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    const dayMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = { date: key, amount: 0, count: 0 };
    }
    recentOrders.forEach(o => {
      const key = o.createdAt.toISOString().split('T')[0];
      if (dayMap[key]) { dayMap[key].amount += o.total; dayMap[key].count++; }
    });
    const salesByDay = Object.values(dayMap);

    // Recent orders
    const recentOrdersFull = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, items: { include: { product: { select: { title: true } } } } }
    });

    res.json({ revenue, orders, vendors, customers, commissions, topVendors, topProducts, topCategories, salesByDay, recentOrders: recentOrdersFull });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
