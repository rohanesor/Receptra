import { Router } from 'express';
import { getAppointments, createAppointment, deleteAppointment } from '../controllers/appointment.controller.js';

const router = Router();

router.get('/', getAppointments);
router.post('/', createAppointment);
router.delete('/:id', deleteAppointment);

export default router;

