import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { X, Camera } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const { socket } = useSocket();
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const initial = (user?.display_name || user?.username || 'M').trim().charAt(0).toUpperCase();
  const resolvedAvatar =
    avatar && !avatar.includes('ui-avatars.com')
      ? avatar
      : `https://ui-avatars.com/api/?name=${initial}&background=3b82f6&color=ffffff&size=256`;

  const handleSave = async () => {
    let newAvatar = avatar;

    if (file) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        newAvatar = data.url;
      } catch (err) {
        console.error('Upload failed', err);
        setUploading(false);
        return;
      }
    }

    socket?.emit('update_profile', { bio, avatar: newAvatar });
    updateUser({ bio, avatar: newAvatar });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-indigo-500/80 via-purple-500/70 to-fuchsia-500/70 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-14 relative">
          <div className="absolute -top-12 left-6 group cursor-pointer">
            <div className="relative w-24 h-24 rounded-full border-4 border-slate-950 overflow-hidden bg-white/5 shadow-lg">
              <img 
                src={file ? URL.createObjectURL(file) : resolvedAvatar} 
                className="w-full h-full object-cover" 
                alt="" 
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                accept="image/*"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{user?.display_name}</h2>
              <p className="text-zinc-400 text-sm">@{user?.username}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">About Me</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500 min-h-[100px] resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-zinc-400 hover:text-white hover:underline"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={uploading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
