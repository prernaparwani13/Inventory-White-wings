import express from 'express';
import {
  getInventory,
  adjustStock,
  getLowStockAlerts,
  getTransactionLogs,
} from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getInventory);
router.post('/transaction', protect, adjustStock);
router.get('/low-stock', protect, getLowStockAlerts);
router.get('/transactions', protect, getTransactionLogs);

export default router;
