import { Router } from 'express';
import { getCallLogs, createCallLog, getMessages, createMessage, deleteCallLog, deleteMessage } from '../controllers/call.controller.js';

const router = Router();

router.get('/logs', getCallLogs);
router.post('/logs', createCallLog);
router.delete('/logs/:id', deleteCallLog);
router.get('/messages', getMessages);
router.post('/messages', createMessage);
router.delete('/messages/:id', deleteMessage);

export default router;

