import { useState, useEffect } from 'react';
import { Plus, FileText, Clock, CheckCircle, XCircle, LogOut, Filter, HardDrive } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Modal } from '../components/Modal';
import { Input, Textarea, Select } from '../components/Input';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { 
  getChangeRequestsByUserId,
  createChangeRequest,
  ChangeRequest
} from '../lib/data';
import { notifyReviewersAndAdmins } from '../lib/notifications';

export const UserDashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    const userRequests = await getChangeRequestsByUserId(user.id);
    setRequests(userRequests);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      // Create request in local storage
      const newRequest = await createChangeRequest(
        user?.id || '',
        formData.title,
        formData.description,
        formData.priority
      );

      // Notify reviewers and admins
      await notifyReviewersAndAdmins(newRequest.id, newRequest.title, user?.full_name || 'Unknown User');

      showToast('Change request submitted successfully!', 'success');
      setShowModal(false);
      setFormData({ title: '', description: '', priority: 'medium' });
      loadRequests();
    } catch (error) {
      console.error('Submission error:', error);
      showToast('Error submitting request', 'error');
    }
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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">User Dashboard</h1>
                <p className="text-sm text-gray-500">Manage your change requests • Welcome, {user?.full_name}</p>
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
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Change Requests</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your change requests</p>
              </div>
              <Button onClick={() => setShowModal(true)} icon={<Plus className="w-4 h-4" />}>
                New Request
              </Button>
            </div>
          </CardHeader>

          <CardBody>
            <div className="mb-4 flex items-center gap-2">
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
                className="max-w-xs"
              />
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No change requests found</p>
                <Button className="mt-4" onClick={() => setShowModal(true)}>
                  Create your first request
                </Button>
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
                    <div className="text-xs text-gray-500">
                      Created: {new Date(request.created_at).toLocaleDateString()}
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
        onClose={() => setShowModal(false)}
        title="Create New Change Request"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Title"
            placeholder="Enter request title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <Textarea
            label="Description"
            placeholder="Describe the change you're requesting"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={5}
            required
          />

          <Select
            label="Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' }
            ]}
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" className="flex-1">
              Submit Request
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
