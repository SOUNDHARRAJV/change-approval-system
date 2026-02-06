import { supabase } from './supabase';

export interface User {
  id: string;
  auth_id?: string;
  email: string;
  full_name: string;
  role: 'user' | 'reviewer' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface ChangeRequest {
  id: string;
  user_id: string;
  reviewer_id?: string | null;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  attachment_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  request_id: string;
  reviewer_id?: string | null;
  comment: string;
  created_at: string;
}

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?order=created_at.asc`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Failed to fetch users:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data as User[];
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.length > 0 ? (data[0] as User) : null;
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    return null;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(normalizedEmail)}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.length > 0 ? (data[0] as User) : null;
  } catch (error) {
    console.error('Failed to fetch user by email:', error);
    return null;
  }
};

export const upsertOAuthUser = async (
  email: string,
  fullName: string,
  role: 'user' | 'reviewer' | 'admin',
  authId?: string
): Promise<User> => {
  const normalizedEmail = email.trim().toLowerCase();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  try {
    const existing = await getUserByEmail(normalizedEmail);

    if (existing) {
      // Update existing user
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(existing.id)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            full_name: existing.full_name || fullName || normalizedEmail.split('@')[0] || 'User',
            auth_id: authId || existing.auth_id,
            role
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Failed to update OAuth user:', response.statusText);
        return existing;
      }
      
      const data = await response.json();
      return data[0] as User;
    }

    // Create new user
    const newUser: User = {
      id: authId || `oauth_${Date.now()}`,
      auth_id: authId,
      email: normalizedEmail,
      full_name: fullName || normalizedEmail.split('@')[0] || 'User',
      role,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newUser),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Failed to create OAuth user:', response.statusText);
      return newUser;
    }
    
    const data = await response.json();
    return data[0] as User;
  } catch (error) {
    console.error('Failed to upsert OAuth user:', error);
    return {
      id: authId || `oauth_${Date.now()}`,
      auth_id: authId,
      email: normalizedEmail,
      full_name: fullName || normalizedEmail.split('@')[0] || 'User',
      role,
      is_active: true,
      created_at: new Date().toISOString()
    };
  }
};

export const toggleUserStatus = async (userId: string): Promise<boolean> => {
  try {
    const user = await getUserById(userId);
    if (!user) return false;
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !user.is_active }),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Failed to toggle user status:', error);
    return false;
  }
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Failed to delete user:', error);
    return false;
  }
};

export const createChangeRequest = async (
  userId: string,
  title: string,
  description: string,
  priority: string
): Promise<ChangeRequest> => {
  const newRequest: ChangeRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    user_id: userId,
    title,
    description,
    priority: priority as ChangeRequest['priority'],
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('change_requests').insert([newRequest]).select('*').single();
  if (error) {
    console.error('Failed to create change request:', error);
    return newRequest;
  }
  return data as ChangeRequest;
};

export const getAllChangeRequests = async (): Promise<ChangeRequest[]> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/change_requests?order=created_at.desc`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Failed to fetch change requests:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data as ChangeRequest[];
  } catch (error) {
    console.error('Failed to fetch change requests:', error);
    return [];
  }
};

export const getChangeRequestsByUserId = async (userId: string): Promise<ChangeRequest[]> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/change_requests?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Failed to fetch user requests:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data as ChangeRequest[];
  } catch (error) {
    console.error('Failed to fetch user requests:', error);
    return [];
  }
};

export const getPendingChangeRequests = async (): Promise<ChangeRequest[]> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/change_requests?or=(status.eq.pending,status.eq.under_review)&order=created_at.desc`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Failed to fetch pending requests:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data as ChangeRequest[];
  } catch (error) {
    console.error('Failed to fetch pending requests:', error);
    return [];
  }
};

export const getChangeRequestById = async (requestId: string): Promise<ChangeRequest | null> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/change_requests?id=eq.${encodeURIComponent(requestId)}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.length > 0 ? (data[0] as ChangeRequest) : null;
  } catch (error) {
    return null;
  }
};

export const updateChangeRequestStatus = async (
  requestId: string,
  status: string,
  reviewerId?: string
): Promise<ChangeRequest | null> => {
  const updates: Partial<ChangeRequest> = {
    status: status as ChangeRequest['status'],
    updated_at: new Date().toISOString()
  };
  if (reviewerId) {
    updates.reviewer_id = reviewerId;
  }

  const { data, error } = await supabase
    .from('change_requests')
    .update(updates)
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) {
    console.error('Failed to update request status:', error);
    return null;
  }
  return data as ChangeRequest;
};

export const assignReviewerToRequest = async (
  requestId: string,
  reviewerId: string | null
): Promise<ChangeRequest | null> => {
  const updates: Partial<ChangeRequest> = {
    reviewer_id: reviewerId,
    status: reviewerId ? 'under_review' : 'pending',
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('change_requests')
    .update(updates)
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) {
    console.error('Failed to assign reviewer:', error);
    return null;
  }
  return data as ChangeRequest;
};

export const deleteChangeRequest = async (requestId: string): Promise<boolean> => {
  const { error } = await supabase.from('change_requests').delete().eq('id', requestId);
  return !error;
};

export const getCommentsByRequestId = async (requestId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch comments:', error);
    return [];
  }
  return data as Comment[];
};

export const addComment = async (requestId: string, reviewerId: string, comment: string): Promise<Comment | null> => {
  const newComment: Comment = {
    id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    request_id: requestId,
    reviewer_id: reviewerId,
    comment,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('comments').insert([newComment]).select('*').single();
  if (error) {
    console.error('Failed to add comment:', error);
    return null;
  }
  return data as Comment;
};
