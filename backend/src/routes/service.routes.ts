import { Router } from 'express';
import { getServices } from '../controllers/service.controller.js';

const router = Router();

router.get('/', getServices);

export default router;
