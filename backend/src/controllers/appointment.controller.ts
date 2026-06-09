import { Request, Response } from 'express';
import { prisma } from '../database/client.js';
import { DateTime } from 'luxon';

// Configurable business settings
const BUSINESS_HOURS = { start: 9, end: 20 }; // 9:00 AM to 8:00 PM
const BUSINESS_TIMEZONE = 'Asia/Kolkata'; // Or store in database/settings

/**
 * Get appointments filtered by date (YYYY-MM-DD)
 */
export async function getAppointments(req: Request, res: Response) {
  try {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid date parameter (YYYY-MM-DD) is required.',
      });
    }

    // Parse date in business timezone
    const startOfDay = DateTime.fromISO(date, { zone: BUSINESS_TIMEZONE }).startOf('day');
    const endOfDay = startOfDay.endOf('day');

    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: startOfDay.toJSDate(),
          lte: endOfDay.toJSDate(),
        },
      },
      include: {
        service: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments.',
    });
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(req: Request, res: Response) {
  try {
    const { customerName, customerPhone, serviceId, startTime } = req.body;

    if (!customerName || !customerPhone || !serviceId || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerName, customerPhone, serviceId, startTime.',
      });
    }

    // Verify service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Selected service not found.',
      });
    }

    // Parse requested start time and calculate end time
    const startDt = DateTime.fromISO(startTime, { zone: BUSINESS_TIMEZONE });
    if (!startDt.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startTime format. Please use ISO 8601 string.',
      });
    }

    const endDt = startDt.plus({ minutes: service.durationMinutes });

    // Validate business hours
    const startHour = startDt.hour;
    const endHour = endDt.hour + (endDt.minute > 0 ? 1 : 0);

    if (startHour < BUSINESS_HOURS.start || endHour > BUSINESS_HOURS.end) {
      return res.status(400).json({
        success: false,
        message: `Bookings must be between business hours: ${BUSINESS_HOURS.start}:00 AM and ${BUSINESS_HOURS.end}:00 PM ${BUSINESS_TIMEZONE}.`,
      });
    }

    // Check availability (overlap checks)
    // Overlap condition:
    // (ExistingStart < RequestedEnd) AND (ExistingEnd > RequestedStart)
    const overlapping = await prisma.appointment.findFirst({
      where: {
        status: { not: 'cancelled' },
        AND: [
          {
            startTime: {
              lt: endDt.toJSDate(),
            },
          },
          {
            endTime: {
              gt: startDt.toJSDate(),
            },
          },
        ],
      },
    });

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: 'The requested time slot overlaps with an existing appointment.',
      });
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        customerName,
        customerPhone,
        serviceId,
        startTime: startDt.toJSDate(),
        endTime: endDt.toJSDate(),
        status: 'booked',
      },
      include: {
        service: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create appointment.',
    });
  }
}
