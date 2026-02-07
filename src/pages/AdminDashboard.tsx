import { useState, useEffect } from 'react';
import { Shield, LogOut, Users, FileText, UserCheck, Settings, Trash2, Lock, Filter } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Modal } from '../components/Modal';
import { Select } from '../components/Input';
import { StatusBadge, PriorityBadge, Badge } from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { 
  getAllChangeRequests,
  getAllUsers,
  toggleUserStatus,
  assignReviewerToRequest,
  updateChangeRequestStatus,
  getChangeRequestById,
  deleteUser,
  deleteChangeRequest,
  ChangeRequest,
  User
} from '../lib/data';
import { notifyReviewerAssignment, notifyStatusUpdate } from '../lib/notifications';

const getAttachmentPreviewType = (url: string) => {
  const normalized = url.split('?')[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(normalized)) return 'image';
  if (/\.pdf$/.test(normalized)) return 'pdf';
  return 'other';
};

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [reviewerUsers, setReviewerUsers] = useState<User[]>([]);
  const [regularUsers, setRegularUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'users'>('requests');
  const [userTab, setUserTab] = useState<'admins' | 'reviewers' | 'users'>('admins');
  const [requestFilter, setRequestFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await Promise.race([
        Promise.all([getAllChangeRequests(), getAllUsers()]),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000))
      ]);

      if (!data) {
        showToast('Data load timed out. Check Supabase connection.', 'error');
        return;
      }

      const [allRequests, allUsers] = data;
      const adminsList = allUsers.filter(u => u.role === 'admin');
      const reviewersList = allUsers.filter(u => u.role === 'reviewer');
      const regularUsersList = allUsers.filter(u => u.role === 'user');

      setRequests(allRequests);
      setAdminUsers(adminsList);
      setReviewerUsers(reviewersList);
      setRegularUsers(regularUsersList);
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignReviewer = async (requestId: string, reviewerId: string) => {
    setActionLoading(true);
    const request = await getChangeRequestById(requestId);
    const updatedRequest = await assignReviewerToRequest(
      requestId,
      reviewerId === 'none' ? null : reviewerId
    );

    if (updatedRequest && reviewerId !== 'none' && request) {
      await notifyReviewerAssignment(requestId, reviewerId, request.title);
    }

    showToast('Reviewer assigned successfully', 'success');
    setActionLoading(false);
    setSelectedRequest(null);
    loadData();
  };

  const handleUpdateRequestStatus = async (requestId: string, status: string) => {
    setActionLoading(true);
    const request = await getChangeRequestById(requestId);
    const updatedRequest = await updateChangeRequestStatus(requestId, status);

    if (updatedRequest && request) {
      await notifyStatusUpdate(request.user_id, requestId, request.title, status);
    }

    showToast('Status updated successfully', 'success');
    setActionLoading(false);
    setSelectedRequest(null);
    loadData();
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    setActionLoading(true);
    const ok = await toggleUserStatus(userId);
    if (ok) {
      showToast(`User ${!isActive ? 'enabled' : 'disabled'} successfully`, 'success');
    } else {
      showToast('Failed to update user status', 'error');
    }
    setActionLoading(false);
    setSelectedUser(null);
    loadData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? All their data will be removed.')) {
      setActionLoading(true);

      const ok = await deleteUser(userId);
      if (ok) {
        showToast('User deleted successfully', 'success');
      } else {
        showToast('Failed to delete user', 'error');
      }
      setActionLoading(false);
      setSelectedUser(null);
      loadData();
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (confirm('Are you sure you want to delete this change request? This action cannot be undone.')) {
      setActionLoading(true);

      const ok = await deleteChangeRequest(requestId);
      if (ok) {
        showToast('Request deleted successfully', 'success');
      } else {
        showToast('Failed to delete request', 'error');
      }
      setActionLoading(false);
      setSelectedRequest(null);
      loadData();
    }
  };

  const stats = {
    totalRequests: requests.length,
    totalUsers: regularUsers.length,
    totalReviewers: reviewerUsers.length,
    totalAdmins: adminUsers.length,
    pendingRequests: requests.filter(r => r.status === 'pending' || r.status === 'under_review').length
  };

  const filteredRequests = requestFilter === 'all'
    ? requests
    : requests.filter((request) => request.status === requestFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:h-16 sm:py-0">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="p-2 bg-gray-800 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Full system management & oversight • Welcome, {user?.full_name}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={logout}
              icon={<LogOut className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalRequests}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingRequests}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Settings className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Users</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Reviewers</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalReviewers}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Admins</p>
                  <p className="text-3xl font-bold text-red-600">{stats.totalAdmins}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Lock className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`px-4 py-2 sm:px-6 sm:py-3 font-medium transition-colors ${
                    activeTab === 'requests'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Change Requests
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 sm:px-6 sm:py-3 font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  User Management
                </button>
              </div>
              {activeTab === 'requests' && (
                <div className="flex items-center gap-2 w-full sm:w-auto pr-0 sm:pr-2 py-1 sm:py-3">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select
                    value={requestFilter}
                    onChange={(e) => setRequestFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Requests' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'under_review', label: 'Under Review' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' }
                    ]}
                    className="w-full sm:w-48"
                  />
                </div>
              )}
            </div>
          </CardHeader>

          <CardBody>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading data...</p>
              </div>
            ) : activeTab === 'requests' ? (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{request.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        <PriorityBadge priority={request.priority} />
                        <StatusBadge status={request.status} />
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-gray-500">
                        Created: {new Date(request.created_at).toLocaleDateString()}
                        {request.reviewer_id && ' • Reviewer assigned'}
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setSelectedRequest(request)}
                        className="w-full sm:w-auto"
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* User Management Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
                  <button
                    onClick={() => setUserTab('admins')}
                    className={`flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto px-4 py-2 sm:py-3 font-medium transition-colors ${
                      userTab === 'admins'
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Admins ({adminUsers.length})
                  </button>
                  <button
                    onClick={() => setUserTab('reviewers')}
                    className={`flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto px-4 py-2 sm:py-3 font-medium transition-colors ${
                      userTab === 'reviewers'
                        ? 'text-green-600 border-b-2 border-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Reviewers ({reviewerUsers.length})
                  </button>
                  <button
                    onClick={() => setUserTab('users')}
                    className={`flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto px-4 py-2 sm:py-3 font-medium transition-colors ${
                      userTab === 'users'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Users ({regularUsers.length})
                  </button>
                </div>

                {/* Admin Users Section */}
                {userTab === 'admins' && (
                  <div className="space-y-3">
                    {adminUsers.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No admin users</p>
                    ) : (
                      adminUsers.map((u) => (
                        <div
                          key={u.id}
                          className="border border-red-200 bg-red-50 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">{u.full_name}</h3>
                                <Badge variant="danger">ADMIN</Badge>
                                {!u.is_active && <Badge variant="danger">Disabled</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">{u.email}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Joined: {new Date(u.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedUser(u)}
                              className="w-full sm:w-auto"
                            >
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Reviewer Users Section */}
                {userTab === 'reviewers' && (
                  <div className="space-y-3">
                    {reviewerUsers.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No reviewers</p>
                    ) : (
                      reviewerUsers.map((u) => (
                        <div
                          key={u.id}
                          className="border border-green-200 bg-green-50 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">{u.full_name}</h3>
                                <Badge variant="success">REVIEWER</Badge>
                                {!u.is_active && <Badge variant="danger">Disabled</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">{u.email}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Joined: {new Date(u.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedUser(u)}
                              className="w-full sm:w-auto"
                            >
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Regular Users Section */}
                {userTab === 'users' && (
                  <div className="space-y-3">
                    {regularUsers.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No regular users</p>
                    ) : (
                      regularUsers.map((u) => (
                        <div
                          key={u.id}
                          className="border border-blue-200 bg-blue-50 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">{u.full_name}</h3>
                                <Badge variant="info">USER</Badge>
                                {!u.is_active && <Badge variant="danger">Disabled</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">{u.email}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Joined: {new Date(u.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedUser(u)}
                              className="w-full sm:w-auto"
                            >
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={!!selectedRequest}
        onClose={() => {
          setSelectedRequest(null);
          setAttachmentPreviewUrl(null);
        }}
        title="Manage Change Request"
        size="lg"
      >
        {selectedRequest && (
          <div className="p-6">
            <div className="mb-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedRequest.title}</h3>
                <div className="flex flex-wrap gap-2">
                  <PriorityBadge priority={selectedRequest.priority} />
                  <StatusBadge status={selectedRequest.status} />
                </div>
              </div>
              <p className="text-gray-700 mb-4">{selectedRequest.description}</p>
              {selectedRequest.attachment_url && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Attachment</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAttachmentPreviewUrl(selectedRequest.attachment_url || null)}
                  >
                    View Attachment
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Select
                label="Assign Reviewer"
                value={selectedRequest.reviewer_id || 'none'}
                onChange={(e) => handleAssignReviewer(selectedRequest.id, e.target.value)}
                options={[
                  { value: 'none', label: 'No Reviewer' },
                  ...reviewerUsers.map(r => ({ value: r.id, label: r.full_name }))
                ]}
              />

              <Select
                label="Update Status"
                value={selectedRequest.status}
                onChange={(e) => handleUpdateRequestStatus(selectedRequest.id, e.target.value)}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' }
                ]}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button 
                variant="danger" 
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => handleDeleteRequest(selectedRequest.id)}
                loading={actionLoading}
              >
                Delete
              </Button>
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!attachmentPreviewUrl}
        onClose={() => setAttachmentPreviewUrl(null)}
        title="Attachment Preview"
        size="xl"
      >
        {attachmentPreviewUrl && (
          <div className="p-6">
            {getAttachmentPreviewType(attachmentPreviewUrl) === 'image' && (
              <img
                src={attachmentPreviewUrl}
                alt="Attachment preview"
                className="max-h-[70vh] w-full object-contain rounded-lg border border-gray-200"
              />
            )}
            {getAttachmentPreviewType(attachmentPreviewUrl) === 'pdf' && (
              <iframe
                title="Attachment preview"
                src={attachmentPreviewUrl}
                className="w-full h-[70vh] rounded-lg border border-gray-200"
              />
            )}
            {getAttachmentPreviewType(attachmentPreviewUrl) === 'other' && (
              <div className="text-sm text-gray-600">
                <p className="mb-3">Preview is not available for this file type.</p>
                <a
                  href={attachmentPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Download attachment
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="User Details & Management"
        size="lg"
      >
        {selectedUser && (
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{selectedUser.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Role</p>
                  <Badge variant={selectedUser.role === 'admin' ? 'danger' : selectedUser.role === 'reviewer' ? 'success' : 'info'}>
                    {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge variant={selectedUser.is_active ? 'success' : 'warning'}>
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Account Actions</h4>
              <div className="flex gap-3 flex-col">
                <Button
                  variant={selectedUser.is_active ? 'danger' : 'success'}
                  onClick={() => handleToggleUserStatus(selectedUser.id, selectedUser.is_active)}
                  loading={actionLoading}
                  className="w-full"
                >
                  {selectedUser.is_active ? 'Disable Account' : 'Enable Account'}
                </Button>
                <Button
                  variant="danger"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => handleDeleteUser(selectedUser.id)}
                  loading={actionLoading}
                  className="w-full"
                >
                  Delete User
                </Button>
                <Button variant="outline" onClick={() => setSelectedUser(null)} className="w-full">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
