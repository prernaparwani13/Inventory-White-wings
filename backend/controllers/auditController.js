import Audit from '../models/Audit.js';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import { logActivity } from '../utils/auditLogger.js';

// @desc    Start a stock audit (captures expected quantities)
// @route   POST /api/audits
// @access  Private/Warehouse Manager & Admin
export const createAudit = async (req, res) => {
  const { productIds } = req.body; // Array of product ids to audit, if empty, audit all

  try {
    let query = {};
    if (productIds && productIds.length > 0) {
      query.product = { $in: productIds };
    }

    const inventories = await Inventory.find(query).populate('product', 'name sku');
    
    if (inventories.length === 0) {
      return res.status(400).json({ success: false, message: 'No inventory items found to audit' });
    }

    const items = inventories.map(inv => ({
      product: inv.product._id,
      expectedQty: inv.quantity,
      actualQty: inv.quantity, // Default count matches expected, user edits
      discrepancy: 0,
      remarks: '',
    }));

    const randCode = Math.floor(10000 + Math.random() * 90000);
    const auditNumber = `AUD-${randCode}`;

    const audit = new Audit({
      auditNumber,
      items,
      status: 'Draft',
      auditedBy: req.user._id,
    });

    const savedAudit = await audit.save();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      action: 'AUDIT_START',
      details: `Started stock audit ${auditNumber} with ${items.length} items`,
      ip: req.ip,
    });

    res.status(201).json({ success: true, data: savedAudit });
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
    const total = await Audit.countDocuments({});
    const audits = await Audit.find({})
      .populate('auditedBy', 'name email role')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: audits,
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
    const audit = await Audit.findById(req.params.id)
      .populate('items.product', 'name sku category price')
      .populate('auditedBy', 'name email role');

    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    res.json({ success: true, data: audit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit count / Reconcile audit (reconciles differences in stock)
// @route   PUT /api/audits/:id/reconcile
// @access  Private/Warehouse Manager & Admin
export const reconcileAudit = async (req, res) => {
  const { counts } = req.body; // Array of { productId, actualQty, remarks }

  if (!counts || counts.length === 0) {
    return res.status(400).json({ success: false, message: 'Counts are required to reconcile' });
  }

  try {
    const audit = await Audit.findById(req.params.id);
    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    if (audit.status === 'Reconciled') {
      return res.status(400).json({ success: false, message: 'Audit is already reconciled' });
    }

    // Re-verify expected counts and update audit item records
    for (const count of counts) {
      const auditItem = audit.items.find(item => item.product.toString() === count.productId);
      if (auditItem) {
        auditItem.actualQty = Number(count.actualQty);
        auditItem.discrepancy = Number(count.actualQty) - auditItem.expectedQty;
        auditItem.remarks = count.remarks || '';
      }
    }

    // Process adjustments for items with discrepancies
    for (const item of audit.items) {
      if (item.discrepancy !== 0) {
        const inventory = await Inventory.findOne({ product: item.product });
        if (inventory) {
          const previousQty = inventory.quantity;
          inventory.quantity = item.actualQty;
          await inventory.save();

          // Log transaction
          const transType = item.discrepancy > 0 ? 'In' : 'Out';
          const transaction = new Transaction({
            product: item.product,
            type: 'Audit Reconciled',
            quantity: Math.abs(item.discrepancy),
            previousQty,
            newQty: item.actualQty,
            reason: `Reconciliation discrepancy from audit ${audit.auditNumber}. Remarks: ${item.remarks || 'None'}`,
            referenceId: audit._id.toString(),
            performedBy: req.user._id,
          });
          await transaction.save();
        }
      }
    }

    audit.status = 'Reconciled';
    audit.reconciledAt = new Date();
    const updatedAudit = await audit.save();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      action: 'AUDIT_RECONCILE',
      details: `Reconciled stock audit ${audit.auditNumber} and adjusted inventory variances.`,
      ip: req.ip,
    });

    res.json({ success: true, data: updatedAudit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
