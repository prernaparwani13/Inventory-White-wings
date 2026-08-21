import express from 'express';
import { createReturn, getReturns, processReturn } from '../controllers/returnController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createReturn)
  .get(protect, getReturns);

router.put('/:id/process', protect, authorize('Admin', 'Warehouse Manager'), processReturn);

export default router;
