import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { User } from '../types';

interface MembersPanelProps {
  isMobileOpen: boolean;
}

export const MembersPanel: React.FC<MembersPanelProps> = ({ isMobileOpen }) => {
  const { socket } = useSocket();
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const selectedInitial = (selectedUser?.display_name || selectedUser?.username || 'M').trim().charAt(0).toUpperCase();
  const selectedAvatar =
    selectedUser?.avatar && !selectedUser.avatar.includes('ui-avatars.com')
      ? selectedUser.avatar
      : `https://ui-avatars.com/api/?name=${selectedInitial}&background=3b82f6&color=ffffff&size=256`;
  const statusColor = (status?: string) => {
    if (status === 'online') return 'bg-green-500';
    if (status === 'idle') return 'bg-yellow-400';
    if (status === 'dnd') return 'bg-red-500';
    if (status === 'invisible') return 'bg-zinc-500';
    return 'bg-zinc-600';
  };
  const statusLabel = (status?: string) => {
    if (status === 'online') return 'Online';
    if (status === 'idle') return 'Idle';
    if (status === 'dnd') return 'Do Not Disturb';
    if (status === 'invisible') return 'Invisible';
    return 'Offline';
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('active_users', (users: User[]) => {
      // Dedupe
      const unique = Array.from(new Map(users.map(u => [u.id, u])).values());
      setActiveUsers(unique);
    });

    socket.on('presence_global', () => {
      socket.emit('get_active_users');
    });

    socket.on('user_updated', () => {
      socket.emit('get_active_users');
    });

    socket.emit('get_active_users');

    return () => {
      socket.off('active_users');
      socket.off('presence_global');
      socket.off('user_updated');
    };
  }, [socket]);

  return (
    <>
      <div className={`fixed inset-y-0 right-0 z-40 w-64 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : 'translate-x-full'} lg:relative lg:translate-x-0 flex flex-col panel lg:mr-3 lg:my-4 lg:rounded-2xl`}>
        <div className="h-12 panel-header flex items-center px-4 font-bold text-zinc-400 text-xs uppercase tracking-wider shadow-sm rounded-t-2xl">
          Active Now — {activeUsers.length}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {activeUsers.map(user => (
            <button 
              key={user.id} 
              onClick={() => setSelectedUser(user)}
              className="w-full flex items-center gap-3 p-2 rounded-[8px] hover:bg-white/5 transition-colors group text-left opacity-90 hover:opacity-100"
            >
              <div className="relative">
                <img 
                  src={(user.avatar && !user.avatar.includes('ui-avatars.com')) ? user.avatar : `https://ui-avatars.com/api/?name=${(user.display_name || user.username || 'M').trim().charAt(0).toUpperCase()}&background=3b82f6&color=ffffff&size=128`} 
                  className="w-8 h-8 rounded-full object-cover" 
                  alt="" 
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-zinc-800 rounded-full flex items-center justify-center">
                    <div className={`w-2 h-2 rounded-full ${statusColor(user.status)}`}></div>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-zinc-200 group-hover:text-white truncate">
                  {user.display_name}
                </div>
                {user.bio && (
                  <div className="text-[11px] text-zinc-500 truncate max-w-[140px]">{user.bio}</div>
                )}
                {!user.bio && (
                  <div className="text-[11px] text-zinc-500 truncate max-w-[140px]">{statusLabel(user.status)}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-slate-900/95 w-full max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Banner */}
            <div className="h-24 bg-gradient-to-r from-indigo-500/80 via-purple-500/70 to-fuchsia-500/70"></div>
            
            <div className="px-6 pb-6 pt-10 relative">
              {/* Avatar */}
              <div className="absolute -top-12 left-6 p-1 bg-slate-950 rounded-full shadow-lg">
                <img 
                  src={selectedAvatar} 
                  className="w-20 h-20 rounded-full object-cover border-4 border-slate-950" 
                  alt="" 
                />
                <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-zinc-900 ${statusColor(selectedUser.status)}`}></div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      {selectedUser.display_name}
                      {selectedUser.is_admin === 1 && (
                        <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Owner</span>
                      )}
                    </h2>
                    <p className="text-zinc-400 text-sm font-mono">@{selectedUser.username}</p>
                  </div>
                  <span className="text-[11px] text-zinc-500 uppercase tracking-widest">{statusLabel(selectedUser.status)}</span>
                </div>
                
                <div className="mt-4 bg-zinc-950/50 rounded-lg p-3 border border-zinc-800">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Bio</h3>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedUser.bio || "No bio yet."}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500 uppercase font-bold tracking-wider">
                  Member Since
                  <div className="text-zinc-300 normal-case font-normal mt-0.5">
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
