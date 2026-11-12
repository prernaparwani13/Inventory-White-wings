import prisma from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';

const calculateStatus = (quantity, reorderPoint) => {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= reorderPoint) return 'Low Stock';
  return 'In Stock';
};

// @desc    Start a stock audit (captures expected quantities)
// @route   POST /api/audits
// @access  Private/Warehouse Manager & Admin
export const createAudit = async (req, res) => {
  const { productIds } = req.body;

  try {
    const where = {};
    if (productIds && productIds.length > 0) {
      where.productId = { in: productIds };
    }

    const inventories = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    });

    if (inventories.length === 0) {
      return res.status(400).json({ success: false, message: 'No inventory items found to audit' });
    }

    const items = inventories.map(inv => ({
      productId: inv.productId,
      expectedQty: inv.quantity,
      actualQty: inv.quantity,
      discrepancy: 0,
      remarks: '',
    }));

    const randCode = Math.floor(10000 + Math.random() * 90000);
    const auditNumber = `AUD-${randCode}`;

    const userId = req.user.id || req.user._id;

    const savedAudit = await prisma.audit.create({
      data: {
        auditNumber,
        status: 'Draft',
        auditedBy: userId,
        items: {
          create: items,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    await logActivity({
      userId,
      userName: req.user.name,
      action: 'AUDIT_START',
      details: `Started stock audit ${auditNumber} with ${items.length} items`,
      ip: req.ip,
    });

    const formattedAudit = {
      _id: savedAudit.id,
      id: savedAudit.id,
      auditNumber: savedAudit.auditNumber,
      status: savedAudit.status,
      auditedBy: savedAudit.auditedBy,
      createdAt: savedAudit.createdAt,
      items: savedAudit.items.map(item => ({
        _id: item.id,
        id: item.id,
        expectedQty: item.expectedQty,
        actualQty: item.actualQty,
        discrepancy: item.discrepancy,
        remarks: item.remarks,
        product: item.product ? {
          _id: item.product.id,
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
        } : item.productId,
      })),
    };

    res.status(201).json({ success: true, data: formattedAudit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all audits
// @route   GET /api/audits
// @access  Private
export const getAudits = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const total = await prisma.audit.count();
    const audits = await prisma.audit.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        auditedByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: true,
      },
    });

    const formattedAudits = audits.map(audit => ({
      _id: audit.id,
      id: audit.id,
      auditNumber: audit.auditNumber,
      status: audit.status,
      reconciledAt: audit.reconciledAt,
      createdAt: audit.createdAt,
      updatedAt: audit.updatedAt,
      auditedBy: audit.auditedByUser ? {
        _id: audit.auditedByUser.id,
        id: audit.auditedByUser.id,
        name: audit.auditedByUser.name,
        email: audit.auditedByUser.email,
        role: audit.auditedByUser.role,
      } : null,
      items: audit.items.map(i => ({
        _id: i.id,
        id: i.id,
        expectedQty: i.expectedQty,
        actualQty: i.actualQty,
        discrepancy: i.discrepancy,
        remarks: i.remarks,
        product: i.productId,
      })),
    }));

    res.json({
      success: true,
      data: formattedAudits,
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

// @desc    Get audit by ID
// @route   GET /api/audits/:id
// @access  Private
export const getAuditById = async (req, res) => {
  try {
    const audit = await prisma.audit.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, category: true, price: true },
            },
          },
        },
        auditedByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    const formattedAudit = {
      _id: audit.id,
      id: audit.id,
      auditNumber: audit.auditNumber,
      status: audit.status,
      reconciledAt: audit.reconciledAt,
      createdAt: audit.createdAt,
      updatedAt: audit.updatedAt,
      auditedBy: audit.auditedByUser ? {
        _id: audit.auditedByUser.id,
        id: audit.auditedByUser.id,
        name: audit.auditedByUser.name,
        email: audit.auditedByUser.email,
        role: audit.auditedByUser.role,
      } : null,
      items: audit.items.map(item => ({
        _id: item.id,
        id: item.id,
        expectedQty: item.expectedQty,
        actualQty: item.actualQty,
        discrepancy: item.discrepancy,
        remarks: item.remarks,
        product: item.product ? {
          _id: item.product.id,
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          category: item.product.category,
          price: item.product.price,
        } : null,
      })),
    };

    res.json({ success: true, data: formattedAudit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit count / Reconcile audit (reconciles differences in stock)
// @route   PUT /api/audits/:id/reconcile
// @access  Private/Warehouse Manager & Admin
export const reconcileAudit = async (req, res) => {
  const { counts } = req.body;

  if (!counts || counts.length === 0) {
    return res.status(400).json({ success: false, message: 'Counts are required to reconcile' });
  }

  try {
    const audit = await prisma.audit.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    if (audit.status === 'Reconciled') {
      return res.status(400).json({ success: false, message: 'Audit is already reconciled' });
    }

    const userId = req.user.id || req.user._id;

    // Update individual audit items with counts & discrepancies
    for (const count of counts) {
      const auditItem = audit.items.find(item => item.productId === count.productId);
      if (auditItem) {
        const actualQty = Number(count.actualQty);
        const discrepancy = actualQty - auditItem.expectedQty;
        const remarks = count.remarks || '';

        await prisma.auditItem.update({
          where: { id: auditItem.id },
          data: {
            actualQty,
            discrepancy,
            remarks,
          },
        });

        // Reconcile inventory discrepancy if any
        if (discrepancy !== 0) {
          const inventory = await prisma.inventory.findUnique({ where: { productId: count.productId } });
          if (inventory) {
            const previousQty = inventory.quantity;
            const newStatus = calculateStatus(actualQty, inventory.reorderPoint);

            await prisma.inventory.update({
              where: { productId: count.productId },
              data: {
                quantity: actualQty,
                status: newStatus,
              },
            });

            await prisma.transaction.create({
              data: {
                productId: count.productId,
                type: 'Audit Reconciled',
                quantity: Math.abs(discrepancy),
                previousQty,
                newQty: actualQty,
                reason: `Reconciliation discrepancy from audit ${audit.auditNumber}. Remarks: ${remarks || 'None'}`,
                referenceId: audit.id,
                performedBy: userId,
              },
            });
          }
        }
      }
    }

    const updatedAudit = await prisma.audit.update({
      where: { id: req.params.id },
      data: {
        status: 'Reconciled',
        reconciledAt: new Date(),
      },
      include: { items: true },
    });

    await logActivity({
      userId,
      userName: req.user.name,
      action: 'AUDIT_RECONCILE',
      details: `Reconciled stock audit ${audit.auditNumber} and adjusted inventory variances.`,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        ...updatedAudit,
        _id: updatedAudit.id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
