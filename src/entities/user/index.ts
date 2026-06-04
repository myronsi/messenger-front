export interface User {
  id: number;
  username: string;
  display_name: string;
  account_display_name?: string;
  contact_display_name?: string | null;
  email?: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string | null;
  is_online?: boolean;
  last_seen?: string | null;
  can_message?: boolean;
  direct_chat_id?: number | null;
  direct_message_reason?: 'self' | 'blocked' | 'privacy' | null;
}
