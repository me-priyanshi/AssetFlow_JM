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
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returning, setReturning] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const isManager = WRITE_ROLES.includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [mineRes, overdueRes] = await Promise.all([
        api.get('allocations/?mine=true&status=Active'),
        api.get('allocations/?is_overdue=true'),
      ]);
      setMyAllocations(Array.isArray(mineRes.data) ? mineRes.data : []);
      setOverdue(Array.isArray(overdueRes.data) ? overdueRes.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReturn = async () => {
    if (!returnTarget) return;
    if (!returnNotes.trim()) {
      alert('Please fill in condition check-in notes (e.g. "minor scratch on lid").');
      return;
    }
    setReturning(true);
    try {
      await api.post(`allocations/${returnTarget.id}/return/`, {
        checkin_condition_notes: returnNotes.trim(),
      });
      setReturnTarget(null);
      setReturnNotes('');
      setSuccessMsg(`${returnTarget.asset_tag} marked as returned — now Available.`);
      load();
    } catch (err) {
      const data = err.response?.data;
      alert(
        data?.checkin_condition_notes
        || data?.detail
        || 'Return failed.'
      );
    } finally {
      setReturning(false);
    }
  };

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

  const returnAction = (row) => (
    <button
      type="button"
      onClick={() => { setReturnTarget(row); setReturnNotes(''); }}
      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
      title={
        row.expected_return_date
          ? `You can return this anytime (expected ${row.expected_return_date})`
          : 'Return this asset now'
      }
    >
      Return Asset
    </button>
  );

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
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm flex justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-600">&times;</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-slate-400">Loading…</div>
        ) : (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-800">My Allocated Assets</h2>
                <span className="text-sm text-slate-500">
                  {myAllocations.length} active · return anytime (even before expected date)
                </span>
              </div>
              <SharedTable
                columns={allocationColumns}
                data={myAllocations}
                onAction={returnAction}
              />
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

      {/* Flow D — return from dashboard */}
      {returnTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Mark Asset Returned</h2>
            <p className="text-sm text-slate-500 font-mono mb-4">
              {returnTarget.asset_tag} — {returnTarget.asset_name}
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Condition Check-in Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder='e.g. "minor scratch on lid"'
              value={returnNotes}
              onChange={e => setReturnNotes(e.target.value)}
              required
            />
            <p className="text-xs text-slate-400 mt-2">
              Required. Describe the asset condition on return. You can return before the expected date.
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setReturnTarget(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReturn}
                disabled={returning || !returnNotes.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {returning ? 'Processing…' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
