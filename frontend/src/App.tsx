import { useState, useEffect } from 'react';
import Layout from './components/Layout.js';
import LiveCalls from './components/LiveCalls.js';
import type { ActiveCallState, TranscriptLine } from './components/LiveCalls.js';
import Appointments from './components/Appointments.js';
import CallHistory from './components/CallHistory.js';
import Messages from './components/Messages.js';
import { connectLiveCalls } from './services/websocket.js';
import type { WSMessage } from './services/websocket.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('live');
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);

  // WebSocket Live Sync
  useEffect(() => {
    const disconnect = connectLiveCalls((msg: WSMessage) => {
      const { event, payload } = msg;

      if (event === 'call_started') {
        setActiveCall({
          callSid: payload.callSid,
          customerPhone: payload.customerPhone,
          startTime: new Date(payload.timestamp),
          transcript: [],
          durationSeconds: 0,
        });
        // Switch tab to live if a call comes in
        setActiveTab('live');
      } else if (event === 'transcript_update') {
        setActiveCall((prev) => {
          if (!prev || prev.callSid !== payload.callSid) return prev;
          
          const newline: TranscriptLine = {
            speaker: payload.speaker,
            text: payload.text,
          };
          
          return {
            ...prev,
            transcript: [...prev.transcript, newline],
          };
        });
      } else if (event === 'call_ended') {
        setActiveCall(null);
      }
    });

    return () => {
      disconnect();
    };
  }, []);

  // Call Duration Timer Tick
  useEffect(() => {
    if (!activeCall) return;

    const timer = setInterval(() => {
      setActiveCall((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          durationSeconds: prev.durationSeconds + 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCall !== null]);

  // Tab rendering router
  const renderContent = () => {
    switch (activeTab) {
      case 'live':
        return <LiveCalls activeCall={activeCall} />;
      case 'appointments':
        return <Appointments />;
      case 'history':
        return <CallHistory />;
      case 'messages':
        return <Messages />;
      default:
        return <LiveCalls activeCall={activeCall} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      hasActiveCall={activeCall !== null}
    >
      {renderContent()}
    </Layout>
  );
}
