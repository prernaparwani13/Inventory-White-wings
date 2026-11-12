import prisma from '../config/db.js';

// @desc    Get dashboard summary statistics
// @route   GET /api/reports/dashboard
// @access  Private
export const getDashboardSummary = async (req, res) => {
  try {
    const totalProducts = await prisma.product.count();

    // Sum of all stock items quantity
    const stockStats = await prisma.inventory.aggregate({
      _sum: { quantity: true },
    });
    const totalQty = stockStats._sum.quantity || 0;

    // Total stock valuation calculation
    const allInventory = await prisma.inventory.findMany({
      include: {
        product: {
          select: { price: true },
        },
      },
    });

    const totalValue = allInventory.reduce((acc, inv) => {
      const price = inv.product ? inv.product.price : 0;
      return acc + inv.quantity * price;
    }, 0);

    // Count low stock products
    const lowStockCount = await prisma.inventory.count({
      where: {
        status: { in: ['Low Stock', 'Out of Stock'] },
      },
    });

    // Delivered orders count and total revenue
    const deliveredOrdersCount = await prisma.order.count({
      where: { status: 'Delivered' },
    });

    const revenueStats = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: { not: 'Cancelled' },
      },
    });
    const totalRevenue = revenueStats._sum.totalAmount || 0;

    // Total returns
    const totalReturnsCount = await prisma.return.count();
    const approvedReturnsCount = await prisma.return.count({
      where: { status: 'Approved & Restocked' },
    });

    // Recent activity log (latest 6 logs)
    const recentLogsRaw = await prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const recentLogs = recentLogsRaw.map(log => ({
      _id: log.id,
      id: log.id,
      userName: log.userName,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
      user: log.user ? {
        _id: log.user.id,
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
        role: log.user.role,
      } : null,
    }));

    // Category distribution
    const categoryGroup = await prisma.product.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    });

    const categoryDistribution = categoryGroup.map(c => ({
      category: c.category,
      count: c._count.id,
    }));

    res.json({
      success: true,
      data: {
        totalProducts,
        totalQty,
        totalValue,
        lowStockCount,
        deliveredOrdersCount,
        totalRevenue,
        totalReturnsCount,
        approvedReturnsCount,
        recentLogs,
        categoryDistribution,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed audit logs (Admin only)
// @route   GET /api/reports/audit-logs
// @access  Private/Admin
export const getSystemAuditLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const skip = (page - 1) * limit;

  try {
    const total = await prisma.auditLog.count();
    const logs = await prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const formattedLogs = logs.map(log => ({
      _id: log.id,
      id: log.id,
      userName: log.userName,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
      user: log.user ? {
        _id: log.user.id,
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
        role: log.user.role,
      } : null,
    }));

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
