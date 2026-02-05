// Notification system for change requests
import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  request_id: string;
  type: 'new_request' | 'status_update' | 'comment_added' | 'request_assigned';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Create notifications table if it doesn't exist
export const ensureNotificationsTable = async () => {
  try {
    // This would typically be done via migrations, but included for completeness
    const { error } = await supabase.from('notifications').select('count').limit(1);
    
    // If table doesn't exist, the error will indicate it
    if (error && error.message.includes('does not exist')) {
      console.log('Notifications table needs to be created via migration');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking notifications table:', error);
    return false;
  }
};

// Notify all reviewers and admins about a new request
export const notifyReviewersAndAdmins = async (
  requestId: string,
  requestTitle: string,
  requesterName: string
): Promise<void> => {
  try {
    // Get all reviewers and admins
    const { data: reviewersAndAdmins, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['reviewer', 'admin'])
      .eq('is_active', true);

    if (fetchError) {
      console.error('Failed to fetch reviewers/admins:', fetchError);
      return;
    }

    if (!reviewersAndAdmins || reviewersAndAdmins.length === 0) {
      console.log('No reviewers or admins found to notify');
      return;
    }

    // Create notifications for each reviewer/admin
    const notifications = reviewersAndAdmins.map(person => ({
      user_id: person.id,
      request_id: requestId,
      type: 'new_request' as const,
      title: 'New Change Request',
      message: `${requesterName} submitted a new change request: "${requestTitle}"`,
      read: false,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Failed to create notifications:', insertError);
    } else {
      console.log(`Notified ${notifications.length} reviewers/admins`);
    }
  } catch (error) {
    console.error('Error notifying reviewers:', error);
  }
};

// Notify when a request is assigned to a reviewer
export const notifyReviewerAssignment = async (
  requestId: string,
  reviewerId: string,
  requestTitle: string
): Promise<void> => {
  try {
    const notification = {
      user_id: reviewerId,
      request_id: requestId,
      type: 'request_assigned' as const,
      title: 'Request Assigned to You',
      message: `You have been assigned to review: "${requestTitle}"`,
      read: false,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('notifications')
      .insert([notification]);

    if (error) {
      console.error('Failed to notify reviewer assignment:', error);
    }
  } catch (error) {
    console.error('Error notifying reviewer assignment:', error);
  }
};

// Notify user about status update
export const notifyStatusUpdate = async (
  userId: string,
  requestId: string,
  requestTitle: string,
  newStatus: string
): Promise<void> => {
  try {
    const notification = {
      user_id: userId,
      request_id: requestId,
      type: 'status_update' as const,
      title: 'Request Status Updated',
      message: `Your request "${requestTitle}" has been ${newStatus}`,
      read: false,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('notifications')
      .insert([notification]);

    if (error) {
      console.error('Failed to create notification:', error);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Get notifications for a user
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }

    return data as Notification[];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const { data, error, count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Failed to count unread notifications:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to mark notification as read:', error);
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};
