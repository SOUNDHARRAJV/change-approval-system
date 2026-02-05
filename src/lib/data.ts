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
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
  return data as User[];
};

export const getUserById = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) {
    return null;
  }
  return data as User;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.from('users').select('*').eq('email', normalizedEmail).single();
  if (error) {
    return null;
  }
  return data as User;
};

export const upsertOAuthUser = async (
  email: string,
  fullName: string,
  role: 'user' | 'reviewer' | 'admin',
  authId?: string
): Promise<User> => {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await getUserByEmail(normalizedEmail);

  if (existing) {
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: existing.full_name || fullName || normalizedEmail.split('@')[0] || 'User',
        is_active: true,
        auth_id: authId || existing.auth_id
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update OAuth user:', error);
      return existing;
    }
    return data as User;
  }

  const newUser: User = {
    id: authId || `oauth_${Date.now()}`,
    auth_id: authId,
    email: normalizedEmail,
    full_name: fullName || normalizedEmail.split('@')[0] || 'User',
    role,
    is_active: true,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('users').insert([newUser]).select('*').single();
  if (error) {
    console.error('Failed to create OAuth user:', error);
    return newUser;
  }
  return data as User;
};

export const toggleUserStatus = async (userId: string): Promise<boolean> => {
  const user = await getUserById(userId);
  if (!user) return false;
  const { error } = await supabase.from('users').update({ is_active: !user.is_active }).eq('id', userId);
  return !error;
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const { error } = await supabase.from('users').delete().eq('id', userId);
  return !error;
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
  const { data, error } = await supabase.from('change_requests').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch change requests:', error);
    return [];
  }
  return data as ChangeRequest[];
};

export const getChangeRequestsByUserId = async (userId: string): Promise<ChangeRequest[]> => {
  const { data, error } = await supabase.from('change_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch user requests:', error);
    return [];
  }
  return data as ChangeRequest[];
};

export const getPendingChangeRequests = async (): Promise<ChangeRequest[]> => {
  const { data, error } = await supabase
    .from('change_requests')
    .select('*')
    .in('status', ['pending', 'under_review'])
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch pending requests:', error);
    return [];
  }
  return data as ChangeRequest[];
};

export const getChangeRequestById = async (requestId: string): Promise<ChangeRequest | null> => {
  const { data, error } = await supabase.from('change_requests').select('*').eq('id', requestId).single();
  if (error) {
    return null;
  }
  return data as ChangeRequest;
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
