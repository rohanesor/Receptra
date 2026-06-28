import { prisma } from '../database/client.js';
import { DateTime } from 'luxon';
import twilio from 'twilio';
import { config } from '../config/index.js';

const BUSINESS_TIMEZONE = 'Asia/Kolkata';
const BUSINESS_HOURS = { start: 9, end: 20 };

// Initialize Twilio client if keys exist
let twilioClient: any = null;
if (
  config.twilio.accountSid && 
  config.twilio.accountSid.startsWith('AC') && 
  config.twilio.authToken
) {
  twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
}

/**
 * Check available appointment slots for a given date (YYYY-MM-DD)
 */
export async function checkAvailability(date: string, serviceId?: string): Promise<{ success: boolean; slots?: string[]; message?: string }> {
  try {
    const startOfDay = DateTime.fromISO(date, { zone: BUSINESS_TIMEZONE }).startOf('day');
    if (!startOfDay.isValid) {
      return { success: false, message: 'Invalid date format. Please use YYYY-MM-DD.' };
    }

    const now = DateTime.now().setZone(BUSINESS_TIMEZONE);
    if (startOfDay < now.startOf('day')) {
      return { success: true, slots: [], message: 'Cannot query or book appointments in the past.' };
    }

    const endOfDay = startOfDay.endOf('day');

    let slotDurationMinutes = 30;
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });
      if (service) {
        slotDurationMinutes = service.durationMinutes;
      }
    }

    // Fetch existing appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: startOfDay.toJSDate(),
          lte: endOfDay.toJSDate(),
        },
        status: { not: 'cancelled' },
      },
    });

    const availableSlots: string[] = [];
    let currentSlot = startOfDay.set({ hour: BUSINESS_HOURS.start, minute: 0 });
    const businessEnd = startOfDay.set({ hour: BUSINESS_HOURS.end, minute: 0 });

    while (currentSlot < businessEnd) {
      const slotStart = currentSlot;
      const slotEnd = currentSlot.plus({ minutes: slotDurationMinutes });

      // If slot is today, ensure it starts at least 15 minutes in the future
      const isPastSlot = slotStart < now.plus({ minutes: 15 });

      // Check if slot overlaps with any existing booking
      const isOverlapping = appointments.some((app) => {
        const appStart = DateTime.fromJSDate(app.startTime).setZone(BUSINESS_TIMEZONE);
        const appEnd = DateTime.fromJSDate(app.endTime).setZone(BUSINESS_TIMEZONE);
        return slotStart < appEnd && slotEnd > appStart;
      });

      if (slotEnd <= businessEnd && !isPastSlot && !isOverlapping) {
        availableSlots.push(slotStart.toFormat('hh:mm a'));
      }

      currentSlot = currentSlot.plus({ minutes: 30 });
    }

    return {
      success: true,
      slots: availableSlots,
    };
  } catch (error) {
    console.error('[Action Engine] checkAvailability error:', error);
    return { success: false, message: 'Failed to retrieve available slots.' };
  }
}

/**
 * Create a new appointment booking
 */
export async function createAppointment(
  customerName: string,
  customerPhone: string,
  serviceId: string,
  startTime: string
): Promise<{ success: boolean; appointment?: any; message: string }> {
  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return { success: false, message: 'Service not found. Please double-check service options.' };
    }

    const startDt = DateTime.fromISO(startTime, { zone: BUSINESS_TIMEZONE });
    if (!startDt.isValid) {
      return { success: false, message: 'Invalid start time format.' };
    }

    const now = DateTime.now().setZone(BUSINESS_TIMEZONE);
    if (startDt < now.minus({ minutes: 5 })) { // 5m grace period for minor network latency
      return { success: false, message: 'Cannot book an appointment in the past.' };
    }

    const endDt = startDt.plus({ minutes: service.durationMinutes });

    // Validate business hours
    if (startDt.hour < BUSINESS_HOURS.start || (endDt.hour + (endDt.minute > 0 ? 1 : 0)) > BUSINESS_HOURS.end) {
      return {
        success: false,
        message: `Slots must fit within shop hours (${BUSINESS_HOURS.start}:00 AM - ${BUSINESS_HOURS.end}:00 PM).`,
      };
    }

    // Check overlap
    const overlapping = await prisma.appointment.findFirst({
      where: {
        status: { not: 'cancelled' },
        AND: [
          { startTime: { lt: endDt.toJSDate() } },
          { endTime: { gt: startDt.toJSDate() } },
        ],
      },
    });

    if (overlapping) {
      return { success: false, message: 'The selected time slot has just been booked. Please check other times.' };
    }

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

    // Send confirmation SMS asynchronously
    sendSMS(
      customerPhone,
      `Hey ${customerName}! Your booking for ${service.name} at StyleCraft Barber is confirmed for ${startDt.toFormat(
        'dd LLL hh:mm a'
      )}. See you there!`
    ).catch(console.error);

    return {
      success: true,
      appointment,
      message: 'Appointment successfully created!',
    };
  } catch (error) {
    console.error('[Action Engine] createAppointment error:', error);
    return { success: false, message: 'Internal error booking appointment.' };
  }
}

/**
 * Record a callback request message
 */
export async function takeMessage(
  customerName: string,
  customerPhone: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.message.create({
      data: {
        customerName,
        customerPhone,
        reason,
      },
    });

    return {
      success: true,
      message: 'Message saved. We have recorded your callback request.',
    };
  } catch (error) {
    console.error('[Action Engine] takeMessage error:', error);
    return { success: false, message: 'Failed to record callback message.' };
  }
}

/**
 * Send SMS notification using Twilio
 */
export async function sendSMS(to: string, message: string): Promise<{ success: boolean; message: string }> {
  if (!twilioClient) {
    console.log(`[Twilio SMS Simulation] To: ${to}, Message: "${message}"`);
    return { success: true, message: 'SMS simulated successfully (no Twilio SID configured).' };
  }

  try {
    const response = await twilioClient.messages.create({
      body: message,
      from: config.twilio.phoneNumber,
      to,
    });
    console.log(`[Twilio SMS] Sent: ${response.sid}`);
    return { success: true, message: 'SMS sent successfully.' };
  } catch (error) {
    console.error('[Twilio SMS Error] Failed to send:', error);
    return { success: false, message: 'Failed to send SMS confirmation.' };
  }
}

/**
 * Save Call Logs to the database after call teardown
 */
export async function saveCallLog(
  phone: string,
  transcript: string,
  intent: string,
  durationSeconds: number,
  summary: string
): Promise<{ success: boolean }> {
  try {
    await prisma.callLog.create({
      data: {
        phone,
        transcript,
        intent,
        duration: durationSeconds,
        summary,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('[Action Engine] saveCallLog error:', error);
    return { success: false };
  }
}
