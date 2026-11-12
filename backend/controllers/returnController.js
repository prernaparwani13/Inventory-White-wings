import prisma from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';

const calculateStatus = (quantity, reorderPoint) => {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= reorderPoint) return 'Low Stock';
  return 'In Stock';
};

// @desc    Initiate a product return
// @route   POST /api/returns
// @access  Private
export const createReturn = async (req, res) => {
  const { orderNumber, productId, quantity, reason } = req.body;

  if (!orderNumber || !productId || !quantity || !reason) {
    return res.status(400).json({ success: false, message: 'Order number, product, quantity, and reason are required' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const randCode = Math.floor(10000 + Math.random() * 90000);
    const returnNumber = `RET-${randCode}`;

    const savedReturn = await prisma.return.create({
      data: {
        returnNumber,
        orderNumber,
        productId,
        quantity: parseInt(quantity),
        reason,
        status: 'Pending Approval',
      },
    });

    const userId = req.user.id || req.user._id;

    await logActivity({
      userId,
      userName: req.user.name,
      action: 'RETURN_INITIATE',
      details: `Initiated return ${returnNumber} for order ${orderNumber}. Product: ${product.name}, Qty: ${quantity}`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        ...savedReturn,
        _id: savedReturn.id,
      },
    });
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

  try {
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { returnNumber: { contains: search } },
        { orderNumber: { contains: search } },
        { reason: { contains: search } },
      ];
    }

    const total = await prisma.return.count({ where });
    const returnsList = await prisma.return.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, sku: true, category: true, price: true },
        },
        processedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const formattedReturns = returnsList.map(ret => ({
      _id: ret.id,
      id: ret.id,
      returnNumber: ret.returnNumber,
      orderNumber: ret.orderNumber,
      quantity: ret.quantity,
      reason: ret.reason,
      status: ret.status,
      actionTaken: ret.actionTaken,
      createdAt: ret.createdAt,
      updatedAt: ret.updatedAt,
      product: ret.product ? {
        _id: ret.product.id,
        id: ret.product.id,
        name: ret.product.name,
        sku: ret.product.sku,
        category: ret.product.category,
        price: ret.product.price,
      } : null,
      processedBy: ret.processedByUser ? {
        _id: ret.processedByUser.id,
        id: ret.processedByUser.id,
        name: ret.processedByUser.name,
        email: ret.processedByUser.email,
      } : null,
    }));

    res.json({
      success: true,
      data: formattedReturns,
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
    const returnItem = await prisma.return.findUnique({ where: { id: req.params.id } });
    if (!returnItem) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    if (returnItem.status !== 'Pending Approval') {
      return res.status(400).json({ success: false, message: 'Return request is already processed' });
    }

    const userId = req.user.id || req.user._id;

    const savedReturn = await prisma.return.update({
      where: { id: req.params.id },
      data: {
        status,
        actionTaken: actionTaken || `Processed return as ${status}`,
        processedBy: userId,
      },
    });

    // If approved and restocked, add quantities back to inventory
    if (status === 'Approved & Restocked') {
      const inventory = await prisma.inventory.findUnique({ where: { productId: returnItem.productId } });
      if (inventory) {
        const previousQty = inventory.quantity;
        const newQty = previousQty + returnItem.quantity;
        const newStatus = calculateStatus(newQty, inventory.reorderPoint);

        await prisma.inventory.update({
          where: { productId: returnItem.productId },
          data: {
            quantity: newQty,
            status: newStatus,
          },
        });

        await prisma.transaction.create({
          data: {
            productId: returnItem.productId,
            type: 'Return',
            quantity: returnItem.quantity,
            previousQty,
            newQty,
            reason: `Restocked returned items from return ${returnItem.returnNumber}`,
            referenceId: returnItem.id,
            performedBy: userId,
          },
        });
      }
    }

    await logActivity({
      userId,
      userName: req.user.name,
      action: `RETURN_${status.toUpperCase().replace(/ & /g, '_').replace(/ /g, '_')}`,
      details: `Processed return ${returnItem.returnNumber} as ${status}. Product ID: ${returnItem.productId}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        ...savedReturn,
        _id: savedReturn.id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
