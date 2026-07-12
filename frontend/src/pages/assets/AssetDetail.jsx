import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import SharedTable from '../../components/SharedTable';
import AssetFormModal from './AssetFormModal';
import AllocationModal from '../allocations/AllocationModal';

const WRITE_ROLES = ['Admin', 'AssetManager'];

const AssetDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [categories, setCategories] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [returning, setReturning] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAsset = async () => {
    setLoading(true);
    try {
      const res = await api.get(`assets/${id}/`);
      setAsset(res.data);
    } catch { navigate('/assets'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAsset();
    api.get('organization/categories/').then(r => setCategories(r.data)).catch(() => {});
  }, [id]);

  const activeAllocation = asset?.allocation_history?.find(a => a.status === 'Active');

  const handleReturn = async () => {
    if (!activeAllocation) return;
    setReturning(true);
    try {
      await api.post(`allocations/${activeAllocation.id}/return/`, { checkin_condition_notes: returnNotes });
      setShowReturnForm(false);
      setReturnNotes('');
      setSuccessMsg('Asset marked as returned successfully.');
      fetchAsset();
    } catch (err) {
      alert(err.response?.data?.detail || 'Return failed.');
    } finally { setReturning(false); }
  };

  const handleAllocateSuccess = (type) => {
    setShowAllocateModal(false);
    setSuccessMsg(type === 'transfer' ? 'Transfer request submitted.' : 'Asset allocated successfully.');
    fetchAsset();
  };

  if (loading) return <div className="flex justify-center py-20 text-slate-400">Loading…</div>;
  if (!asset) return null;

  const allocationColumns = [
    { header: 'Holder', render: (row) => row.employee_name || row.department_name || '—' },
    { header: 'Allocated', accessor: 'allocated_date' },
    { header: 'Expected Return', render: (row) => row.expected_return_date || '—' },
    { header: 'Actual Return', render: (row) => row.actual_return_date || '—' },
    { header: 'Status', render: (row) => {
      const label = (row.status === 'Active' && row.is_overdue) ? 'Overdue' : row.status;
      return <StatusBadge status={label} />;
    }},
    { header: 'Condition Notes', render: (row) => row.checkin_condition_notes || <span className="text-slate-400">—</span> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate('/assets')} className="text-sm text-blue-600 hover:underline mb-3 block">
            ← Back to Assets
          </button>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono font-bold text-xl text-blue-600">{asset.asset_tag}</span>
                <StatusBadge status={asset.status} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">{asset.name}</h1>
              <p className="text-slate-500 text-sm">{asset.category_name} · {asset.location || 'No location'}</p>
            </div>
            <div className="flex gap-2">
              {WRITE_ROLES.includes(user?.role) && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
              )}
              {asset.status === 'Available' && WRITE_ROLES.includes(user?.role) && (
                <button
                  onClick={() => setShowAllocateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Allocate
                </button>
              )}
              {asset.status === 'Allocated' && WRITE_ROLES.includes(user?.role) && (
                <>
                  <button
                    onClick={() => setShowAllocateModal(true)}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() => setShowReturnForm(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                  >
                    Mark Returned
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6">
        {successMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm flex justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-600">&times;</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {['overview', 'allocation_history', 'maintenance_history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-semibold text-slate-700">Asset Details</h3>
              {[
                ['Serial Number', asset.serial_number || '—'],
                ['Condition', asset.condition],
                ['Location', asset.location || '—'],
                ['Acquisition Date', asset.acquisition_date || '—'],
                ['Acquisition Cost', asset.acquisition_cost ? `₹${parseFloat(asset.acquisition_cost).toLocaleString()}` : '—'],
                ['Bookable', asset.is_bookable ? 'Yes' : 'No'],
                ['Created', new Date(asset.created_at).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-800">{val}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {asset.photo && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">Photo</h3>
                  <img
                    src={asset.photo.startsWith('http') ? asset.photo : `http://localhost:8000${asset.photo}`}
                    alt="Asset"
                    className="w-full rounded-lg object-cover max-h-48"
                  />
                </div>
              )}
              {asset.documents?.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">Documents</h3>
                  <ul className="space-y-2">
                    {asset.documents.map(doc => (
                      <li key={doc.id}>
                        <a
                          href={doc.file.startsWith('http') ? doc.file : `http://localhost:8000${doc.file}`}
                          target="_blank" rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          📄 {doc.file.split('/').pop()}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Allocation History Tab */}
        {activeTab === 'allocation_history' && (
          <SharedTable columns={allocationColumns} data={asset.allocation_history || []} />
        )}

        {/* Maintenance History Tab */}
        {activeTab === 'maintenance_history' && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="text-4xl mb-3">🔧</div>
            <h3 className="font-semibold text-slate-700 mb-1">No maintenance records yet</h3>
            <p className="text-sm text-slate-400">Maintenance history will appear here once Feature 6 is built.</p>
          </div>
        )}
      </div>

      {/* Return Form */}
      {showReturnForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Mark Asset Returned</h2>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Condition Check-in Notes <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the asset condition on return…"
              value={returnNotes}
              onChange={e => setReturnNotes(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowReturnForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
              <button
                onClick={handleReturn}
                disabled={returning}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {returning ? 'Processing…' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <AssetFormModal
          asset={asset}
          categories={categories}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); fetchAsset(); }}
        />
      )}

      {showAllocateModal && (
        <AllocationModal
          asset={asset}
          onClose={() => setShowAllocateModal(false)}
          onSuccess={handleAllocateSuccess}
        />
      )}
    </div>
  );
};

export default AssetDetail;
