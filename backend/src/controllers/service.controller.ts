import { Request, Response } from 'express';
import { prisma } from '../database/client.js';

/**
 * Get all services offered by the barbershop
 */
export async function getServices(req: Request, res: Response) {
  try {
    const services = await prisma.service.findMany({
      orderBy: { price: 'asc' },
    });
    
    return res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve services.',
    });
  }
}
