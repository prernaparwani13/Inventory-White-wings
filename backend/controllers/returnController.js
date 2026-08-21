import Return from '../models/Return.js';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import { logActivity } from '../utils/auditLogger.js';

// @desc    Initiate a product return
// @route   POST /api/returns
// @access  Private
export const createReturn = async (req, res) => {
  const { orderNumber, productId, quantity, reason } = req.body;

  if (!orderNumber || !productId || !quantity || !reason) {
    return res.status(400).json({ success: false, message: 'Order number, product, quantity, and reason are required' });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const randCode = Math.floor(10000 + Math.random() * 90000);
    const returnNumber = `RET-${randCode}`;

    const returnedItem = new Return({
      returnNumber,
      orderNumber,
      product: productId,
      quantity,
      reason,
      status: 'Pending Approval',
    });

    const savedReturn = await returnedItem.save();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      action: 'RETURN_INITIATE',
      details: `Initiated return ${returnNumber} for order ${orderNumber}. Product: ${product.name}, Qty: ${quantity}`,
      ip: req.ip,
    });

    res.status(201).json({ success: true, data: savedReturn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all returns
// @route   GET /api/returns
// @access  Private
export const getReturns = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, status } = req.query;
  let query = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { returnNumber: { $regex: search, $options: 'i' } },
      { orderNumber: { $regex: search, $options: 'i' } },
      { reason: { $regex: search, $options: 'i' } },
    ];
  }

  try {
    const total = await Return.countDocuments(query);
    const returnsList = await Return.find(query)
      .populate('product', 'name sku category price')
      .populate('processedBy', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: returnsList,
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

// @desc    Approve/Reject or scrap a return request
// @route   PUT /api/returns/:id/process
// @access  Private/Warehouse Manager & Admin
export const processReturn = async (req, res) => {
  const { status, actionTaken } = req.body;

  if (!status || !['Approved & Restocked', 'Rejected', 'Scrapped'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Valid processing status is required' });
  }

  try {
    const returnItem = await Return.findById(req.params.id);
    if (!returnItem) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    if (returnItem.status !== 'Pending Approval') {
      return res.status(400).json({ success: false, message: 'Return request is already processed' });
    }

    returnItem.status = status;
    returnItem.actionTaken = actionTaken || `Processed return as ${status}`;
    returnItem.processedBy = req.user._id;

    const savedReturn = await returnItem.save();

    // If approved and restocked, add quantities back to inventory
    if (status === 'Approved & Restocked') {
      const inventory = await Inventory.findOne({ product: returnItem.product });
      if (inventory) {
        const previousQty = inventory.quantity;
        inventory.quantity = previousQty + returnItem.quantity;
        await inventory.save();

        // Log stock transaction
        const transaction = new Transaction({
          product: returnItem.product,
          type: 'Return',
          quantity: returnItem.quantity,
          previousQty,
          newQty: previousQty + returnItem.quantity,
          reason: `Restocked returned items from return ${returnItem.returnNumber}`,
          referenceId: returnItem._id.toString(),
          performedBy: req.user._id,
        });
        await transaction.save();
      }
    }

    // Log system activity
    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      action: `RETURN_${status.toUpperCase().replace(/ & /g, '_').replace(/ /g, '_')}`,
      details: `Processed return ${returnItem.returnNumber} as ${status}. Product ID: ${returnItem.product}`,
      ip: req.ip,
    });

    res.json({ success: true, data: savedReturn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
