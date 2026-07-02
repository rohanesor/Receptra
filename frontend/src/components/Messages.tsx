import { useState, useEffect } from 'react';
import { getMessages } from '../services/api.js';
import type { Message } from '../services/api.js';
import { Mail, Phone, Calendar, RefreshCw, CheckCircle, X, User, Clock } from 'lucide-react';

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state to simulate resolving messages
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  // Selected message for detail panel
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getMessages();
      setMessages(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    const handleMessageCreated = () => {
      loadMessages();
    };
    window.addEventListener('message_created', handleMessageCreated);
    return () => {
      window.removeEventListener('message_created', handleMessageCreated);
    };
  }, []);

  const handleResolve = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(resolvedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      // Close detail panel if the resolved message was selected
      if (selectedMsg?.id === id) setSelectedMsg(null);
    }
    setResolvedIds(next);
  };

  const selectMsg = (msg: Message) => {
    setSelectedMsg(prev => (prev?.id === msg.id ? null : msg));
  };

  /** Generate 2-char initials from customer name */
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const unresolvedCount = messages.filter(m => !resolvedIds.has(m.id)).length;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-dark-muted">
            Customer Callback Messages
          </h3>
          {unresolvedCount > 0 && (
            <span className="px-2 py-0.5 bg-gold/15 border border-gold/25 text-gold text-[10px] font-extrabold rounded-full uppercase tracking-widest">
              {unresolvedCount} pending
            </span>
          )}
        </div>
        <button
          onClick={loadMessages}
          disabled={loading}
          className="p-2 bg-dark-card hover:bg-dark-border border border-dark-border rounded-lg text-dark-muted hover:text-gold transition-colors flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Two-column layout: list + detail drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── Message List ── */}
        <div className={`space-y-3 ${selectedMsg ? 'lg:col-span-2' : 'lg:col-span-5'} transition-all duration-300`}>
          {loading && messages.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-dark-muted font-medium">
              Loading callback requests...
            </div>
          ) : messages.length === 0 ? (
            <div className="glass-card p-12 text-center text-dark-muted text-xs font-medium border-dashed border-dark-border">
              No callback messages left.
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isResolved = resolvedIds.has(msg.id);
              const isSelected = selectedMsg?.id === msg.id;
              const dateStr = new Date(msg.createdAt).toLocaleDateString([], {
                month: 'short', day: 'numeric',
              });
              const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  onClick={() => !isResolved && selectMsg(msg)}
                  className={`glass-card p-4 flex items-center gap-4 transition-all duration-200 animate-stagger-card ${
                    isResolved
                      ? 'opacity-40 cursor-default border-dark-border/30'
                      : isSelected
                        ? 'border-gold/60 bg-gold/5 shadow-gold/10 shadow-lg cursor-pointer'
                        : 'hover:border-dark-border/80 hover:bg-dark-card/30 cursor-pointer'
                  }`}
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold border ${
                    isResolved
                      ? 'bg-dark-border/20 border-dark-border/30 text-dark-muted'
                      : isSelected
                        ? 'bg-gold/20 border-gold/40 text-gold'
                        : 'bg-dark-border/40 border-dark-border text-dark-muted'
                  }`}>
                    {getInitials(msg.customerName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-dark-text truncate">{msg.customerName}</p>
                    <p className="text-[11px] text-dark-muted font-medium mt-0.5 truncate">{msg.customerPhone}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-dark-muted font-semibold">{dateStr} · {timeStr}</span>
                    <button
                      onClick={(e) => handleResolve(e, msg.id)}
                      className={`p-1 rounded-md border transition-colors ${
                        isResolved
                          ? 'bg-green-500/10 border-green-500/20 text-green-400'
                          : 'bg-dark-bg/60 border-dark-border text-dark-muted hover:text-gold hover:border-gold/30'
                      }`}
                      title={isResolved ? 'Mark Unresolved' : 'Mark Resolved'}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Customer Detail Drawer ── */}
        {selectedMsg && (() => {
          const msg = selectedMsg;
          const fullDate = new Date(msg.createdAt).toLocaleDateString([], {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          });
          const fullTime = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          });

          return (
            <div className="lg:col-span-3 glass-card overflow-hidden animate-tab-entry">
              {/* Drawer Header */}
              <div className="p-5 border-b border-dark-border/40 flex items-center justify-between bg-dark-card/60">
                <div className="flex items-center gap-4">
                  {/* Large Avatar */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/30 flex items-center justify-center text-xl font-extrabold text-gold">
                    {getInitials(msg.customerName)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-dark-text tracking-wide">{msg.customerName}</h3>
                    <p className="text-[11px] text-dark-muted font-medium mt-0.5">Callback Request</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMsg(null)}
                  className="p-2 rounded-lg text-dark-muted hover:text-gold hover:bg-dark-border/40 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Body */}
              <div className="p-6 space-y-5">

                {/* Stat Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-dark-bg/60 border border-dark-border rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3.5 h-3.5 text-gold" />
                      <p className="text-[9px] text-dark-muted font-bold uppercase tracking-widest">Full Name</p>
                    </div>
                    <p className="text-sm font-extrabold text-dark-text">{msg.customerName}</p>
                  </div>
                  <div className="p-3 bg-dark-bg/60 border border-dark-border rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3.5 h-3.5 text-gold" />
                      <p className="text-[9px] text-dark-muted font-bold uppercase tracking-widest">Received</p>
                    </div>
                    <p className="text-xs font-extrabold text-dark-text font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="p-3 bg-dark-bg/40 border border-dark-border/60 rounded-lg flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gold flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Request Date & Time</p>
                    <p className="text-xs text-dark-text font-semibold mt-0.5">{fullDate} at {fullTime}</p>
                  </div>
                </div>

                {/* Phone quick-dial */}
                <div className="p-3 bg-dark-bg/40 border border-dark-border/60 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Phone Number</p>
                      <p className="text-sm text-dark-text font-extrabold font-mono mt-0.5">{msg.customerPhone}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${msg.customerPhone}`}
                    className="px-3 py-1.5 bg-gold/10 border border-gold/25 text-gold text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-gold/20 transition-colors"
                  >
                    Call Back
                  </a>
                </div>

                {/* Reason / Message */}
                <div className="p-4 bg-dark-bg/50 border border-dark-border rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gold" />
                    <h5 className="text-[10px] text-gold font-bold uppercase tracking-widest">Customer Message</h5>
                  </div>
                  <p className="text-sm text-dark-text font-medium leading-relaxed italic">
                    "{msg.reason}"
                  </p>
                </div>

                {/* Resolve CTA */}
                <button
                  onClick={(e) => { handleResolve(e, msg.id); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-bold uppercase tracking-wider hover:bg-green-500/20 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Resolved
                </button>

              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
