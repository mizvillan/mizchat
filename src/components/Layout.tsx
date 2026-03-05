import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { MembersPanel } from './MembersPanel';
import { ServerRail } from './ServerRail';
import { LoginModal } from './Modals/LoginModal';
import { Channel, Group } from '../types';
import { Menu, Users } from 'lucide-react';

export const Layout = () => {
  const { user, loading } = useAuth();
  const { connected } = useSocket();
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  if (loading) {
    return (
      <div className="app-bg flex flex-col items-center justify-center h-screen text-white relative overflow-hidden">
        <div className="z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-indigo-500 rounded-2xl animate-float-slow mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/50">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-400/40 border-t-indigo-400 animate-spin" />
              <h1 className="text-xl font-bold tracking-wide text-glow">Connecting to MIZCHAT...</h1>
            </div>
            <p className="text-zinc-400 text-[10px] mt-4 font-mono tracking-widest opacity-60">MIZCHAT</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  return (
    <div className="app-bg flex h-screen text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-slate-900/90 border-b border-white/5 flex items-center px-4 justify-between z-30 shadow-sm backdrop-blur">
        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="text-zinc-400">
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-white tracking-tight">MIZCHAT</span>
        <button onClick={() => setIsMembersOpen(!isMembersOpen)} className="text-zinc-400">
          <Users className="w-6 h-6" />
        </button>
      </div>

      {/* Desktop Layout: [ServerRail] [Sidebar] [ChatArea] [MembersPanel] */}
      
      {/* 1. Server Rail (Desktop Only) */}
      <ServerRail />

      {/* 2. Sidebar (Channels/DMs) */}
      <Sidebar 
        currentChannel={currentChannel} 
        setCurrentChannel={setCurrentChannel} 
        currentGroup={currentGroup}
        setCurrentGroup={setCurrentGroup}
        isMobileOpen={isMobileOpen}
        closeMobile={() => setIsMobileOpen(false)}
      />

      {/* 3. Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col min-w-0 pt-12 md:pt-0 relative">
        <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-3 md:p-4">
          <ChatArea channel={currentChannel} group={currentGroup} />
        </div>
      </div>

      {/* 4. Members Panel */}
      <div className={`fixed inset-y-0 right-0 z-20 w-64 transform transition-transform duration-300 ease-in-out ${isMembersOpen ? 'translate-x-0' : 'translate-x-full'} lg:relative lg:translate-x-0 lg:block`}>
        <MembersPanel isMobileOpen={isMembersOpen} />
      </div>

      {/* Mobile Overlay */}
      {(isMobileOpen || isMembersOpen) && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-[1px] z-10 md:hidden"
          onClick={() => {
            setIsMobileOpen(false);
            setIsMembersOpen(false);
          }}
        />
      )}
    </div>
  );
};
