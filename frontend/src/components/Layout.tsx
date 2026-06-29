import React from 'react';
import { PhoneCall, Calendar, History, MailOpen, Scissors } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasActiveCall: boolean;
}

export default function Layout({ children, activeTab, setActiveTab, hasActiveCall }: LayoutProps) {
  const menuItems = [
    { id: 'live', label: 'Live Receptionist', icon: PhoneCall, indicator: hasActiveCall },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'history', label: 'Call History', icon: History },
    { id: 'messages', label: 'Callback Messages', icon: MailOpen },
  ];

  return (
    <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-dark-card border-r border-dark-border flex flex-col justify-between z-10">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-6 py-8 border-b border-dark-border/40">
            <div className="p-2 bg-gold/15 rounded-lg border border-gold/30">
              <Scissors className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wide text-gradient font-sans">Receptra</h1>
              <p className="text-[10px] text-dark-muted font-semibold tracking-widest uppercase">StyleCraft Barber</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gold text-dark-bg font-semibold shadow-lg shadow-gold/10'
                      : 'text-dark-muted hover:bg-dark-border/40 hover:text-dark-text'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-dark-bg' : 'text-gold'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.indicator && (
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="px-6 py-6 border-t border-dark-border/40 text-[11px] text-dark-muted space-y-1">
          <p>© 2026 StyleCraft Barber</p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></span>
            <span>Receptionist Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 bg-dark-bg relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-dark-border/40 flex items-center justify-between px-8 bg-dark-card/30 backdrop-blur-md z-10">
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase text-dark-muted">
              {menuItems.find((m) => m.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-dark-muted bg-dark-card border border-dark-border px-4 py-2 rounded-lg">
            <span>Hours: 9:00 AM – 8:00 PM</span>
            <span className="w-1.5 h-1.5 bg-gold rounded-full"></span>
            <span>Timezone: Asia/Kolkata</span>
          </div>
        </header>

        {/* Dynamic Panel Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <div key={activeTab} className="animate-tab-entry h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
