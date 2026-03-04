import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Channel, Message as MessageType } from '../types';
import { Message } from './Message';
import { Plus, Smile, Mic, Send, X, Paperclip, Image as ImageIcon, Hash, Users, MessageSquare } from 'lucide-react';

interface ChatAreaProps {
  channel: Channel | null;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ channel }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!socket || !channel) return;

    socket.emit('join_channel', channel.id);

    socket.on('message_history', ({ channelId, messages: history }) => {
      if (channelId === channel.id) {
        setMessages(history);
        scrollToBottom();
      }
    });

    socket.on('receive_message', (message: MessageType) => {
      if (message.channel_id === channel.id) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    });

    socket.on('message_edited', ({ messageId, newContent, channelId }) => {
      if (channelId === channel.id) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent, is_edited: 1 } : m));
      }
    });

    socket.on('message_deleted', ({ messageId, channelId }) => {
      if (channelId === channel.id) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    });

    socket.on('channel_cleared', ({ channelId }) => {
      if (channelId === channel.id) {
        setMessages([]);
      }
    });

    return () => {
      socket.off('message_history');
      socket.off('receive_message');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('channel_cleared');
    };
  }, [socket, channel]);

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !file) || !channel || !socket) return;

    let attachmentUrl = '';
    let type = 'text';

    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        attachmentUrl = data.url;
        type = file.type.startsWith('image/') ? 'image' : 'file';
      } catch (err) {
        console.error('Upload failed', err);
        return;
      }
    }

    socket.emit('send_message', {
      channelId: channel.id,
      content: inputValue,
      type,
      attachmentUrl,
      replyToId: replyingTo?.id
    });

    setInputValue('');
    setFile(null);
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) setFile(blob);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
        
        // Upload immediately
        const formData = new FormData();
        formData.append('file', audioFile);
        
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            
            socket?.emit('send_message', {
                channelId: channel?.id,
                content: '',
                type: 'voice',
                attachmentUrl: data.url
            });
        } catch (err) {
            console.error('Voice upload failed', err);
        }
        
        audioChunksRef.current = [];
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center panel rounded-2xl text-zinc-400 flex-col gap-4 animate-fade-up">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
            <MessageSquare className="w-8 h-8 text-zinc-300" />
        </div>
        <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">Welcome to MizChat</h3>
            <p className="text-sm text-zinc-400">Select a channel to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col panel rounded-2xl relative overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="h-12 panel-header flex items-center px-4 justify-between shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-zinc-400" />
          <span className="font-bold text-white text-base">{channel.name}</span>
          {channel.type === 'voice' && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Voice</span>}
          {channel.name === 'MIZCHAT' && <span className="w-2 h-2 bg-green-500 rounded-full ml-1" title="Official Channel"></span>}
        </div>
        
        <div className="flex items-center gap-4">
            {/* Top Bar Buttons */}
            <div className="flex items-center gap-3 text-zinc-400">
                <button className="hover:text-zinc-200 transition-colors" title="Friends">
                    <Users className="w-5 h-5" />
                </button>
                <div className="w-[1px] h-4 bg-zinc-600"></div>
                {/* Admin Tools */}
                {user?.is_admin === 1 && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                if(confirm('Clear all messages in this channel?')) {
                                    socket?.emit('clear_channel', { channelId: channel.id });
                                }
                            }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                        >
                            Clear
                        </button>
                        <button 
                            onClick={() => {
                                if(confirm('Delete all voice notes?')) {
                                    socket?.emit('purge_voice', { channelId: channel.id });
                                }
                            }}
                            className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
                        >
                            Purge Voice
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-[2px] scroll-smooth custom-scrollbar flex flex-col bg-slate-950/30">
        <div className="flex-1"></div> {/* Spacer to push messages down if few */}
        
        {/* Channel Welcome Message */}
        <div className="mb-8 mt-4 px-4 animate-fade-up">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                <Hash className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to #{channel.name}!</h1>
            <p className="text-zinc-400">This is the start of the <span className="font-bold text-zinc-300">#{channel.name}</span> channel.</p>
        </div>

        {messages.map((msg, i) => (
          <Message 
            key={msg.id} 
            message={msg} 
            onReply={setReplyingTo}
            onEdit={(id, content) => socket?.emit('edit_message', { messageId: id, newContent: content })}
            onDelete={(id) => socket?.emit('delete_message', { messageId: id })}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Area */}
      <div className="px-4 pb-4 pt-2 bg-slate-900/40 flex-shrink-0">
        <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 relative shadow-[0_10px_24px_rgba(0,0,0,0.25)]">
            {/* Reply Preview Bar */}
            {replyingTo && (
              <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-t-md absolute -top-10 left-0 right-0 border-t border-x border-white/5 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="font-bold text-zinc-300">Replying to {replyingTo.display_name}</span>
                  <span className="truncate max-w-xs opacity-70">{replyingTo.content}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* File Preview Chips */}
            {file && (
              <div className="absolute -top-12 left-0 flex items-center gap-2 bg-slate-900 p-2 rounded-md border border-white/5 shadow-lg">
                <div className="bg-white/10 p-1.5 rounded">
                    {file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-indigo-400" /> : <Paperclip className="w-4 h-4 text-indigo-400" />}
                </div>
                <span className="text-xs text-zinc-200 truncate max-w-[150px] font-medium">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-zinc-400 hover:text-red-400 ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-zinc-300 hover:text-white transition-colors flex-shrink-0 bg-white/10 rounded-full p-1"
              >
                <Plus className="w-4 h-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} 
                className="hidden" 
              />

              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`Message #${channel.name}`}
                className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none py-1 max-h-[50vh] min-h-[24px] text-[15px]"
                rows={1}
                style={{ height: 'auto', overflow: 'hidden' }}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                }}
              />

              <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Voice Note */}
                  <button 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    className={`transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-zinc-300 hover:text-white'}`}
                    title="Hold to record"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  <button className="text-zinc-300 hover:text-yellow-400 transition-colors">
                      <Smile className="w-5 h-5" />
                  </button>
                  
                  { (inputValue.trim() || file) && (
                      <button 
                        onClick={handleSendMessage}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                  )}
              </div>
            </div>
        </div>
        <div className="text-[10px] text-zinc-500 mt-2 text-right select-none font-mono opacity-40">
            MIZVILLAN MADE THIS WEBSITE
        </div>
      </div>
    </div>
  );
};
