export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar?: string;
  bio?: string;
  is_admin: number; // 0 or 1
  created_at?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice';
  attachment_url?: string;
  reply_to_id?: string;
  is_edited: number;
  created_at: string;
  username: string;
  display_name: string;
  avatar?: string;
  is_admin: number;
}

export interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar?: string;
  status: 'pending' | 'accepted' | 'blocked';
  requester_id: string;
}
