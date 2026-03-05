import React, { useState } from 'react';
import { Message as MessageType } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Edit2, Trash2, Reply, MoreHorizontal, ShieldAlert } from 'lucide-react';

interface MessageProps {
  message: MessageType;
  onReply: (message: MessageType) => void;
  onEdit: (id: string, newContent: string) => void;
  onDelete: (id: string) => void;
  isGroupAdmin?: boolean; // For future group chat features
}

export const Message: React.FC<MessageProps> = ({ message, onReply, onEdit, onDelete, isGroupAdmin }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const avatarInitial = (message.display_name || message.username || 'M').trim().charAt(0).toUpperCase();
  const resolvedAvatar =
    message.avatar && !message.avatar.includes('ui-avatars.com')
      ? message.avatar
      : `https://ui-avatars.com/api/?name=${avatarInitial}&background=3b82f6&color=ffffff&size=128`;

  const isOwner = user?.id === message.user_id;
  const isAdmin = user?.is_admin === 1;
  const canEdit = isOwner || isAdmin;
  const canDelete = isOwner || isAdmin;

  const handleSaveEdit = () => {
    if (editContent.trim() !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  return (
    <div 
      className={`group flex gap-4 py-2 px-4 rounded-xl hover:bg-white/5 transition-colors relative animate-fade-up ${isEditing ? 'bg-white/5' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 cursor-pointer mt-0.5">
        <img 
          src={resolvedAvatar} 
          alt={message.username} 
          className="w-9 h-9 rounded-full object-cover hover:opacity-80 transition-opacity"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-zinc-100 hover:underline cursor-pointer">
            {message.display_name}
          </span>
          {message.is_admin === 1 && (
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-0.5">
              <ShieldAlert className="w-3 h-3" /> Owner
            </span>
          )}
          <span className="text-xs text-zinc-500 ml-1">
            {format(new Date(message.created_at), 'hh:mm a')}
          </span>
        </div>

        {/* Reply Context */}
        {message.reply_to_id && (
          <div className="flex items-center gap-1 mb-1 text-xs text-zinc-500">
            <div className="w-8 border-t-2 border-l-2 border-zinc-700 h-2 rounded-tl-md mr-1"></div>
            <span className="italic">Replying to a message</span>
          </div>
        )}

        {/* Message Body */}
        {isEditing ? (
          <div className="mt-1">
            <div className="bg-white/5 border border-white/5 rounded-md p-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-zinc-200 focus:outline-none resize-none text-sm"
                rows={2}
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="text-zinc-400">escape to cancel • enter to save</span>
              <button onClick={handleSaveEdit} className="text-indigo-400 hover:underline ml-auto">Save</button>
            </div>
          </div>
        ) : (
          <div className="text-zinc-300 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
            {message.is_edited === 1 && (
              <span className="text-[10px] text-zinc-500 ml-1 select-none">(edited)</span>
            )}
          </div>
        )}

        {/* Attachments */}
        {message.attachment_url && (
          <div className="mt-2">
            {message.type === 'image' ? (
              <img 
                src={message.attachment_url} 
                alt="Attachment" 
                className="max-w-[520px] max-h-96 rounded-lg border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
                onClick={() => window.open(message.attachment_url, '_blank')}
              />
            ) : message.type === 'voice' ? (
              <audio controls src={message.attachment_url} className="w-full max-w-md mt-1" />
            ) : (
              <a 
                href={message.attachment_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/5 border border-white/5 p-3 rounded-md max-w-xs hover:bg-white/10 transition-colors"
              >
                <div className="bg-zinc-900 p-2 rounded">File</div>
                <div className="truncate text-sm text-zinc-300">Attachment</div>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {(showActions || isEditing) && (
        <div className="absolute right-4 top-2 bg-slate-900/95 border border-white/10 rounded-md shadow-lg flex items-center p-0.5 z-10">
          <button 
            onClick={() => onReply(message)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>
          {canEdit && (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button 
              onClick={(e) => {
                if (e.shiftKey) {
                  onDelete(message.id);
                } else {
                  if (confirm('Delete this message?')) onDelete(message.id);
                }
              }}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
              title="Delete (Shift+Click to skip confirm)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
