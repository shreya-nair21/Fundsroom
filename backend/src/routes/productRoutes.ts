import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  adjustStock,
  getStockMovements,
} from '../controllers/productController';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getProducts);
router.get('/movements/logs', authMiddleware, roleMiddleware(['ADMIN', 'WAREHOUSE', 'ACCOUNTS']), getStockMovements);
router.get('/:id', authMiddleware, getProductById);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'WAREHOUSE']), createProduct);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'WAREHOUSE']), updateProduct);
router.post('/:id/adjust-stock', authMiddleware, roleMiddleware(['ADMIN', 'WAREHOUSE']), adjustStock);

export default router;
