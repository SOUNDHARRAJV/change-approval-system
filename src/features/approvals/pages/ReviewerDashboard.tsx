import { useState, useEffect } from 'react';
import { UserCheck, LogOut, Filter, MessageSquare, CheckCircle, XCircle, Clock, Paperclip } from 'lucide-react';
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
    const [commentLoading, setCommentLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionReason, setShowRejectionReason] = useState(false);
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

    const formatHeaderDate = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Unknown date';
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    const formatRelativeTime = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const diffMs = Date.now() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    };

    const getRequestDisplayId = (request: ChangeRequest) => {
        const year = new Date(request.created_at).getFullYear();
        const idPart = request.id?.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
        if (!idPart) return 'CR-XXXX';
        return `CR-${Number.isNaN(year) ? 'XXXX' : year}-${idPart}`;
    };

    const getAttachmentFileName = (url?: string | null) => {
        if (!url) return 'Attached file';
        const cleanUrl = url.split('?')[0];
        const raw = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
        if (!raw) return 'Attached file';
        try {
            return decodeURIComponent(raw);
        } catch {
            return raw;
        }
    };

    const autoExpandTextarea = (element: HTMLTextAreaElement) => {
        element.style.height = 'auto';
        element.style.height = `${element.scrollHeight}px`;
    };

    const handleViewRequest = async (request: ChangeRequest) => {
        setSelectedRequest(request);
        setRejectionReason('');
        setShowRejectionReason(false);
        setNewComment('');
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

        setCommentLoading(true);
        const created = await addComment(selectedRequest.id, user.id, newComment);
        if (created) {
            showToast('Comment added successfully', 'success');
            setNewComment('');
            loadComments(selectedRequest.id);
        } else {
            showToast('Failed to add comment', 'error');
        }
        setCommentLoading(false);
    };

    const handleDecision = async (status: 'approved' | 'rejected' | 'under_review') => {
        if (status === 'rejected') {
            if (!showRejectionReason) {
                setShowRejectionReason(true);
                return;
            }
            if (!rejectionReason.trim()) {
                showToast('Reason for rejection is required.', 'error');
                return;
            }
        }

        await handleUpdateStatus(status);
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
                    setRequestSubmitter(null);
                    setComments([]);
                    setNewComment('');
                    setRejectionReason('');
                    setShowRejectionReason(false);
                    void setApprovalConfig;
                }}
                title="Review Change Request"
                size="xl"
            >
                {selectedRequest && (
                    <div className="p-6 space-y-5" data-review-phase={approvalConfig.phaseName}>
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                                <div className="space-y-1 min-w-0">
                                    <h3 className="text-2xl font-bold text-gray-900 leading-tight break-words">{selectedRequest.title}</h3>
                                    <p className="text-sm font-medium text-gray-500">{getRequestDisplayId(selectedRequest)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <PriorityBadge priority={selectedRequest.priority} />
                                    <StatusBadge status={selectedRequest.status} />
                                </div>
                            </div>
                            <p className="mt-3 text-sm text-gray-600">
                                Created: {formatHeaderDate(selectedRequest.created_at)}
                                {' • '}
                                {formatRelativeTime(selectedRequest.created_at)}
                            </p>
                        </div>

                        {requestSubmitter && (
                            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 shadow-sm">
                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide pb-3 border-b border-gray-200">Submitted By</h4>
                                <div className="mt-4 flex items-center gap-3">
                                    <div className="h-11 w-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                                        {requestSubmitter.full_name
                                            .split(' ')
                                            .filter(Boolean)
                                            .slice(0, 2)
                                            .map((part) => part[0]?.toUpperCase())
                                            .join('')}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-900 truncate">{requestSubmitter.full_name}</p>
                                        <p className="text-sm text-gray-500 truncate">{requestSubmitter.email}</p>
                                    </div>
                                    <Badge variant={requestSubmitter.role === 'admin' ? 'danger' : requestSubmitter.role === 'reviewer' ? 'success' : 'info'}>
                                        {requestSubmitter.role}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide pb-3 border-b border-gray-200">Request Description</h4>
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedRequest.description || 'No description provided.'}</p>
                            </div>
                        </div>

                        {selectedRequest.attachment_url && (
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide pb-3 border-b border-gray-200">Attachment</h4>
                                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                        <p className="text-sm text-gray-600 truncate">{getAttachmentFileName(selectedRequest.attachment_url)}</p>
                                    </div>
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

                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide pb-3 border-b border-gray-200 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Comments
                            </h4>

                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 max-h-64 overflow-y-auto">
                                {comments.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-6">No comments have been added yet.</p>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {comments.map((comment) => {
                                            const isCurrentReviewer = comment.reviewer_id === user?.id;
                                            const isSubmitter = comment.reviewer_id === requestSubmitter?.id;
                                            const commenterName = isCurrentReviewer
                                                ? user?.full_name || 'Reviewer'
                                                : isSubmitter
                                                    ? requestSubmitter?.full_name || 'Requester'
                                                    : 'Reviewer';

                                            return (
                                                <div key={comment.id} className="py-3 first:pt-0 last:pb-0">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-semibold text-gray-900">{commenterName}</p>
                                                            {(isCurrentReviewer || isSubmitter) && (
                                                                <Badge
                                                                    variant={
                                                                        isCurrentReviewer
                                                                            ? (user?.role === 'admin'
                                                                                ? 'danger'
                                                                                : user?.role === 'reviewer'
                                                                                    ? 'success'
                                                                                    : 'info')
                                                                            : (requestSubmitter?.role === 'admin'
                                                                                ? 'danger'
                                                                                : requestSubmitter?.role === 'reviewer'
                                                                                    ? 'success'
                                                                                    : 'info')
                                                                    }
                                                                >
                                                                    {isCurrentReviewer ? user?.role : requestSubmitter?.role}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500">{formatHeaderDate(comment.created_at)}</p>
                                                    </div>
                                                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <Textarea
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onInput={(e) => autoExpandTextarea(e.currentTarget)}
                                    rows={2}
                                    className="w-full overflow-hidden"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        variant="secondary"
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim()}
                                        loading={commentLoading}
                                    >
                                        Add Comment
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide pb-3 border-b border-gray-200">Activity History</h4>
                            <div className="relative pl-6 space-y-4">
                                <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />
                                <div className="relative">
                                    <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-blue-200 border border-blue-300" />
                                    <p className="text-sm text-gray-800">Request created</p>
                                    <p className="text-xs text-gray-500">{formatHeaderDate(selectedRequest.created_at)}</p>
                                </div>
                                {selectedRequest.updated_at && selectedRequest.updated_at !== selectedRequest.created_at && (
                                    <div className="relative">
                                        <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-green-200 border border-green-300" />
                                        <p className="text-sm text-gray-800">Status updated to {selectedRequest.status.replace('_', ' ')}</p>
                                        <p className="text-xs text-gray-500">{formatHeaderDate(selectedRequest.updated_at)}</p>
                                    </div>
                                )}
                                {comments.slice(0, 2).map((comment) => (
                                    <div key={`activity-${comment.id}`} className="relative">
                                        <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-violet-200 border border-violet-300" />
                                        <p className="text-sm text-gray-800">Comment added</p>
                                        <p className="text-xs text-gray-500">{formatHeaderDate(comment.created_at)}</p>
                                    </div>
                                ))}
                                {comments.length === 0 && (!selectedRequest.updated_at || selectedRequest.updated_at === selectedRequest.created_at) && (
                                    <p className="text-sm text-gray-500">No additional activity recorded.</p>
                                )}
                            </div>
                        </div>

                        <div className="sticky bottom-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Decision</h4>
                            <p className="text-sm text-gray-500">Select your review decision.</p>

                            {showRejectionReason && (
                                <div className="space-y-2">
                                    <label htmlFor="rejection-reason" className="text-sm font-medium text-gray-700">
                                        Reason for rejection (required)
                                    </label>
                                    <textarea
                                        id="rejection-reason"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-y"
                                        placeholder="Provide a clear reason for rejecting this request..."
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Button
                                    variant="success"
                                    size="lg"
                                    onClick={() => handleDecision('approved')}
                                    loading={actionLoading}
                                    icon={<CheckCircle className="w-4 h-4" />}
                                    className="w-full"
                                >
                                    Approve
                                </Button>
                                <Button
                                    variant="danger"
                                    size="lg"
                                    onClick={() => handleDecision('rejected')}
                                    loading={actionLoading}
                                    icon={<XCircle className="w-4 h-4" />}
                                    className="w-full"
                                >
                                    Reject
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => handleDecision('under_review')}
                                    loading={actionLoading}
                                    icon={<Clock className="w-4 h-4" />}
                                    className="w-full"
                                >
                                    Mark as Under Review
                                </Button>
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
