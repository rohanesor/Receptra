import { Request, Response } from 'express';
import { prisma } from '../database/client.js';

/**
 * Get call logs (historic records)
 */
export async function getCallLogs(req: Request, res: Response) {
  try {
    const logs = await prisma.callLog.findMany({
      where: { deletedAt: null },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    
    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve call logs.',
    });
  }
}

/**
 * Create a new call log entry
 */
export async function createCallLog(req: Request, res: Response) {
  try {
    const { phone, transcript, summary, intent, duration } = req.body;
    
    if (!phone || transcript === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and transcript are required.',
      });
    }

    const log = await prisma.callLog.create({
      data: {
        phone,
        transcript,
        summary,
        intent,
        duration: duration ? parseInt(duration, 10) : undefined,
      },
    });

    return res.status(201).json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('Error creating call log:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create call log.',
    });
  }
}

/**
 * Get all callback messages
 */
export async function getMessages(req: Request, res: Response) {
  try {
    const messages = await prisma.message.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    
    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages.',
    });
  }
}

/**
 * Create a new message left by a customer
 */
export async function createMessage(req: Request, res: Response) {
  try {
    const { customerName, customerPhone, reason } = req.body;
    
    if (!customerName || !customerPhone || !reason) {
      return res.status(400).json({
        success: false,
        message: 'customerName, customerPhone, and reason are required.',
      });
    }

    const message = await prisma.message.create({
      data: {
        customerName,
        customerPhone,
        reason,
      },
    });

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save message.',
    });
  }
}

/**
 * Soft delete a call log
 */
export async function deleteCallLog(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Call log ID is required.',
      });
    }

    const log = await prisma.callLog.findUnique({
      where: { id },
    });

    if (!log || log.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Call log not found.',
      });
    }

    await prisma.callLog.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'Call log deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting call log:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete call log.',
    });
  }
}

/**
 * Soft delete a callback message
 */
export async function deleteMessage(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Message ID is required.',
      });
    }

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message || message.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    await prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete message.',
    });
  }
}

