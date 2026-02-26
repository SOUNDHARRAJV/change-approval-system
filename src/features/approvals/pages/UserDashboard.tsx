import { useState, useEffect } from 'react';
import { Plus, FileText, Clock, CheckCircle, XCircle, LogOut, Filter, HardDrive, Upload, Paperclip, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import { Card, CardHeader, CardBody } from '../../../shared/components/Card';
import { Modal } from '../../../shared/components/Modal';
import { Input, Textarea, Select } from '../../../shared/components/Input';
import { StatusBadge, PriorityBadge } from '../../../shared/components/Badge';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../shared/components/Toast';
import { formatDate } from '../../../shared/utils/date';
import { getAttachmentPreviewType } from '../../../shared/utils/attachments';
import {
    getChangeRequestsByUserId,
    createChangeRequest,
    uploadChangeRequestAttachment,
    deleteChangeRequest,
    getAllUsers,
    updateChangeRequest
} from '../services';
import type { ChangeRequest } from '../types';
import { notifyReviewersAndAdmins } from '../services';

export const UserDashboard = () => {
    const titleMaxLength = 100;
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const [reviewers, setReviewers] = useState<{ id: string; full_name: string }[]>([]);
    const [requests, setRequests] = useState<ChangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
    const [editRequest, setEditRequest] = useState<ChangeRequest | null>(null);
    const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [actionLoading, setActionLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        issue: '',
        solution: '',
        impact: '',
        notes: '',
        priority: 'medium'
    });
    const [editFormData, setEditFormData] = useState({
        title: '',
        description: '',
        priority: 'medium'
    });
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [createSubmitAttempted, setCreateSubmitAttempted] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [createErrors, setCreateErrors] = useState<{ title?: string; issue?: string; solution?: string }>({});
    const [editAttachmentFile, setEditAttachmentFile] = useState<File | null>(null);
    const [editFileInputKey, setEditFileInputKey] = useState(0);

    useEffect(() => {
        loadRequests();
    }, [user]);

    useEffect(() => {
        loadReviewers();
    }, []);

    const loadReviewers = async () => {
        try {
            const users = await Promise.race([
                getAllUsers(),
                new Promise<{ id: string; full_name: string; role: string }[]>((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), 5000)
                )
            ]);
            const reviewers = (users as { id: string; full_name: string; role: string }[]).filter(
                (u) => u.role === 'reviewer'
            );
            setReviewers(reviewers.map((u) => ({ id: u.id, full_name: u.full_name })));
        } catch {
            showToast('Loading reviewers timed out. Please try again.', 'error');
        }
    };

    const pickReviewerByPriority = (priority: string) => {
        if (reviewers.length === 0) return null;
        const shuffled = [...reviewers].sort(() => Math.random() - 0.5);
        const chunkSize = Math.max(1, Math.ceil(shuffled.length / 3));
        let start = 0;
        if (priority === 'critical' || priority === 'high') {
            start = 0;
        } else if (priority === 'medium') {
            start = chunkSize;
        } else {
            start = chunkSize * 2;
        }
        const segment = shuffled.slice(start, start + chunkSize);
        const pool = segment.length > 0 ? segment : shuffled;
        return pool[Math.floor(Math.random() * pool.length)]?.id || null;
    };

    const loadRequests = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userRequests = await Promise.race([
                getChangeRequestsByUserId(user.id),
                new Promise<ChangeRequest[]>((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), 5000)
                )
            ]);
            setRequests(userRequests);
        } catch {
            showToast('Loading timed out. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (createSubmitting) return;

        setCreateSubmitAttempted(true);

        const nextErrors: { title?: string; issue?: string; solution?: string } = {};
        if (!formData.title.trim()) {
            nextErrors.title = 'Title is required.';
        }
        if (!formData.issue.trim()) {
            nextErrors.issue = 'Issue description is required.';
        }
        if (!formData.solution.trim()) {
            nextErrors.solution = 'Proposed solution is required.';
        }

        setCreateErrors(nextErrors);

        if (!formData.title.trim() || !formData.issue.trim() || !formData.solution.trim() || Object.keys(nextErrors).length > 0) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        setCreateSubmitting(true);
        try {
            const combinedDescription = [
                `Issue Description:\n${formData.issue.trim()}`,
                `Proposed Solution:\n${formData.solution.trim()}`,
                formData.impact.trim() ? `Expected Impact:\n${formData.impact.trim()}` : null,
                formData.notes.trim() ? `Additional Notes:\n${formData.notes.trim()}` : null
            ]
                .filter(Boolean)
                .join('\n\n');

            let attachmentUrl: string | null = null;

            if (attachmentFile) {
                const uploadResult = await uploadChangeRequestAttachment(attachmentFile);

                if (!uploadResult) {
                    showToast('Failed to upload attachment', 'error');
                    return;
                }

                attachmentUrl = uploadResult.url;
            }

            const reviewerId = pickReviewerByPriority(formData.priority);

            const newRequest = await createChangeRequest(
                user?.id || '',
                formData.title,
                combinedDescription,
                formData.priority,
                attachmentUrl,
                reviewerId
            );

            await notifyReviewersAndAdmins(newRequest.id, newRequest.title, user?.full_name || 'Unknown User');

            showToast('Change request submitted successfully!', 'success');
            setShowModal(false);
            setFormData({ title: '', issue: '', solution: '', impact: '', notes: '', priority: 'medium' });
            setAttachmentFile(null);
            setCreateSubmitAttempted(false);
            setCreateErrors({});
            setFileInputKey((prev) => prev + 1);
            loadRequests();
        } catch (error) {
            console.error('Submission error:', error);
            showToast('Error submitting request', 'error');
        } finally {
            setCreateSubmitting(false);
        }
    };

    const handleCreateFieldChange = (
        field: 'title' | 'issue' | 'solution' | 'impact' | 'notes' | 'priority',
        value: string
    ) => {
        setFormData((previous) => ({
            ...previous,
            [field]: value
        }));

        if (createSubmitAttempted && (field === 'title' || field === 'issue' || field === 'solution')) {
            setCreateErrors((previous) => ({
                ...previous,
                [field]: value.trim()
                    ? undefined
                    : field === 'title'
                        ? 'Title is required.'
                        : field === 'issue'
                            ? 'Issue description is required.'
                            : 'Proposed solution is required.'
            }));
        }
    };

    const getFileSizeLabel = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getRequestDisplayId = (request: ChangeRequest) => {
        const year = new Date(request.created_at).getFullYear();
        const idPart = request.id?.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
        if (!idPart) return 'CR-XXXX';
        return `CR-${Number.isNaN(year) ? 'XXXX' : year}-${idPart}`;
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

    const handleWithdrawOrDelete = async (request: ChangeRequest) => {
        const isApproved = request.status === 'approved';
        const actionLabel = isApproved ? 'delete' : 'withdraw';

        const confirmed = window.confirm(
            isApproved
                ? 'Delete this approved request? This cannot be undone.'
                : 'Withdraw this request? This cannot be undone.'
        );

        if (!confirmed) return;

        setActionLoading(true);
        const success = await deleteChangeRequest(request.id);
        setActionLoading(false);

        if (!success) {
            showToast(`Failed to ${actionLabel} request`, 'error');
            return;
        }

        showToast(
            isApproved ? 'Request deleted successfully' : 'Request withdrawn successfully',
            'success'
        );
        setSelectedRequest(null);
        loadRequests();
    };

    const handleEditRequest = (request: ChangeRequest) => {
        if (request.status === 'approved') return;
        setEditRequest(request);
        setEditFormData({
            title: request.title,
            description: request.description,
            priority: request.priority
        });
        setEditAttachmentFile(null);
        setEditFileInputKey((prev) => prev + 1);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editRequest) return;

        setActionLoading(true);

        let attachmentUrl = editRequest.attachment_url ?? null;
        if (editAttachmentFile) {
            const uploadResult = await uploadChangeRequestAttachment(editAttachmentFile);
            if (!uploadResult) {
                showToast('Failed to upload attachment', 'error');
                setActionLoading(false);
                return;
            }
            attachmentUrl = uploadResult.url;
        }

        const reviewerId = pickReviewerByPriority(editFormData.priority);
        const nextStatus = reviewerId ? 'under_review' : 'pending';

        const updated = await updateChangeRequest(editRequest.id, {
            title: editFormData.title,
            description: editFormData.description,
            priority: editFormData.priority as ChangeRequest['priority'],
            attachmentUrl,
            reviewerId,
            status: nextStatus
        });

        setActionLoading(false);

        if (!updated) {
            showToast('Failed to update request', 'error');
            return;
        }

        showToast('Request updated successfully', 'success');
        setEditRequest(null);
        setSelectedRequest(null);
        loadRequests();
    };

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length
    };

    const filteredRequests = filter === 'all'
        ? requests
        : requests.filter(r => r.status === filter);

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:h-16 sm:py-0">
                        <div className="flex items-start gap-3 sm:items-center">
                            <div className="p-2 bg-blue-600 rounded-lg">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900">User Dashboard</h1>
                                <p className="text-sm text-gray-500">Manage your change requests • Welcome, {user?.full_name}</p>
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
                                <p className="text-sm text-gray-600 mt-1">Manage your change requests</p>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
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
                                <Button
                                    onClick={() => setShowModal(true)}
                                    icon={<Plus className="w-4 h-4" />}
                                    className="w-full sm:w-auto"
                                >
                                    New Request
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardBody>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Loading requests...</p>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600">No change requests found</p>
                                <div className="mt-4 flex justify-center">
                                    <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
                                        Create your first request
                                    </Button>
                                </div>
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
                                                {' • Reviewer: '}
                                                {request.reviewer_id
                                                    ? reviewers.find((r) => r.id === request.reviewer_id)?.full_name || 'Assigned'
                                                    : 'Unassigned'}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setSelectedRequest(request)}
                                                className="w-full sm:w-auto"
                                            >
                                                View
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
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setCreateSubmitAttempted(false);
                    setCreateErrors({});
                }}
                title="Create New Change Request"
                size="lg"
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    <div className="border-b border-gray-200 pb-4">
                        <h3 className="text-xl font-bold text-gray-900">Create Change Request</h3>
                        <p className="mt-1 text-sm text-gray-500">Submit a new change proposal for review and approval.</p>
                    </div>

                    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-100 pb-2">Request Information</h4>

                        <div>
                            <div className="flex items-center justify-between gap-3 mb-1">
                                <label htmlFor="create-title" className="text-sm font-medium text-gray-700">
                                    Title <span className="text-red-600">*</span>
                                </label>
                                <span className="text-xs text-gray-500">{formData.title.length} / {titleMaxLength}</span>
                            </div>
                            <Input
                                id="create-title"
                                placeholder="Enter request title"
                                value={formData.title}
                                maxLength={titleMaxLength}
                                onChange={(e) => handleCreateFieldChange('title', e.target.value)}
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">Keep it short and descriptive.</p>
                            {createErrors.title && <p className="mt-1 text-xs text-red-600">{createErrors.title}</p>}
                        </div>
                    </section>

                    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-100 pb-2">Change Details</h4>

                        <div className="space-y-1">
                            <label htmlFor="create-issue" className="block text-sm font-medium text-gray-700">
                                Issue Description <span className="text-red-600">*</span>
                            </label>
                            <Textarea
                                id="create-issue"
                                placeholder="Describe the problem or current limitation."
                                value={formData.issue}
                                onChange={(e) => handleCreateFieldChange('issue', e.target.value)}
                                rows={4}
                                className="min-h-[100px]"
                                required
                            />
                            {createErrors.issue && <p className="text-xs text-red-600">{createErrors.issue}</p>}
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="create-solution" className="block text-sm font-medium text-gray-700">
                                Proposed Solution <span className="text-red-600">*</span>
                            </label>
                            <Textarea
                                id="create-solution"
                                placeholder="Explain the solution you are proposing."
                                value={formData.solution}
                                onChange={(e) => handleCreateFieldChange('solution', e.target.value)}
                                rows={4}
                                className="min-h-[100px]"
                                required
                            />
                            {createErrors.solution && <p className="text-xs text-red-600">{createErrors.solution}</p>}
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="create-impact" className="block text-sm font-medium text-gray-700">
                                Expected Impact <span className="text-gray-500">(Optional)</span>
                            </label>
                            <Textarea
                                id="create-impact"
                                placeholder="Describe expected benefits or impact of this change."
                                value={formData.impact}
                                onChange={(e) => handleCreateFieldChange('impact', e.target.value)}
                                rows={4}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="create-notes" className="block text-sm font-medium text-gray-700">
                                Additional Notes <span className="text-gray-500">(Optional)</span>
                            </label>
                            <Textarea
                                id="create-notes"
                                placeholder="Any extra information for the reviewer."
                                value={formData.notes}
                                onChange={(e) => handleCreateFieldChange('notes', e.target.value)}
                                rows={3}
                                className="min-h-[80px]"
                            />
                        </div>
                    </section>

                    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-100 pb-2">Priority</h4>
                        <Select
                            label="Priority Level"
                            value={formData.priority}
                            onChange={(e) => handleCreateFieldChange('priority', e.target.value)}
                            options={[
                                { value: 'critical', label: '🔴 Critical' },
                                { value: 'high', label: '🟠 High' },
                                { value: 'medium', label: '🔵 Medium' },
                                { value: 'low', label: '🟢 Low' }
                            ]}
                        />
                        <p className="text-xs text-gray-500">Select priority based on urgency and business impact.</p>
                    </section>

                    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-100 pb-2">Attachment</h4>
                        <p className="text-xs text-gray-500">Optional. Upload supporting documents if required.</p>
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                            <label htmlFor="create-attachment" className="text-sm font-medium text-gray-700 block mb-2">
                                Upload File
                            </label>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <HardDrive className="w-4 h-4" />
                                <span>Any file type is supported.</span>
                            </div>
                            <Input
                                id="create-attachment"
                                key={fileInputKey}
                                type="file"
                                accept="*/*"
                                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                            />
                            {attachmentFile ? (
                                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-700 truncate">{attachmentFile.name}</p>
                                            <p className="text-xs text-gray-500">{getFileSizeLabel(attachmentFile.size)}</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        icon={<Trash2 className="w-4 h-4" />}
                                        onClick={() => {
                                            setAttachmentFile(null);
                                            setFileInputKey((prev) => prev + 1);
                                        }}
                                    >
                                        Remove File
                                    </Button>
                                </div>
                            ) : (
                                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                                    <Upload className="w-4 h-4" />
                                    <span>No file selected</span>
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowModal(false);
                                setAttachmentFile(null);
                                setCreateSubmitAttempted(false);
                                setCreateErrors({});
                                setFormData({ title: '', issue: '', solution: '', impact: '', notes: '', priority: 'medium' });
                                setFileInputKey((prev) => prev + 1);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={createSubmitting}
                            disabled={!formData.title.trim() || !formData.issue.trim() || !formData.solution.trim() || createSubmitting}
                        >
                            Submit Request
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!selectedRequest}
                onClose={() => {
                    setSelectedRequest(null);
                    setAttachmentPreviewUrl(null);
                }}
                title="Change Request Details"
                size="lg"
            >
                {selectedRequest && (
                    <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-1 min-w-0">
                                    <h3 className="text-2xl font-bold text-gray-900 break-words">{selectedRequest.title}</h3>
                                    <p className="text-sm font-medium text-gray-500">{getRequestDisplayId(selectedRequest)}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <PriorityBadge priority={selectedRequest.priority} />
                                    <StatusBadge status={selectedRequest.status} />
                                </div>
                            </div>
                            <p className="mt-3 text-sm text-gray-600">
                                Created: {formatHeaderDate(selectedRequest.created_at)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-100 pb-2">Request Description</h4>
                            <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedRequest.description || 'No description provided.'}</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-100 pb-2">Metadata</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Assigned Reviewer</p>
                                    <p className="text-gray-800 font-medium">
                                        {selectedRequest.reviewer_id
                                            ? reviewers.find((r) => r.id === selectedRequest.reviewer_id)?.full_name || 'Assigned'
                                            : 'Unassigned'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Created Date</p>
                                    <p className="text-gray-800 font-medium">{formatHeaderDate(selectedRequest.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Priority</p>
                                    <div><PriorityBadge priority={selectedRequest.priority} /></div>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Status</p>
                                    <div><StatusBadge status={selectedRequest.status} /></div>
                                </div>
                            </div>
                        </div>

                        {selectedRequest.attachment_url && (
                            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-100 pb-2">Attachment</h4>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                        <p className="text-sm text-gray-700 truncate">{getAttachmentFileName(selectedRequest.attachment_url)}</p>
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

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900 border-b border-gray-100 pb-2">Activity</h4>
                            <div className="relative pl-6 space-y-4">
                                <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />
                                <div className="relative">
                                    <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-blue-200 border border-blue-300" />
                                    <p className="text-sm text-gray-800">Request created</p>
                                    <p className="text-xs text-gray-500">{formatHeaderDate(selectedRequest.created_at)}</p>
                                </div>
                                {selectedRequest.reviewer_id && (
                                    <div className="relative">
                                        <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-violet-200 border border-violet-300" />
                                        <p className="text-sm text-gray-800">Reviewer assigned</p>
                                        <p className="text-xs text-gray-500">{reviewers.find((r) => r.id === selectedRequest.reviewer_id)?.full_name || 'Assigned reviewer'}</p>
                                    </div>
                                )}
                                <div className="relative">
                                    <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-green-200 border border-green-300" />
                                    <p className="text-sm text-gray-800">Status changed to {selectedRequest.status.replace('_', ' ')}</p>
                                    <p className="text-xs text-gray-500">Current state</p>
                                </div>
                                {!selectedRequest.reviewer_id && (
                                    <p className="text-sm text-gray-500">No additional activity recorded.</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex gap-2">
                                {selectedRequest.status !== 'approved' && (
                                    <Button variant="secondary" onClick={() => handleEditRequest(selectedRequest)}>
                                        Edit Request
                                    </Button>
                                )}
                                <Button
                                    variant={selectedRequest.status === 'approved' ? 'danger' : 'secondary'}
                                    onClick={() => handleWithdrawOrDelete(selectedRequest)}
                                    loading={actionLoading}
                                >
                                    {selectedRequest.status === 'approved' ? 'Delete Request' : 'Withdraw Request'}
                                </Button>
                            </div>
                            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={!!editRequest}
                onClose={() => setEditRequest(null)}
                title="Edit Change Request"
                size="lg"
            >
                {editRequest && (
                    <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                        <Input
                            label="Title"
                            placeholder="Enter request title"
                            value={editFormData.title}
                            onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                            required
                        />

                        <Textarea
                            label="Description"
                            placeholder="Describe the change you're requesting"
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            rows={5}
                            required
                        />

                        <Select
                            label="Priority"
                            value={editFormData.priority}
                            onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                            options={[
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                                { value: 'critical', label: 'Critical' }
                            ]}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Replace Attachment (optional)
                            </label>
                            <Input
                                key={editFileInputKey}
                                type="file"
                                accept="*/*"
                                onChange={(e) => setEditAttachmentFile(e.target.files?.[0] ?? null)}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="submit" variant="primary" className="flex-1" loading={actionLoading}>
                                Save Changes
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditRequest(null)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
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
