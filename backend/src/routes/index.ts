import { Router } from 'express';
import serviceRoutes from './service.routes.js';
import appointmentRoutes from './appointment.routes.js';
import callRoutes from './call.routes.js';

const router = Router();

// API Health Check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Register routes
router.use('/services', serviceRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/calls', callRoutes);

export default router;
