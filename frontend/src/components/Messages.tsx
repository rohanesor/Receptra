import { useState, useEffect } from 'react';
import { getMessages } from '../services/api.js';
import type { Message } from '../services/api.js';
import { Mail, Phone, Calendar, RefreshCw, CheckCircle } from 'lucide-react';

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state to simulate resolving messages
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

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

  const handleResolve = (id: string) => {
    const next = new Set(resolvedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setResolvedIds(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-dark-muted">Customer Callback Messages</h3>
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

      {loading && messages.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-dark-muted font-medium">
          Loading callback requests...
        </div>
      ) : messages.length === 0 ? (
        <div className="glass-card p-12 text-center text-dark-muted text-xs font-medium border-dashed border-dark-border">
          No callback messages left.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {messages.map((msg) => {
            const isResolved = resolvedIds.has(msg.id);
            const dateStr = new Date(msg.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`glass-card p-6 flex flex-col justify-between border-t-4 transition-all duration-300 ${
                  isResolved 
                    ? 'border-t-dark-border opacity-50 bg-dark-card/30' 
                    : 'border-t-gold/70 hover:border-t-gold'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex items-center gap-1.5 text-xs text-dark-muted font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-gold/80" />
                      {dateStr} at {timeStr}
                    </span>
                    <button
                      onClick={() => handleResolve(msg.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isResolved
                          ? 'bg-green-500/10 border-green-500/20 text-green-400'
                          : 'bg-dark-bg/60 border-dark-border text-dark-muted hover:text-gold hover:border-gold/30'
                      }`}
                      title={isResolved ? "Mark Unresolved" : "Mark Resolved"}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm tracking-wide text-dark-text">{msg.customerName}</h4>
                    <p className="text-xs text-dark-muted font-semibold">{msg.customerPhone}</p>
                  </div>

                  <div className="mt-4 p-3.5 bg-dark-bg/50 border border-dark-border rounded-lg">
                    <div className="flex items-start gap-2">
                      <Mail className="w-3.5 h-3.5 text-gold flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-dark-text font-medium leading-relaxed italic">
                        "{msg.reason}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-dark-border/40 flex justify-end">
                  <a
                    href={`tel:${msg.customerPhone}`}
                    className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-gold hover:text-gold-light transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Back</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
