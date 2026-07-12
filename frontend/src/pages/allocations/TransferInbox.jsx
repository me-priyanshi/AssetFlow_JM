import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import SharedTable from '../../components/SharedTable';
import StatusBadge from '../../components/StatusBadge';

const APPROVE_ROLES = ['Admin', 'AssetManager', 'DepartmentHead'];

const TransferInbox = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Requested');
  const [processingId, setProcessingId] = useState(null);

  const canApprove = APPROVE_ROLES.includes(user?.role);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`transfer-requests/${params}`);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]);

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      await api.post(`transfer-requests/${id}/${action}/`);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.detail || `${action} failed.`);
    } finally {
      setProcessingId(null);
    }
  };

  const columns = [
    { header: 'Asset', render: (row) => (
      <div>
        <span className="font-mono font-semibold text-blue-600 text-sm">{row.asset_tag}</span>
        <p className="text-xs text-slate-500">{row.asset_name}</p>
      </div>
    )},
    { header: 'Requested By', accessor: 'requested_by_name' },
    { header: 'Transfer To', render: (row) => (
      row.requested_for_employee_name || row.requested_for_department_name || '—'
    )},
    { header: 'Approved By', render: (row) => row.approved_by_name || '—' },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Date', render: (row) => new Date(row.created_at).toLocaleDateString() },
  ];

  const actionRender = (row) => {
    if (!canApprove || row.status !== 'Requested') return null;
    const busy = processingId === row.id;
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleAction(row.id, 'approve')}
          disabled={busy}
          className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? '…' : 'Approve'}
        </button>
        <button
          onClick={() => handleAction(row.id, 'reject')}
          disabled={busy}
          className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50"
        >
          {busy ? '…' : 'Reject'}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Transfer Requests</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {canApprove
                ? 'Review and approve pending asset transfer requests.'
                : 'Transfers you submitted or that name you as the new holder.'}
            </p>
          </div>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {['Requested', 'Rejected', 'Re-allocated'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-20 text-slate-400">Loading…</div>
        ) : (
          <SharedTable columns={columns} data={requests} onAction={actionRender} />
        )}
      </div>
    </div>
  );
};

export default TransferInbox;
