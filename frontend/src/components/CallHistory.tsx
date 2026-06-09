import { useState, useEffect } from 'react';
import { getCallLogs } from '../services/api.js';
import type { CallLog } from '../services/api.js';
import { Phone, Clock, Calendar, ChevronDown, ChevronUp, RefreshCw, MessageSquare } from 'lucide-react';

export default function CallHistory() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track expanded cards
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

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

  const toggleExpand = (id: string) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(id);
    }
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

  return (
    <div className="space-y-6">
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

      {loading && logs.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-dark-muted font-medium">
          Loading audit logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card p-12 text-center text-dark-muted text-xs font-medium border-dashed border-dark-border">
          No previous calls recorded.
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const dateStr = new Date(log.timestamp).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={log.id}
                className="glass-card overflow-hidden hover:border-dark-border transition-all duration-200"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-dark-card/30"
                >
                  <div className="flex items-center gap-6">
                    <div className="p-2.5 bg-dark-border/40 rounded-lg border border-dark-border text-gold">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm tracking-wide text-dark-text">{log.phone}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-dark-muted font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gold/80" />
                          {dateStr} at {timeStr}
                        </span>
                        <span className="w-1 h-1 bg-dark-border rounded-full"></span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gold/80" />
                          {formatDuration(log.duration)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Intent Tag */}
                    {log.intent && (
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getIntentStyle(log.intent)}`}>
                        {log.intent}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-dark-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-dark-muted" />
                    )}
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="border-t border-dark-border/40 bg-dark-bg/15 p-6 space-y-4">
                    {log.summary && (
                      <div className="p-4 bg-gold/5 border border-gold/15 rounded-lg">
                        <h5 className="text-[10px] text-gold font-bold uppercase tracking-widest mb-1">AI Call Summary</h5>
                        <p className="text-xs text-dark-text font-medium leading-relaxed">{log.summary}</p>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-3.5 h-3.5 text-gold" />
                        <h5 className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Call Transcript</h5>
                      </div>
                      <div className="bg-dark-bg/80 border border-dark-border rounded-lg p-4 max-h-60 overflow-y-auto font-mono text-xs leading-relaxed text-dark-text whitespace-pre-line shadow-inner select-text">
                        {log.transcript.trim() ? log.transcript : 'No dialogue recorded.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
