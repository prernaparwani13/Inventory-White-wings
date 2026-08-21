import express from 'express';
import { createAudit, getAudits, getAuditById, reconcileAudit } from '../controllers/auditController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, authorize('Admin', 'Warehouse Manager'), createAudit)
  .get(protect, getAudits);

router.route('/:id')
  .get(protect, getAuditById);

router.put('/:id/reconcile', protect, authorize('Admin', 'Warehouse Manager'), reconcileAudit);

export default router;
