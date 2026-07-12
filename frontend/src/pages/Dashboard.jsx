import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import SharedTable from '../components/SharedTable';
import StatusBadge from '../components/StatusBadge';

const WRITE_ROLES = ['Admin', 'AssetManager', 'DepartmentHead'];

const Dashboard = () => {
  const { user } = useAuth();
  const [myAllocations, setMyAllocations] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const isManager = WRITE_ROLES.includes(user?.role);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [mineRes, overdueRes] = await Promise.all([
          api.get('allocations/?mine=true&status=Active'),
          api.get('allocations/?is_overdue=true'),
        ]);
        setMyAllocations(mineRes.data);
        setOverdue(overdueRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const allocationColumns = [
    {
      header: 'Asset',
      render: (row) => (
        <Link to={`/assets/${row.asset}`} className="group">
          <span className="font-mono font-semibold text-blue-600 text-sm group-hover:underline">
            {row.asset_tag}
          </span>
          <p className="text-xs text-slate-500">{row.asset_name}</p>
        </Link>
      ),
    },
    {
      header: 'Holder',
      render: (row) => row.employee_name || row.department_name || '—',
    },
    { header: 'Allocated', accessor: 'allocated_date' },
    {
      header: 'Expected Return',
      render: (row) => row.expected_return_date || '—',
    },
    {
      header: 'Status',
      render: (row) => (
        <StatusBadge status={row.is_overdue ? 'Overdue' : row.status} />
      ),
    },
  ];

  const overdueColumns = [
    {
      header: 'Asset',
      render: (row) => (
        <Link to={`/assets/${row.asset}`} className="group">
          <span className="font-mono font-semibold text-blue-600 text-sm group-hover:underline">
            {row.asset_tag}
          </span>
          <p className="text-xs text-slate-500">{row.asset_name}</p>
        </Link>
      ),
    },
    {
      header: 'Holder',
      render: (row) => row.employee_name || row.department_name || '—',
    },
    {
      header: 'Expected Return',
      render: (row) => (
        <span className="text-red-600 font-medium">{row.expected_return_date}</span>
      ),
    },
    {
      header: 'Status',
      render: () => <StatusBadge status="Overdue" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome{user?.name ? `, ${user.name}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Your allocations and overdue returns at a glance.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/assets"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Browse Assets
            </Link>
            <Link
              to="/transfers"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              Transfers
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6 space-y-8">
        {loading ? (
          <div className="flex justify-center py-20 text-slate-400">Loading…</div>
        ) : (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-800">My Allocated Assets</h2>
                <span className="text-sm text-slate-500">{myAllocations.length} active</span>
              </div>
              <SharedTable columns={allocationColumns} data={myAllocations} />
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-800">Overdue Returns</h2>
                <span className="text-sm text-slate-500">
                  {isManager ? 'Organization-wide' : 'Your overdue items'} · {overdue.length}
                </span>
              </div>
              <SharedTable columns={overdueColumns} data={overdue} />
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
