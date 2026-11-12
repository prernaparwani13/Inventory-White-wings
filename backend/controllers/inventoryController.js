import prisma from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';

// Helper to determine inventory status
const calculateStatus = (quantity, reorderPoint) => {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= reorderPoint) return 'Low Stock';
  return 'In Stock';
};

// @desc    Get all inventory records
// @route   GET /api/inventory
// @access  Private
export const getInventory = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, status } = req.query;

  try {
    const where = {};
    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { product: { name: { contains: search } } },
        { product: { sku: { contains: search } } },
        { location: { contains: search } },
      ];
    }

    const total = await prisma.inventory.count({ where });
    const inventoryRecords = await prisma.inventory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            price: true,
            supplier: true,
          },
        },
      },
    });

    const formattedRecords = inventoryRecords.map(rec => ({
      _id: rec.id,
      id: rec.id,
      quantity: rec.quantity,
      location: rec.location,
      reorderPoint: rec.reorderPoint,
      status: rec.status,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      product: rec.product ? {
        _id: rec.product.id,
        id: rec.product.id,
        name: rec.product.name,
        sku: rec.product.sku,
        category: rec.product.category,
        price: rec.product.price,
        supplier: rec.product.supplier,
      } : null,
    }));

    res.json({
      success: true,
      data: formattedRecords,
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

// @desc    Adjust inventory quantity manually (Stock In / Out)
// @route   POST /api/inventory/transaction
// @access  Private
export const adjustStock = async (req, res) => {
  const { productId, type, quantity, reason, location } = req.body;

  if (!productId || !type || !quantity || !reason) {
    return res.status(400).json({ success: false, message: 'ProductId, type (In/Out/Adjustment), quantity, and reason are required' });
  }

  if (Number(quantity) <= 0 && type !== 'Adjustment') {
    return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let inventory = await prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) {
      // Create if it doesn't exist yet
      inventory = await prisma.inventory.create({
        data: {
          productId,
          quantity: 0,
          location: location || 'Receiving Dock',
          reorderPoint: 10,
          status: 'Out of Stock',
        },
      });
    }

    const previousQty = inventory.quantity;
    let newQty = previousQty;

    if (type === 'In') {
      newQty = previousQty + Number(quantity);
    } else if (type === 'Out') {
      if (previousQty < Number(quantity)) {
        return res.status(400).json({ success: false, message: `Insufficient stock. Available: ${previousQty}` });
      }
      newQty = previousQty - Number(quantity);
    } else if (type === 'Adjustment') {
      newQty = Number(quantity);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }

    const newStatus = calculateStatus(newQty, inventory.reorderPoint);

    const updatedInventory = await prisma.inventory.update({
      where: { productId },
      data: {
        quantity: newQty,
        status: newStatus,
        location: location || inventory.location,
      },
    });

    const userId = req.user.id || req.user._id;

    // Log in Transactions table
    const transaction = await prisma.transaction.create({
      data: {
        productId,
        type,
        quantity: Math.abs(newQty - previousQty),
        previousQty,
        newQty,
        reason,
        performedBy: userId,
      },
    });

    // Log in AuditLog
    await logActivity({
      userId,
      userName: req.user.name,
      action: `STOCK_${type.toUpperCase()}`,
      details: `${type} transaction of ${quantity} units for ${product.name} (${product.sku}). Old qty: ${previousQty}, New qty: ${newQty}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        inventory: {
          ...updatedInventory,
          _id: updatedInventory.id,
        },
        transaction: {
          ...transaction,
          _id: transaction.id,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get low stock items
// @route   GET /api/inventory/low-stock
// @access  Private
export const getLowStockAlerts = async (req, res) => {
  try {
    const alerts = await prisma.inventory.findMany({
      where: {
        status: { in: ['Low Stock', 'Out of Stock'] },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            supplier: true,
          },
        },
      },
    });

    const formattedAlerts = alerts.map(alert => ({
      _id: alert.id,
      id: alert.id,
      quantity: alert.quantity,
      location: alert.location,
      reorderPoint: alert.reorderPoint,
      status: alert.status,
      product: alert.product ? {
        _id: alert.product.id,
        id: alert.product.id,
        name: alert.product.name,
        sku: alert.product.sku,
        category: alert.product.category,
        supplier: alert.product.supplier,
      } : null,
    }));

    res.json({ success: true, count: formattedAlerts.length, data: formattedAlerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get stock transaction logs (paginated)
// @route   GET /api/inventory/transactions
// @access  Private
export const getTransactionLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { type, search } = req.query;

  try {
    const where = {};

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { product: { name: { contains: search } } },
        { product: { sku: { contains: search } } },
      ];
    }

    const total = await prisma.transaction.count({ where });
    const logs = await prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, sku: true, category: true, price: true },
        },
        performedByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const formattedLogs = logs.map(log => ({
      _id: log.id,
      id: log.id,
      type: log.type,
      quantity: log.quantity,
      previousQty: log.previousQty,
      newQty: log.newQty,
      reason: log.reason,
      referenceId: log.referenceId,
      createdAt: log.createdAt,
      product: log.product ? {
        _id: log.product.id,
        id: log.product.id,
        name: log.product.name,
        sku: log.product.sku,
        category: log.product.category,
        price: log.product.price,
      } : null,
      performedBy: log.performedByUser ? {
        _id: log.performedByUser.id,
        id: log.performedByUser.id,
        name: log.performedByUser.name,
        email: log.performedByUser.email,
        role: log.performedByUser.role,
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
