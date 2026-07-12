import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import SharedTable from '../../components/SharedTable';
import StatusBadge from '../../components/StatusBadge';
import AssetFormModal from './AssetFormModal';

const WRITE_ROLES = ['Admin', 'AssetManager', 'DepartmentHead'];

const AssetList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({ category: '', status: '', location: '', search: '' });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.status)   params.append('status', filters.status);
      if (filters.location) params.append('location', filters.location);
      if (filters.search)   params.append('search', filters.search);
      const res = await api.get(`assets/?${params.toString()}`);
      setAssets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    api.get('organization/categories/').then(r => setCategories(r.data)).catch(() => {});
    api.get('organization/departments/').then(r => setDepartments(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const columns = [
    { header: 'Asset Tag', render: (row) => (
      <span className="font-mono font-semibold text-blue-600">{row.asset_tag}</span>
    )},
    { header: 'Name', accessor: 'name' },
    { header: 'Category', accessor: 'category_name' },
    { header: 'Location', render: (row) => row.location || <span className="text-slate-400">—</span> },
    { header: 'Condition', accessor: 'condition' },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const STATUSES = ['Available','Allocated','Reserved','Under Maintenance','Lost','Retired','Disposed'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Asset Directory</h1>
            <p className="text-sm text-slate-500 mt-0.5">{assets.length} asset{assets.length !== 1 ? 's' : ''} found</p>
          </div>
          {WRITE_ROLES.includes(user?.role) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              + Register Asset
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search tag or serial…"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          />
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.category}
            onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="text"
            placeholder="Filter by location…"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            value={filters.location}
            onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))}
          />
          <button
            onClick={() => setFilters({ category: '', status: '', location: '', search: '' })}
            className="text-sm text-slate-500 hover:text-slate-800 px-3 py-2 border border-slate-200 rounded-lg"
          >
            Clear
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20 text-slate-400">Loading…</div>
        ) : (
          <SharedTable
            columns={columns}
            data={assets}
            onAction={(row) => (
              <button
                onClick={() => navigate(`/assets/${row.id}`)}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                View →
              </button>
            )}
          />
        )}
      </div>

      {showCreateModal && (
        <AssetFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchAssets(); }}
          categories={categories}
          departments={departments}
        />
      )}
    </div>
  );
};

export default AssetList;
