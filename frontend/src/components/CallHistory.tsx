import { useState, useEffect } from 'react';
import { getCallLogs } from '../services/api.js';
import type { CallLog } from '../services/api.js';
import { Phone, Clock, Calendar, RefreshCw, X, User, Zap, FileText } from 'lucide-react';


export default function CallHistory() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The currently selected log shown in the detail drawer
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const history = await getCallLogs();
      setLogs(history);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve call logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const selectLog = (log: CallLog) => {
    // Toggle off if same card is clicked twice
    setSelectedLog(prev => (prev?.id === log.id ? null : log));
  };

  // Helper to format duration in MM:SS
  const formatDuration = (sec?: number) => {
    if (sec === undefined) return '00:00';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Intent color styling
  const getIntentStyle = (intent?: string) => {
    switch (intent?.toLowerCase()) {
      case 'booking':
        return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'message':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'inquiry':
      default:
        return 'bg-gold/15 text-gold border border-gold/20';
    }
  };

  // Generate avatar initials from phone number's last 4 digits
  const getInitials = (phone: string) => phone.replace(/\D/g, '').slice(-2) || '??';

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-dark-muted">Call History & Transcripts</h3>
        <button
          onClick={loadLogs}
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

        {/* ── Log List ── */}
        <div className={`space-y-3 ${selectedLog ? 'lg:col-span-2' : 'lg:col-span-5'} transition-all duration-300`}>
          {loading && logs.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-dark-muted font-medium">
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="glass-card p-12 text-center text-dark-muted text-xs font-medium border-dashed border-dark-border">
              No previous calls recorded.
            </div>
          ) : (
            logs.map((log, idx) => {
              const isSelected = selectedLog?.id === log.id;
              const dateStr = new Date(log.timestamp).toLocaleDateString([], {
                month: 'short', day: 'numeric', year: 'numeric',
              });
              const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  onClick={() => selectLog(log)}
                  className={`glass-card p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 animate-stagger-card ${
                    isSelected
                      ? 'border-gold/60 bg-gold/5 shadow-gold/10 shadow-lg'
                      : 'hover:border-dark-border/80 hover:bg-dark-card/30'
                  }`}
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold font-mono border ${
                    isSelected ? 'bg-gold/20 border-gold/40 text-gold' : 'bg-dark-border/40 border-dark-border text-dark-muted'
                  }`}>
                    {getInitials(log.phone)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-dark-text truncate">{log.phone}</p>
                    <p className="text-[11px] text-dark-muted font-medium mt-0.5">{dateStr} · {timeStr}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {log.intent && (
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${getIntentStyle(log.intent)}`}>
                        {log.intent}
                      </span>
                    )}
                    <span className="text-[10px] text-dark-muted font-semibold font-mono">
                      {formatDuration(log.duration)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── User Detail Drawer ── */}
        {selectedLog && (() => {
          const log = selectedLog;
          const dateStr = new Date(log.timestamp).toLocaleDateString([], {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          });
          const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          });

          return (
            <div className="lg:col-span-3 glass-card overflow-hidden animate-tab-entry">
              {/* Drawer Header */}
              <div className="p-5 border-b border-dark-border/40 flex items-center justify-between bg-dark-card/60">
                <div className="flex items-center gap-4">
                  {/* Large Avatar */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/30 flex items-center justify-center text-xl font-extrabold font-mono text-gold">
                    {getInitials(log.phone)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-dark-text tracking-wide">{log.phone}</h3>
                    <p className="text-[11px] text-dark-muted font-medium mt-0.5">Caller Profile</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 rounded-lg text-dark-muted hover:text-gold hover:bg-dark-border/40 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Body */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

                {/* Stat Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-dark-bg/60 border border-dark-border rounded-xl text-center">
                    <Clock className="w-4 h-4 text-gold mx-auto mb-1" />
                    <p className="text-sm font-extrabold text-dark-text font-mono">{formatDuration(log.duration)}</p>
                    <p className="text-[9px] text-dark-muted font-bold uppercase tracking-widest mt-0.5">Duration</p>
                  </div>
                  <div className="p-3 bg-dark-bg/60 border border-dark-border rounded-xl text-center">
                    <Zap className="w-4 h-4 text-gold mx-auto mb-1" />
                    <p className={`text-xs font-extrabold uppercase ${log.intent ? '' : 'text-dark-muted'}`}>
                      {log.intent ?? '—'}
                    </p>
                    <p className="text-[9px] text-dark-muted font-bold uppercase tracking-widest mt-0.5">Intent</p>
                  </div>
                  <div className="p-3 bg-dark-bg/60 border border-dark-border rounded-xl text-center">
                    <User className="w-4 h-4 text-gold mx-auto mb-1" />
                    <p className="text-xs font-extrabold text-dark-text">Caller</p>
                    <p className="text-[9px] text-dark-muted font-bold uppercase tracking-widest mt-0.5">Role</p>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="p-3 bg-dark-bg/40 border border-dark-border/60 rounded-lg flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gold flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Call Date & Time</p>
                    <p className="text-xs text-dark-text font-semibold mt-0.5">{dateStr} at {timeStr}</p>
                  </div>
                </div>

                {/* Phone quick-dial */}
                <div className="p-3 bg-dark-bg/40 border border-dark-border/60 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Phone Number</p>
                      <p className="text-sm text-dark-text font-extrabold font-mono mt-0.5">{log.phone}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${log.phone}`}
                    className="px-3 py-1.5 bg-gold/10 border border-gold/25 text-gold text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-gold/20 transition-colors"
                  >
                    Call Back
                  </a>
                </div>

                {/* AI Summary */}
                {log.summary && (
                  <div className="p-4 bg-gold/5 border border-gold/15 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-gold" />
                      <h5 className="text-[10px] text-gold font-bold uppercase tracking-widest">AI Call Summary</h5>
                    </div>
                    <p className="text-xs text-dark-text font-medium leading-relaxed">{log.summary}</p>
                  </div>
                )}

                {/* Transcript */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-3.5 h-3.5 text-gold" />
                    <h5 className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Full Transcript</h5>
                  </div>
                  <div className="bg-dark-bg/80 border border-dark-border rounded-xl p-4 max-h-52 overflow-y-auto font-mono text-xs leading-relaxed text-dark-text whitespace-pre-line shadow-inner select-text">
                    {log.transcript.trim() ? log.transcript : 'No dialogue recorded.'}
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
