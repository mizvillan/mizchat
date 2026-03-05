import React from 'react';
import { MessageSquare } from 'lucide-react';

export const ServerRail: React.FC = () => {
  return (
    <div className="w-[72px] bg-slate-950/80 backdrop-blur-xl flex flex-col items-center py-3 gap-2 border-r border-white/5 flex-shrink-0 hidden md:flex">
      {/* Home / DM Button */}
      <div className="relative group">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full -ml-1 opacity-0 group-hover:opacity-100 transition-all duration-200" />
        <button className="w-12 h-12 bg-blue-500 group-hover:bg-blue-400 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-white overflow-hidden shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
          <span className="text-lg font-bold">M</span>
        </button>
      </div>

      <div className="w-8 h-[2px] bg-white/10 rounded-lg mx-auto" />

      {/* Server 1 (MIZCHAT Main) */}
      <div className="relative group">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r-full -ml-1 transition-all duration-200" />
        <button className="w-12 h-12 bg-indigo-500 rounded-[16px] transition-all duration-200 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {/* Add Server Placeholder */}
      <div className="relative group">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2 bg-white rounded-r-full -ml-1 opacity-0 group-hover:opacity-100 group-hover:h-5 transition-all duration-200" />
        <button className="w-12 h-12 bg-white/5 group-hover:bg-green-600 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-green-500 group-hover:text-white">
          <span className="text-2xl font-light">+</span>
        </button>
      </div>

      
    </div>
  );
};
