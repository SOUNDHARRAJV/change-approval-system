import { useState, useEffect } from 'react';
import { UserCheck, LogOut, Filter, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Modal } from '../components/Modal';
import { Textarea } from '../components/Input';
import { StatusBadge, PriorityBadge, Badge } from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { 
  getAllChangeRequests,
  getCommentsByRequestId,
  addComment,
  updateChangeRequestStatus,
  getChangeRequestById,
  getUserById,
  ChangeRequest,
  Comment,
  User
} from '../lib/data';
import { notifyStatusUpdate } from '../lib/notifications';

export const ReviewerDashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [requestSubmitter, setRequestSubmitter] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalConfig, setApprovalConfig] = useState({
    phaseName: 'Review',
    processName: 'Change Level CHA - Review',
    processType: 'Level',
    autoApprove: false,
    sortOrder: '100',
    impactsApprovalStatus: true
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const allRequests = await getAllChangeRequests();
    setRequests(allRequests);
    setLoading(false);
  };

  const loadComments = async (requestId: string) => {
    const comments = await getCommentsByRequestId(requestId);
    setComments(comments);
  };

  const handleViewRequest = async (request: ChangeRequest) => {
    setSelectedRequest(request);
    const submitter = await getUserById(request.user_id);
    setRequestSubmitter(submitter || null);
    loadComments(request.id);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedRequest || !user) return;

    setActionLoading(true);
    const updatedRequest = await updateChangeRequestStatus(selectedRequest.id, status, user.id);
    
    if (updatedRequest) {
      const requester = await getUserById(updatedRequest.user_id);
      if (requester) {
        await notifyStatusUpdate(requester.id, selectedRequest.id, selectedRequest.title, status);
      }
      showToast(`Request ${status}!`, 'success');
    } else {
      showToast('Failed to update status', 'error');
    }
    
    setActionLoading(false);
    setSelectedRequest(null);
    loadRequests();
  };

  const handleAddComment = async () => {
    if (!selectedRequest || !user || !newComment.trim()) return;

    const created = await addComment(selectedRequest.id, user.id, newComment);
    if (created) {
      showToast('Comment added successfully', 'success');
      setNewComment('');
      loadComments(selectedRequest.id);
    } else {
      showToast('Failed to add comment', 'error');
    }
  };

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending' || r.status === 'under_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Reviewer Dashboard</h1>
                <p className="text-sm text-gray-500">Review & approve change requests • Welcome, {user?.full_name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={logout} icon={<LogOut className="w-4 h-4" />}>
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Review</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Rejected</p>
                  <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Change Requests</h2>
                <p className="text-sm text-gray-600 mt-1">Review and approve change requests</p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Requests</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardBody>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No change requests found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{request.title}</h3>
                      <div className="flex gap-2">
                        <PriorityBadge priority={request.priority} />
                        <StatusBadge status={request.status} />
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Created: {new Date(request.created_at).toLocaleDateString()}
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleViewRequest(request)}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Review Change Request"
        size="xl"
      >
        {selectedRequest && (
          <div className="p-6">
            {/* Submitter User Details */}
            {requestSubmitter && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Change Request Submitted By</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{requestSubmitter.full_name}</p>
                      <p className="text-sm text-gray-600">{requestSubmitter.email}</p>
                      <div className="mt-2 flex gap-2 items-center">
                        <Badge variant={requestSubmitter.role === 'admin' ? 'danger' : requestSubmitter.role === 'reviewer' ? 'success' : 'info'}>
                          {requestSubmitter.role}
                        </Badge>
                        <Badge variant={requestSubmitter.is_active ? 'success' : 'warning'}>
                          {requestSubmitter.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Approval Process Configuration</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phase Name*
                    </label>
                    <input
                      type="text"
                      value={approvalConfig.phaseName}
                      onChange={(e) => setApprovalConfig({...approvalConfig, phaseName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Review"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Process Type*
                    </label>
                    <select
                      value={approvalConfig.processType}
                      onChange={(e) => setApprovalConfig({...approvalConfig, processType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Level">Level</option>
                      <option value="Sequential">Sequential</option>
                      <option value="Parallel">Parallel</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Process Name*
                  </label>
                  <input
                    type="text"
                    value={approvalConfig.processName}
                    onChange={(e) => setApprovalConfig({...approvalConfig, processName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Change Level CHA - Review"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={approvalConfig.sortOrder}
                      onChange={(e) => setApprovalConfig({...approvalConfig, sortOrder: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Impacts Approval Status
                    </label>
                    <select
                      value={approvalConfig.impactsApprovalStatus ? 'Yes' : 'No'}
                      onChange={(e) => setApprovalConfig({...approvalConfig, impactsApprovalStatus: e.target.value === 'Yes'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoApprove"
                    checked={approvalConfig.autoApprove}
                    onChange={(e) => setApprovalConfig({...approvalConfig, autoApprove: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoApprove" className="ml-2 text-sm text-gray-700">
                    Auto Approve
                  </label>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="mb-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{selectedRequest.title}</h3>
                <div className="flex gap-2">
                  <PriorityBadge priority={selectedRequest.priority} />
                  <StatusBadge status={selectedRequest.status} />
                </div>
              </div>
              <p className="text-gray-700 mb-4">{selectedRequest.description}</p>
              <div className="text-sm text-gray-500">
                Created: {new Date(selectedRequest.created_at).toLocaleString()}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments
              </h4>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-sm">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-700">{comment.comment}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="success"
                onClick={() => handleUpdateStatus('approved')}
                loading={actionLoading}
                icon={<CheckCircle className="w-4 h-4" />}
                className="flex-1"
              >
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => handleUpdateStatus('rejected')}
                loading={actionLoading}
                icon={<XCircle className="w-4 h-4" />}
                className="flex-1"
              >
                Reject
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleUpdateStatus('under_review')}
                loading={actionLoading}
                icon={<Clock className="w-4 h-4" />}
                className="flex-1"
              >
                Under Review
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
