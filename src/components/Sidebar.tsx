import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Channel, Friend, Group, User as UserType } from '../types';
import { Hash, Volume2, User, Users, Plus, X, Check, MessageSquare } from 'lucide-react';
import { ProfileModal } from './Modals/ProfileModal';

interface SidebarProps {
  currentChannel: Channel | null;
  setCurrentChannel: (channel: Channel) => void;
  currentGroup: Group | null;
  setCurrentGroup: (group: Group | null) => void;
  isMobileOpen: boolean;
  closeMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentChannel, setCurrentChannel, currentGroup, setCurrentGroup, isMobileOpen, closeMobile }) => {
  const { socket } = useSocket();
  const { user, updateUser } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [friendError, setFriendError] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const userInitial = (user?.display_name || user?.username || 'M').trim().charAt(0).toUpperCase();
  const userAvatar =
    user?.avatar && !user.avatar.includes('ui-avatars.com')
      ? user.avatar
      : `https://ui-avatars.com/api/?name=${userInitial}&background=3b82f6&color=ffffff&size=128`;
  const status = (user?.status || 'online') as 'online' | 'idle' | 'dnd' | 'invisible' | 'offline';
  const statusColor =
    status === 'online' ? 'bg-green-500' :
    status === 'idle' ? 'bg-yellow-400' :
    status === 'dnd' ? 'bg-red-500' :
    status === 'invisible' ? 'bg-zinc-500' : 'bg-zinc-600';
  const presenceColor = (presence?: string) => {
    if (presence === 'online') return 'bg-green-500';
    if (presence === 'idle') return 'bg-yellow-400';
    if (presence === 'dnd') return 'bg-red-500';
    if (presence === 'invisible') return 'bg-zinc-500';
    return 'bg-zinc-600';
  };
  const presenceLabel = (presence?: string) => {
    if (presence === 'online') return 'Online';
    if (presence === 'idle') return 'Idle';
    if (presence === 'dnd') return 'Do Not Disturb';
    if (presence === 'invisible') return 'Invisible';
    return 'Offline';
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('channels_list', (list: Channel[]) => {
      // Only show the main general channel in the sidebar
      const filtered = list.filter(
        (ch) => ch.name.toLowerCase() === 'general'
      );
      const finalList = filtered.length > 0 ? filtered : list;

      setChannels(finalList);
      if (!currentChannel && finalList.length > 0) {
        setCurrentChannel(finalList[0]);
      }
    });

    socket.on('friends_list', (list: Friend[]) => {
      setFriends(list.filter(f => f.status === 'accepted'));
      setFriendRequests(list.filter(f => f.status === 'pending' && f.requester_id !== user?.id));
    });

    socket.on('friend_request_received', () => {
      socket.emit('get_friends');
      setShowFriendsModal(true);
    });

    socket.on('friend_request_accepted', () => {
      socket.emit('get_friends');
    });

    socket.on('friend_error', (err: string) => {
      setFriendError(err);
    });
    
    socket.on('friend_request_sent', () => {
        setFriendError('');
        setFriendUsername('');
        alert('Friend request sent!');
    });

    socket.on('groups_list', ({ groups: list }: { groups: Group[] }) => {
      setGroups(list || []);
    });

    socket.on('profile_updated', (updated: UserType) => {
      if (updated?.id === user?.id) {
        updateUser(updated);
      }
    });

    socket.on('user_updated', (updated: UserType) => {
      if (updated?.id === user?.id) {
        updateUser(updated);
      }
      setFriends(prev => prev.map(f => f.id === updated.id ? { ...f, avatar: updated.avatar, display_name: updated.display_name, presence: updated.status } : f));
    });

    socket.emit('get_friends');
    socket.emit('groups_get');

    return () => {
      socket.off('channels_list');
      socket.off('friends_list');
      socket.off('friend_request_received');
      socket.off('friend_request_accepted');
      socket.off('friend_error');
      socket.off('friend_request_sent');
      socket.off('groups_list');
      socket.off('profile_updated');
      socket.off('user_updated');
    };
  }, [socket, user, currentChannel]);

  const handleAddFriend = () => {
    if (!friendUsername.trim()) return;
    socket?.emit('friend_request_send', { targetUsername: friendUsername });
  };

  const handleAccept = (id: string) => {
    socket?.emit('friend_request_accept', { requestId: id });
  };

  const handleDecline = (id: string) => {
    socket?.emit('friend_request_decline', { requestId: id });
  };

  const handleCreateGroup = () => {
    const name = groupName.trim();
    if (!name) return;
    socket?.emit('group_create', { name, memberIds: groupMembers });
    setGroupName('');
    setGroupMembers([]);
    setShowGroupModal(false);
  };

  return (
    <>
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col panel md:ml-3 md:my-4 md:rounded-2xl`}>
        {/* Server Header (Top of Channel List) */}
        <div className="h-12 panel-header flex items-center px-4 font-bold text-base text-white shadow-sm hover:bg-white/5 transition-colors cursor-pointer rounded-t-2xl md:rounded-t-2xl">
          Your Server
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 custom-scrollbar">
          {/* Text Channels */}
          <div className="px-2">
            <div className="px-2 text-[11px] font-bold text-zinc-400 uppercase mb-1 hover:text-zinc-300 cursor-pointer flex items-center justify-between group">
              <span>Text Channels</span>
            </div>
            <div className="space-y-[1px]">
              {channels.length === 0 && (
                <button
                  className="w-full flex items-center px-2 py-[6px] rounded-[6px] group transition-all text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                >
                  <Hash className="w-4 h-4 mr-1.5 text-zinc-500" />
                  <span className="truncate font-medium">general</span>
                </button>
              )}
              {channels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => {
                    setCurrentChannel(channel);
                    setCurrentGroup(null);
                    closeMobile();
                  }}
                  className={`w-full flex items-center px-2 py-[6px] rounded-[6px] group transition-all ${currentChannel?.id === channel.id ? 'bg-indigo-500/15 text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                >
                  <Hash className="w-4 h-4 mr-1.5 text-zinc-500" />
                  <span className="truncate font-medium">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div className="px-2">
            <div className="px-2 text-[11px] font-bold text-zinc-400 uppercase mb-1 flex justify-between items-center group cursor-pointer hover:text-zinc-300">
              <span>Direct Messages</span>
              <button onClick={(e) => { e.stopPropagation(); setShowFriendsModal(true); }} className="text-zinc-400 hover:text-white">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-[2px]">
              {friends.map(friend => (
                <button
                  key={friend.id}
                  className="w-full flex items-center px-2 py-[6px] rounded-[6px] group transition-all text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                >
                  <div className="relative mr-2">
                    <img src={(friend.avatar && !friend.avatar.includes('ui-avatars.com')) ? friend.avatar : `https://ui-avatars.com/api/?name=${(friend.display_name || friend.username || 'M').trim().charAt(0).toUpperCase()}&background=3b82f6&color=ffffff&size=128`} className="w-6 h-6 rounded-full" alt="" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-zinc-900 rounded-full flex items-center justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${presenceColor(friend.presence)}`}></div>
                    </div>
                  </div>
                  <span className="truncate font-medium">{friend.display_name}</span>
                </button>
              ))}
              {friends.length === 0 && (
                <div className="px-2 text-xs text-zinc-500 italic py-1">No friends yet</div>
              )}
            </div>
          </div>

          {/* Groups */}
          <div className="px-2">
            <div className="px-2 text-[11px] font-bold text-zinc-400 uppercase mb-1 flex justify-between items-center group cursor-pointer hover:text-zinc-300">
              <span>Groups</span>
              <button onClick={(e) => { e.stopPropagation(); setShowGroupModal(true); }} className="text-zinc-400 hover:text-white">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-[2px]">
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => {
                    setCurrentGroup(group);
                    setCurrentChannel(null);
                    closeMobile();
                  }}
                  className={`w-full flex items-center px-2 py-[6px] rounded-[6px] group transition-all ${currentGroup?.id === group.id ? 'bg-indigo-500/15 text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                >
                  <Users className="w-4 h-4 mr-1.5 text-zinc-500" />
                  <span className="truncate font-medium">{group.name}</span>
                </button>
              ))}
              {groups.length === 0 && (
                <div className="px-2 text-xs text-zinc-500 italic py-1">No groups joined</div>
              )}
            </div>
          </div>
        </div>

        {/* User User Bar */}
        <div className="h-[56px] bg-slate-900/80 flex items-center px-2 border-t border-white/5 rounded-b-2xl md:rounded-b-2xl relative">
          <div 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center hover:bg-white/5 p-1 rounded-md cursor-pointer flex-1 min-w-0 transition-colors group"
          >
            <div className="relative mr-2">
               <img src={userAvatar} className="w-8 h-8 rounded-full object-cover" alt="" />
               <button
                 type="button"
                 onClick={(e) => { e.stopPropagation(); setShowStatusMenu((v) => !v); }}
                 className="absolute bottom-0 right-0 w-3 h-3 bg-zinc-900 rounded-full flex items-center justify-center"
                 title="Change status"
               >
                   <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
               </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate leading-tight">{user?.display_name}</div>
              <div className="text-[11px] text-zinc-400 truncate leading-tight">#{user?.username}</div>
            </div>
          </div>
          {showStatusMenu && (
            <div className="absolute bottom-14 left-2 bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 min-w-[180px]">
              {[
                { key: 'online', label: 'Online', color: 'bg-green-500' },
                { key: 'idle', label: 'Idle', color: 'bg-yellow-400' },
                { key: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500' },
                { key: 'invisible', label: 'Invisible', color: 'bg-zinc-500' }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => {
                    socket?.emit('set_status', { status: item.key });
                    updateUser({ status: item.key as any });
                    setShowStatusMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
                >
                  <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}

      {/* Friends Modal */}
      {showFriendsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900/95 w-full max-w-md rounded-xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Friends</h2>
              <button onClick={() => setShowFriendsModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-6">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Add Friend</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={friendUsername}
                    onChange={(e) => setFriendUsername(e.target.value)}
                    placeholder="Enter username"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddFriend}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    Send
                  </button>
                </div>
                {friendError && <p className="text-red-400 text-xs mt-2">{friendError}</p>}
                <p className="text-zinc-500 text-xs mt-2">Your username: <span className="text-white font-mono">{user?.username}</span></p>
              </div>

              {friendRequests.length > 0 && (
                <div className="mb-6">
                  <div className="text-xs font-bold text-zinc-400 uppercase mb-2">Pending Requests</div>
                  <div className="space-y-2">
                    {friendRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-md">
                        <div className="flex items-center gap-2">
                          <img src={(req.avatar && !req.avatar.includes('ui-avatars.com')) ? req.avatar : `https://ui-avatars.com/api/?name=${(req.display_name || req.username || 'M').trim().charAt(0).toUpperCase()}&background=3b82f6&color=ffffff&size=128`} className="w-8 h-8 rounded-full" />
                          <div>
                            <div className="text-sm font-medium text-white">{req.display_name}</div>
                            <div className="text-xs text-zinc-400">{req.username}</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleAccept(req.requester_id)} className="p-1.5 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDecline(req.requester_id)} className="p-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-zinc-400 uppercase mb-2">All Friends</div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {friends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded-md group">
                      <div className="flex items-center gap-2">
                        <img src={(friend.avatar && !friend.avatar.includes('ui-avatars.com')) ? friend.avatar : `https://ui-avatars.com/api/?name=${(friend.display_name || friend.username || 'M').trim().charAt(0).toUpperCase()}&background=3b82f6&color=ffffff&size=128`} className="w-8 h-8 rounded-full" />
                        <div>
                          <div className="text-sm font-medium text-white">{friend.display_name}</div>
                          <div className="text-xs text-zinc-400">{presenceLabel(friend.presence)}</div>
                        </div>
                      </div>
                      <button className="p-1.5 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {friends.length === 0 && <p className="text-zinc-500 text-sm italic">No friends added yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900/95 w-full max-w-md rounded-xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Create Group</h2>
              <button onClick={() => setShowGroupModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Squad"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Add Friends</label>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {friends.map(friend => {
                    const checked = groupMembers.includes(friend.id);
                    return (
                      <label key={friend.id} className="flex items-center gap-3 bg-zinc-900/40 p-2 rounded-md cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setGroupMembers(prev =>
                              e.target.checked
                                ? [...prev, friend.id]
                                : prev.filter(id => id !== friend.id)
                            );
                          }}
                        />
                        <img
                          src={(friend.avatar && !friend.avatar.includes('ui-avatars.com')) ? friend.avatar : `https://ui-avatars.com/api/?name=${(friend.display_name || friend.username || 'M').trim().charAt(0).toUpperCase()}&background=3b82f6&color=ffffff&size=128`}
                          className="w-7 h-7 rounded-full"
                          alt=""
                        />
                        <span className="text-sm text-zinc-200">{friend.display_name}</span>
                      </label>
                    );
                  })}
                  {friends.length === 0 && <div className="text-xs text-zinc-500 italic">Add friends to create a group.</div>}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowGroupModal(false)} className="px-4 py-2 text-sm text-zinc-300 hover:text-white">Cancel</button>
                <button onClick={handleCreateGroup} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
