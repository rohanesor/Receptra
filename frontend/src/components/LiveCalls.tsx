import { useRef, useEffect } from 'react';
import { Phone, User, Bot, Volume2 } from 'lucide-react';

export interface TranscriptLine {
  speaker: 'customer' | 'agent';
  text: string;
}

export interface ActiveCallState {
  callSid: string;
  customerPhone: string;
  startTime: Date;
  transcript: TranscriptLine[];
  durationSeconds: number;
}

interface LiveCallsProps {
  activeCall: ActiveCallState | null;
}

export default function LiveCalls({ activeCall }: LiveCallsProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCall?.transcript]);

  // Helper to format call durations (e.g. 01:23)
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!activeCall) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center glass-card relative overflow-hidden border border-dashed border-dark-border/80">
        {/* Animated Radar Pulse */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <span className="h-44 w-44 rounded-full border border-gold/20 animate-ping absolute duration-1000"></span>
          <span className="h-28 w-28 rounded-full border border-gold/10 animate-ping absolute duration-700"></span>
        </div>

        <div className="p-4 bg-gold/10 rounded-full border border-gold/20 mb-4 z-10 animate-pulse">
          <Phone className="w-10 h-10 text-gold" />
        </div>
        <h3 className="text-lg font-bold tracking-wide text-gradient z-10 font-sans">Awaiting Customer Call</h3>
        <p className="text-xs text-dark-muted mt-1 z-10 max-w-xs text-center font-medium">
          The AI Receptionist is active and listening. When a call connects to StyleCraft Barber, the live transcript will stream here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)]">
      {/* Call Details Panel */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold rounded-full uppercase tracking-wider">
              <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
              Live Call
            </span>
            <span className="text-xl font-bold font-sans text-gold">
              {formatDuration(activeCall.durationSeconds)}
            </span>
          </div>

          <div className="space-y-4 pt-2 border-t border-dark-border/40">
            <div>
              <p className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Customer Phone</p>
              <p className="text-lg font-bold text-dark-text tracking-wide mt-0.5">{activeCall.customerPhone}</p>
            </div>
            <div>
              <p className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Call SID</p>
              <p className="text-xs font-mono text-dark-muted mt-1 bg-dark-bg/60 p-2 rounded-lg border border-dark-border select-all">
                {activeCall.callSid}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Pipeline Node</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-1 bg-dark-bg border border-dark-border text-[10px] font-bold rounded text-gold">STT: Deepgram</span>
                <span className="px-2.5 py-1 bg-dark-bg border border-dark-border text-[10px] font-bold rounded text-gold">LLM: Claude</span>
                <span className="px-2.5 py-1 bg-dark-bg border border-dark-border text-[10px] font-bold rounded text-gold">TTS: ElevenLabs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 flex-1 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm tracking-wide text-gradient font-sans">Active Receptionist Status</h4>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">
              Claude is analyzing intent, check availability, and booking appointments. The stream auto-interrupts if the customer speaks over the bot.
            </p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gold/5 border border-gold/15 rounded-lg">
            <Volume2 className="w-5 h-5 text-gold animate-bounce" />
            <span className="text-[11px] text-gold font-semibold uppercase tracking-wider">Streaming audio bidirectionally</span>
          </div>
        </div>
      </div>

      {/* Real-time Transcript Stream */}
      <div className="lg:col-span-2 glass-card flex flex-col h-full overflow-hidden">
        {/* Panel Header */}
        <div className="px-6 py-4 border-b border-dark-border/40 flex items-center justify-between bg-dark-card/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-dark-muted">Rolling Conversation Transcript</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">Syncing via WebSockets</span>
          </div>
        </div>

        {/* Scrollable Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-dark-bg/25">
          {activeCall.transcript.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gold">
                <div className="flex items-center gap-1.5">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
                <p className="text-xs text-dark-muted font-medium">Receptionist is listening...</p>
              </div>
            </div>
          ) : (
            activeCall.transcript.map((line, idx) => {
              const isAgent = line.speaker === 'agent';
              return (
                <div
                  key={idx}
                  className={`flex gap-4 max-w-xl animate-stagger-card ${isAgent ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
                      isAgent
                        ? 'bg-gold/10 border-gold/25 text-gold'
                        : 'bg-dark-border/60 border-dark-border text-dark-muted'
                    }`}
                  >
                    {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Speech Balloon */}
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isAgent
                        ? 'bg-dark-card border border-dark-border/60 text-dark-text rounded-tl-none'
                        : 'bg-gold/10 border border-gold/20 text-gold-light rounded-tr-none'
                    }`}
                  >
                    <p className="font-sans font-medium">{line.text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
}
