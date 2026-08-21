import express from 'express';
import { getDashboardSummary, getSystemAuditLogs } from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', protect, getDashboardSummary);
router.get('/audit-logs', protect, authorize('Admin'), getSystemAuditLogs);

export default router;
