import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import Return from '../models/Return.js';
import Transaction from '../models/Transaction.js';
import AuditLog from '../models/AuditLog.js';

// @desc    Get dashboard summary statistics
// @route   GET /api/reports/dashboard
// @access  Private
export const getDashboardSummary = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({});
    
    // Aggregation for stock details
    const stockStats = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalQty: { $sum: '$quantity' },
        },
      },
    ]);
    const totalQty = stockStats.length > 0 ? stockStats[0].totalQty : 0;

    // Aggregation for total stock valuation
    const inventoryValuationStats = await Inventory.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'prod',
        },
      },
      { $unwind: '$prod' },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$quantity', '$prod.price'] } },
        },
      },
    ]);
    const totalValue = inventoryValuationStats.length > 0 ? inventoryValuationStats[0].totalValue : 0;

    // Count low stock products
    const lowStockCount = await Inventory.countDocuments({
      status: { $in: ['Low Stock', 'Out of Stock'] },
    });

    // Delivered orders count and total revenue
    const ordersStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    const deliveredOrdersCount = ordersStats.find(o => o._id === 'Delivered')?.count || 0;
    const totalRevenue = ordersStats.reduce((sum, o) => o._id !== 'Cancelled' ? sum + o.revenue : sum, 0);

    // Total returns
    const totalReturnsCount = await Return.countDocuments({});
    const approvedReturnsCount = await Return.countDocuments({ status: 'Approved & Restocked' });

    // Recent activity log (latest 5 logs)
    const recentLogs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(6);

    // Category distribution
    const categoryDistribution = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);

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
    const total = await AuditLog.countDocuments({});
    const logs = await AuditLog.find({})
      .populate('user', 'name email role')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: logs,
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
