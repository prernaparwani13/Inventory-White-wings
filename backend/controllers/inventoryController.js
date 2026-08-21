import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import { logActivity } from '../utils/auditLogger.js';

// @desc    Get all inventory records
// @route   GET /api/inventory
// @access  Private
export const getInventory = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, status } = req.query;

  try {
    let matchQuery = {};
    if (status) {
      matchQuery.status = status;
    }

    // Build the query pipeline
    const pipeline = [
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      { $unwind: '$productDetails' },
    ];

    // Search filter (on product name or SKU)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'productDetails.name': { $regex: search, $options: 'i' } },
            { 'productDetails.sku': { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Status filter
    if (status) {
      pipeline.push({
        $match: { status: status },
      });
    }

    // Clone pipeline for count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Inventory.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Add pagination and sort
    pipeline.push(
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    const inventoryRecords = await Inventory.aggregate(pipeline);

    // Mongoose aggregate output doesn't match standard .populate(), we'll reshape it to match format
    const formattedRecords = inventoryRecords.map(rec => ({
      _id: rec._id,
      quantity: rec.quantity,
      location: rec.location,
      reorderPoint: rec.reorderPoint,
      status: rec.status,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      product: {
        _id: rec.productDetails._id,
        name: rec.productDetails.name,
        sku: rec.productDetails.sku,
        category: rec.productDetails.category,
        price: rec.productDetails.price,
        supplier: rec.productDetails.supplier,
      },
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

  if (quantity <= 0) {
    return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      // Create if it somehow doesn't exist
      inventory = new Inventory({
        product: productId,
        quantity: 0,
        location: location || 'Receiving Dock',
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
      newQty = Number(quantity); // For setting direct counts
    } else {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }

    inventory.quantity = newQty;
    if (location) {
      inventory.location = location;
    }
    await inventory.save();

    // Log in Transactions table
    const transaction = new Transaction({
      product: productId,
      type,
      quantity: Math.abs(newQty - previousQty),
      previousQty,
      newQty,
      reason,
      performedBy: req.user._id,
    });
    await transaction.save();

    // Log in AuditLog
    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      action: `STOCK_${type.toUpperCase()}`,
      details: `${type} transaction of ${quantity} units for ${product.name} (${product.sku}). Old qty: ${previousQty}, New qty: ${newQty}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        inventory,
        transaction,
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
    const alerts = await Inventory.find({
      status: { $in: ['Low Stock', 'Out of Stock'] },
    }).populate('product', 'name sku category supplier');

    res.json({ success: true, count: alerts.length, data: alerts });
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
  let query = {};

  if (type) {
    query.type = type;
  }

  try {
    if (search) {
      const products = await Product.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      const productIds = products.map(p => p._id);
      query.product = { $in: productIds };
    }

    const total = await Transaction.countDocuments(query);
    const logs = await Transaction.find(query)
      .populate('product', 'name sku category price')
      .populate('performedBy', 'name email role')
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
