import { Router } from 'express';
import {
  getChallans,
  getChallanById,
  createChallan,
  updateChallanStatus,
} from '../controllers/challanController';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getChallans);
router.get('/:id', authMiddleware, getChallanById);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'SALES']), createChallan);
router.put('/:id/status', authMiddleware, roleMiddleware(['ADMIN', 'ACCOUNTS', 'SALES']), updateChallanStatus);

export default router;
