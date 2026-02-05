import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'reviewer' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface ChangeRequest {
  id: string;
  user_id: string;
  reviewer_id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  attachment_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  request_id: string;
  reviewer_id: string;
  comment: string;
  created_at: string;
}
