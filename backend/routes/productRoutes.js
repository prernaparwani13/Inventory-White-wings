import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  generateSuggestedSku,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate-sku', protect, generateSuggestedSku);

router.route('/')
  .post(protect, createProduct)
  .get(protect, getProducts);

router.route('/:id')
  .get(protect, getProductById)
  .put(protect, updateProduct)
  .delete(protect, authorize('Admin', 'Warehouse Manager'), deleteProduct);

export default router;
