import { Router } from 'express';
import { getCallLogs, createCallLog, getMessages, createMessage } from '../controllers/call.controller.js';

const router = Router();

router.get('/logs', getCallLogs);
router.post('/logs', createCallLog);
router.get('/messages', getMessages);
router.post('/messages', createMessage);

export default router;
