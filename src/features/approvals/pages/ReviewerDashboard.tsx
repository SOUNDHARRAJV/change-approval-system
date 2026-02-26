import { useState, useEffect } from 'react';
import { UserCheck, LogOut, Filter, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import { Card, CardHeader, CardBody } from '../../../shared/components/Card';
import { Modal } from '../../../shared/components/Modal';
import { Select, Textarea } from '../../../shared/components/Input';
import { StatusBadge, PriorityBadge, Badge } from '../../../shared/components/Badge';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../shared/components/Toast';
import { formatDate } from '../../../shared/utils/date';
import { getAttachmentPreviewType } from '../../../shared/utils/attachments';
import {
    getAllChangeRequests,
    getCommentsByRequestId,
    addComment,
    updateChangeRequestStatus,
    getUserById
} from '../services';
import { notifyStatusUpdate } from '../services';
import type { ChangeRequest, Comment, User } from '../types';

export const ReviewerDashboard = () => {
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const [requests, setRequests] = useState<ChangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
    const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
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
        try {
            const allRequests = await Promise.race([
                getAllChangeRequests(),
                new Promise<ChangeRequest[]>((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), 5000)
                )
            ]);
            setRequests(allRequests);
        } catch {
            showToast('Loading timed out. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
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
                    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:h-16 sm:py-0">
                        <div className="flex items-start gap-3 sm:items-center">
                            <div className="p-2 bg-green-600 rounded-lg">
                                <UserCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Reviewer Dashboard</h1>
                                <p className="text-sm text-gray-500">Review &amp; approve change requests • Welcome, {user?.full_name}</p>
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
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Change Requests</h2>
                                <p className="text-sm text-gray-600 mt-1">Review and approve change requests</p>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Filter className="w-4 h-4 text-gray-500" />
                                <Select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
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
                                                Created: {formatDate(request.created_at)}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={() => handleViewRequest(request)}
                                                className="w-full sm:w-auto"
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
                onClose={() => {
                    setSelectedRequest(null);
                    setAttachmentPreviewUrl(null);
                    void setApprovalConfig;
                }}
                title="Review Change Request"
                size="xl"
            >
                {selectedRequest && (
                    <div className="mx-auto w-full max-w-3xl rounded-xl bg-white shadow-xl p-6" data-review-phase={approvalConfig.phaseName}>
                        <div className="space-y-6">
                            <div className="space-y-2 border-b border-gray-100 pb-4">
                                <h3 className="text-2xl font-semibold text-gray-900">{selectedRequest.title}</h3>
                                <div className="flex flex-wrap items-center gap-2">
                                    <PriorityBadge priority={selectedRequest.priority} />
                                    <StatusBadge status={selectedRequest.status} />
                                    <span className="text-sm text-gray-500">Created: {formatDate(selectedRequest.created_at)}</span>
                                </div>
                            </div>

                            {requestSubmitter && (
                                <div>
                                    <h4 className="mb-2 text-sm font-medium text-gray-900">Submitted by</h4>
                                    <div className="bg-gray-50 rounded-lg px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-sm font-medium text-gray-700">
                                                {requestSubmitter.full_name
                                                    .split(' ')
                                                    .filter(Boolean)
                                                    .slice(0, 2)
                                                    .map((part) => part[0]?.toUpperCase())
                                                    .join('')}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-900 truncate">{requestSubmitter.full_name}</p>
                                                <p className="text-sm text-gray-500 truncate">{requestSubmitter.email}</p>
                                            </div>
                                            <Badge variant={requestSubmitter.role === 'admin' ? 'danger' : requestSubmitter.role === 'reviewer' ? 'success' : 'info'}>
                                                {requestSubmitter.role}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="mb-2 text-sm font-medium text-gray-900">Description</h4>
                                <div className="bg-white border border-gray-100 rounded-lg p-4">
                                    <p className="text-gray-700 leading-relaxed">{selectedRequest.description}</p>
                                </div>
                            </div>

                            {selectedRequest.attachment_url && (
                                <div>
                                    <h4 className="mb-2 text-sm font-medium text-gray-900">Attachment</h4>
                                    <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                                        <p className="text-sm text-gray-500">Review uploaded file before deciding.</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAttachmentPreviewUrl(selectedRequest.attachment_url || null)}
                                        >
                                            View Attachment
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5" />
                                    Comments
                                </h4>
                                <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto space-y-3">
                                    {comments.length === 0 ? (
                                        <p className="text-sm text-gray-500">No comments yet</p>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="bg-white border border-gray-100 rounded-lg p-3">
                                                <p className="text-gray-700">{comment.comment}</p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {formatDate(comment.created_at)}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Textarea
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    rows={3}
                                    className="w-full"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        variant="secondary"
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim()}
                                    >
                                        Add Comment
                                    </Button>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4 space-y-3">
                                <h4 className="text-sm font-medium text-gray-900">Decision</h4>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        variant="success"
                                        size="lg"
                                        onClick={() => handleUpdateStatus('approved')}
                                        loading={actionLoading}
                                        icon={<CheckCircle className="w-4 h-4" />}
                                        className="flex-1"
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="lg"
                                        onClick={() => handleUpdateStatus('rejected')}
                                        loading={actionLoading}
                                        icon={<XCircle className="w-4 h-4" />}
                                        className="flex-1"
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => handleUpdateStatus('under_review')}
                                        loading={actionLoading}
                                        icon={<Clock className="w-4 h-4" />}
                                        className="flex-1"
                                    >
                                        Under Review
                                    </Button>
                                </div>
                            </div>
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
        </div>
    );
};
