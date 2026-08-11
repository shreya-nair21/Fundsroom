import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addFollowUp,
} from '../controllers/customerController';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getCustomers);
router.get('/:id', authMiddleware, getCustomerById);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'SALES']), createCustomer);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'SALES']), updateCustomer);
router.post('/:id/followups', authMiddleware, roleMiddleware(['ADMIN', 'SALES']), addFollowUp);

export default router;
