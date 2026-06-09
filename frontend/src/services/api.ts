const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api/v1';

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  service: Service;
  startTime: string;
  endTime: string;
  status: string;
}

export interface CallLog {
  id: string;
  phone: string;
  transcript: string;
  summary?: string;
  intent?: string;
  duration?: number;
  timestamp: string;
}

export interface Message {
  id: string;
  customerName: string;
  customerPhone: string;
  reason: string;
  createdAt: string;
}

/**
 * Fetch all available services
 */
export async function getServices(): Promise<Service[]> {
  const res = await fetch(`${API_BASE}/services`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to fetch services');
  return json.data;
}

/**
 * Fetch appointments for a specific date (YYYY-MM-DD)
 */
export async function getAppointments(date: string): Promise<Appointment[]> {
  const res = await fetch(`${API_BASE}/appointments?date=${date}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to fetch appointments');
  return json.data;
}

/**
 * Create a manual appointment from dashboard
 */
export async function createAppointment(data: {
  customerName: string;
  customerPhone: string;
  serviceId: string;
  startTime: string;
}): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to book appointment');
  return json.data;
}

/**
 * Fetch past call logs
 */
export async function getCallLogs(): Promise<CallLog[]> {
  const res = await fetch(`${API_BASE}/calls/logs`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to fetch call logs');
  return json.data;
}

/**
 * Fetch callback messages left by customers
 */
export async function getMessages(): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/calls/messages`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to fetch messages');
  return json.data;
}
