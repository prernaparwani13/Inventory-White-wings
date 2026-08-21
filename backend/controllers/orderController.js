import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import { logActivity } from '../utils/auditLogger.js';

// @desc    Create a new order (Stock Out transaction)
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  const { customerName, shippingAddress, items } = req.body;

  if (!customerName || !shippingAddress || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Customer name, shipping address, and items are required' });
  }

  try {
    let totalAmount = 0;
    const itemsToSave = [];

    // Verify stock availability and calculate prices
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
      }

      const inventory = await Inventory.findOne({ product: item.product });
      if (!inventory || inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}. Available: ${inventory ? inventory.quantity : 0}, Requested: ${item.quantity}`,
        });
      }

      const itemCost = product.price * item.quantity;
      totalAmount += itemCost;

      itemsToSave.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Generate unique order number (e.g. ORD-63910)
    const randCode = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `ORD-${randCode}`;

    // Create the Order
    const order = new Order({
      orderNumber,
      customerName,
      shippingAddress,
      items: itemsToSave,
      totalAmount,
      createdBy: req.user._id,
    });

    const savedOrder = await order.save();

    // Deduct inventory and log transactions
    for (const item of itemsToSave) {
      const inventory = await Inventory.findOne({ product: item.product });
      const previousQty = inventory.quantity;
      const newQty = previousQty - item.quantity;

      inventory.quantity = newQty;
      await inventory.save();

      // Log transaction
      const transaction = new Transaction({
        product: item.product,
        type: 'Out',
        quantity: item.quantity,
        previousQty,
        newQty,
        reason: `Order deduction for ${orderNumber}`,
        referenceId: savedOrder._id.toString(),
        performedBy: req.user._id,
      });
      await transaction.save();
    }

    // Log in AuditLog
    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      action: 'ORDER_CREATE',
      details: `Created order ${orderNumber} for customer ${customerName}. Total: $${totalAmount}`,
      ip: req.ip,
    });

    res.status(201).json({ success: true, data: savedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req, res) => {
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
      { orderNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
    ];
  }

  try {
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('items.product', 'name sku price category')
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
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

// @desc    Get order details
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name sku price category dimensions weight')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update order tracking status (Pending -> Shipped -> Delivered)
// @route   PUT /api/orders/:id/status
// @access  Private
export const updateOrderStatus = async (req, res) => {
  const { status, trackingNumber } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const prevStatus = order.status;

    if (prevStatus === 'Delivered') {
      return res.status(400).json({ success: false, message: 'Delivered orders cannot be updated further' });
    }

    if (prevStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled orders cannot be updated' });
    }

    order.status = status;

    if (status === 'Shipped') {
      order.trackingNumber = trackingNumber || order.trackingNumber || `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
      order.shippedAt = new Date();
    } else if (status === 'Delivered') {
      order.deliveredAt = new Date();
    } else if (status === 'Cancelled') {
      // Revert the stock deduction
      for (const item of order.items) {
        const inventory = await Inventory.findOne({ product: item.product });
        if (inventory) {
          const previousQty = inventory.quantity;
          inventory.quantity = previousQty + item.quantity;
          await inventory.save();

          // Log transaction
          const transaction = new Transaction({
            product: item.product,
            type: 'In',
            quantity: item.quantity,
            previousQty,
            newQty: previousQty + item.quantity,
            reason: `Order ${order.orderNumber} Cancelled - Restocked`,
            referenceId: order._id.toString(),
            performedBy: req.user._id,
          });
          await transaction.save();
        }
      }
    }

    const updatedOrder = await order.save();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      action: 'ORDER_STATUS_UPDATE',
      details: `Updated order ${order.orderNumber} status from ${prevStatus} to ${status}`,
      ip: req.ip,
    });

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
