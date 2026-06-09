import { Router } from 'express';
import { getAppointments, createAppointment } from '../controllers/appointment.controller.js';

const router = Router();

router.get('/', getAppointments);
router.post('/', createAppointment);

export default router;
