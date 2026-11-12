import prisma from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';

const calculateStatus = (quantity, reorderPoint) => {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= reorderPoint) return 'Low Stock';
  return 'In Stock';
};

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
      const product = await prisma.product.findUnique({ where: { id: item.product } });
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
      }

      const inventory = await prisma.inventory.findUnique({ where: { productId: item.product } });
      if (!inventory || inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}. Available: ${inventory ? inventory.quantity : 0}, Requested: ${item.quantity}`,
        });
      }

      const itemCost = product.price * item.quantity;
      totalAmount += itemCost;

      itemsToSave.push({
        product: product.id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const randCode = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `ORD-${randCode}`;

    const userId = req.user.id || req.user._id;

    // Create the Order
    const savedOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        shippingAddress,
        totalAmount,
        createdBy: userId,
        items: {
          create: itemsToSave.map(item => ({
            productId: item.product,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true, category: true },
            },
          },
        },
      },
    });

    // Deduct inventory and log transactions
    for (const item of itemsToSave) {
      const inventory = await prisma.inventory.findUnique({ where: { productId: item.product } });
      const previousQty = inventory.quantity;
      const newQty = previousQty - item.quantity;
      const newStatus = calculateStatus(newQty, inventory.reorderPoint);

      await prisma.inventory.update({
        where: { productId: item.product },
        data: {
          quantity: newQty,
          status: newStatus,
        },
      });

      await prisma.transaction.create({
        data: {
          productId: item.product,
          type: 'Out',
          quantity: item.quantity,
          previousQty,
          newQty,
          reason: `Order deduction for ${orderNumber}`,
          referenceId: savedOrder.id,
          performedBy: userId,
        },
      });
    }

    await logActivity({
      userId,
      userName: req.user.name,
      action: 'ORDER_CREATE',
      details: `Created order ${orderNumber} for customer ${customerName}. Total: $${totalAmount}`,
      ip: req.ip,
    });

    const formattedOrder = {
      _id: savedOrder.id,
      id: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      customerName: savedOrder.customerName,
      shippingAddress: savedOrder.shippingAddress,
      totalAmount: savedOrder.totalAmount,
      status: savedOrder.status,
      trackingNumber: savedOrder.trackingNumber,
      shippedAt: savedOrder.shippedAt,
      deliveredAt: savedOrder.deliveredAt,
      createdAt: savedOrder.createdAt,
      items: savedOrder.items.map(i => ({
        _id: i.id,
        id: i.id,
        quantity: i.quantity,
        price: i.price,
        product: i.product ? {
          _id: i.product.id,
          id: i.product.id,
          name: i.product.name,
          sku: i.product.sku,
          price: i.product.price,
          category: i.product.category,
        } : i.productId,
      })),
    };

    res.status(201).json({ success: true, data: formattedOrder });
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

  try {
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
      ];
    }

    const total = await prisma.order.count({ where });
    const orders = await prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true, category: true },
            },
          },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const formattedOrders = orders.map(o => ({
      _id: o.id,
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      shippingAddress: o.shippingAddress,
      totalAmount: o.totalAmount,
      status: o.status,
      trackingNumber: o.trackingNumber,
      shippedAt: o.shippedAt,
      deliveredAt: o.deliveredAt,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      createdBy: o.createdByUser ? {
        _id: o.createdByUser.id,
        id: o.createdByUser.id,
        name: o.createdByUser.name,
        email: o.createdByUser.email,
      } : null,
      items: o.items.map(i => ({
        _id: i.id,
        id: i.id,
        quantity: i.quantity,
        price: i.price,
        product: i.product ? {
          _id: i.product.id,
          id: i.product.id,
          name: i.product.name,
          sku: i.product.sku,
          price: i.product.price,
          category: i.product.category,
        } : null,
      })),
    }));

    res.json({
      success: true,
      data: formattedOrders,
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
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true, category: true, dimensions: true, weight: true },
            },
          },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const formattedOrder = {
      _id: order.id,
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      shippingAddress: order.shippingAddress,
      totalAmount: order.totalAmount,
      status: order.status,
      trackingNumber: order.trackingNumber,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      createdBy: order.createdByUser ? {
        _id: order.createdByUser.id,
        id: order.createdByUser.id,
        name: order.createdByUser.name,
        email: order.createdByUser.email,
      } : null,
      items: order.items.map(i => ({
        _id: i.id,
        id: i.id,
        quantity: i.quantity,
        price: i.price,
        product: i.product ? {
          _id: i.product.id,
          id: i.product.id,
          name: i.product.name,
          sku: i.product.sku,
          price: i.product.price,
          category: i.product.category,
          dimensions: i.product.dimensions,
          weight: i.product.weight,
        } : null,
      })),
    };

    res.json({ success: true, data: formattedOrder });
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
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

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

    const updateData = { status };

    if (status === 'Shipped') {
      updateData.trackingNumber = trackingNumber || order.trackingNumber || `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
      updateData.shippedAt = new Date();
    } else if (status === 'Delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'Cancelled') {
      const userId = req.user.id || req.user._id;

      // Revert the stock deduction
      for (const item of order.items) {
        const inventory = await prisma.inventory.findUnique({ where: { productId: item.productId } });
        if (inventory) {
          const previousQty = inventory.quantity;
          const newQty = previousQty + item.quantity;
          const newStatus = calculateStatus(newQty, inventory.reorderPoint);

          await prisma.inventory.update({
            where: { productId: item.productId },
            data: { quantity: newQty, status: newStatus },
          });

          await prisma.transaction.create({
            data: {
              productId: item.productId,
              type: 'In',
              quantity: item.quantity,
              previousQty,
              newQty,
              reason: `Order ${order.orderNumber} Cancelled - Restocked`,
              referenceId: order.id,
              performedBy: userId,
            },
          });
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
    });

    const userId = req.user.id || req.user._id;

    await logActivity({
      userId,
      userName: req.user.name,
      action: 'ORDER_STATUS_UPDATE',
      details: `Updated order ${order.orderNumber} status from ${prevStatus} to ${status}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        ...updatedOrder,
        _id: updatedOrder.id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
