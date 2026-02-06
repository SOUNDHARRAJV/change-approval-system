import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

console.log('Supabase config loaded:', { 
  url: supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length 
});

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const checkSupabaseConnection = async (): Promise<{ ok: boolean; message?: string }> => {
  if (!hasSupabaseConfig) {
    return { ok: false, message: 'Supabase config is missing.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      },
      signal: controller.signal
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, message: 'Supabase reachable but API key rejected.' };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error.';
    return { ok: false, message };
  } finally {
    clearTimeout(timeout);
  }
};

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
