import React, { useState, useEffect } from 'react';
import { getAppointments, createAppointment, getServices } from '../services/api.js';
import type { Service, Appointment } from '../services/api.js';
import { Calendar as CalendarIcon, Clock, Plus, RefreshCw, Sparkles, User, Phone } from 'lucide-react';

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    bookingDate: new Date().toISOString().split('T')[0],
    bookingTime: '10:00',
  });

  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await getAppointments(date);
      setAppointments(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const list = await getServices();
      setServices(list);
      if (list.length > 0 && !formData.serviceId) {
        setFormData(prev => ({ ...prev, serviceId: list[0].id }));
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    loadServices();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const { customerName, customerPhone, serviceId, bookingDate, bookingTime } = formData;

    if (!customerName || !customerPhone || !serviceId || !bookingDate || !bookingTime) {
      setFormError('All fields are required.');
      setSubmitting(false);
      return;
    }

    try {
      // Assemble local ISO format e.g. "2026-06-10T10:00:00+05:30"
      // StyleCraft operates in Asia/Kolkata timezone (+05:30)
      const startTimeISO = `${bookingDate}T${bookingTime}:00+05:30`;
      
      await createAppointment({
        customerName,
        customerPhone,
        serviceId,
        startTime: startTimeISO,
      });

      setFormSuccess('Appointment booked successfully!');
      setFormData({
        customerName: '',
        customerPhone: '',
        serviceId: services[0]?.id || '',
        bookingDate: selectedDate,
        bookingTime: '10:00',
      });
      
      // Refresh list
      loadData(selectedDate);
    } catch (err: any) {
      setFormError(err.message || 'Booking conflict or database error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Appointment List Panel */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          {/* Date Picker bar */}
          <div className="flex items-center gap-3">
            <div className="bg-dark-card border border-dark-border px-3 py-1.5 rounded-lg flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gold" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm focus:outline-none border-none text-dark-text"
              />
            </div>
            <button
              onClick={() => loadData(selectedDate)}
              className="p-2 bg-dark-card hover:bg-dark-border border border-dark-border rounded-lg text-dark-muted hover:text-gold transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="text-xs font-semibold text-dark-muted">
            {appointments.length} {appointments.length === 1 ? 'Booking' : 'Bookings'}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Bookings Card Container */}
        <div className="space-y-4">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs text-dark-muted font-medium">
              Loading schedules...
            </div>
          ) : appointments.length === 0 ? (
            <div className="glass-card p-12 text-center text-dark-muted text-xs font-medium border-dashed border-dark-border">
              No appointments scheduled for this date.
            </div>
          ) : (
            appointments.map((app) => {
              const start = new Date(app.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const end = new Date(app.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={app.id} className="glass-card p-5 flex items-center justify-between border-l-4 border-l-gold hover:border-dark-border hover:bg-dark-card/60 transition-all duration-200">
                  <div className="flex items-center gap-6">
                    {/* Time Slot Block */}
                    <div className="flex flex-col items-center justify-center bg-dark-border/40 px-3 py-2 rounded-lg border border-dark-border min-w-[70px]">
                      <Clock className="w-3.5 h-3.5 text-gold mb-1" />
                      <span className="text-[11px] font-bold text-dark-text">{start}</span>
                      <span className="text-[9px] text-dark-muted font-semibold mt-0.5">{end}</span>
                    </div>

                    {/* Customer Info */}
                    <div>
                      <h4 className="font-extrabold text-sm tracking-wide text-dark-text font-sans">{app.customerName}</h4>
                      <p className="text-xs text-dark-muted font-medium mt-0.5">{app.customerPhone}</p>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <span className="px-2.5 py-0.5 bg-gold/15 text-gold border border-gold/20 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {app.service.name}
                      </span>
                      <p className="text-xs text-dark-muted font-medium mt-1">
                        {app.service.durationMinutes} min • ${app.service.price}
                      </p>
                    </div>

                    {/* Booking status pill */}
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-extrabold rounded uppercase tracking-widest">
                      {app.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Manual Booking Sidebar Panel */}
      <div className="lg:col-span-1">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Plus className="w-4 h-4 text-gold" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-gradient font-sans">Manual Booking</h3>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg">
                {formSuccess}
              </div>
            )}

            <div>
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1">Customer Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-dark-muted" />
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full bg-dark-bg/60 border border-dark-border text-sm rounded-lg pl-9 pr-4 py-2.5 text-dark-text focus:outline-none focus:border-gold/60"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-dark-muted" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full bg-dark-bg/60 border border-dark-border text-sm rounded-lg pl-9 pr-4 py-2.5 text-dark-text focus:outline-none focus:border-gold/60"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1">Service</label>
              <select
                value={formData.serviceId}
                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                className="w-full bg-dark-bg/60 border border-dark-border text-sm rounded-lg px-3 py-2.5 text-dark-text focus:outline-none focus:border-gold/60 appearance-none"
              >
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id} className="bg-dark-card text-dark-text">
                    {svc.name} (${svc.price})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.bookingDate}
                  onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                  className="w-full bg-dark-bg/60 border border-dark-border text-xs rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-gold/60"
                />
              </div>
              <div>
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={formData.bookingTime}
                  onChange={(e) => setFormData({ ...formData, bookingTime: e.target.value })}
                  className="w-full bg-dark-bg/60 border border-dark-border text-xs rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:border-gold/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full glow-btn flex items-center justify-center gap-2 mt-4 py-2.5"
            >
              <Sparkles className="w-4 h-4 text-dark-bg" />
              <span>{submitting ? 'Confirming...' : 'Book Slot'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
