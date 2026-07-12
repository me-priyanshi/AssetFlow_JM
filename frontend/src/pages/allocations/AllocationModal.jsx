import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

const AllocationModal = ({ asset, activeAllocation, initialMode = 'allocate', onClose, onSuccess }) => {
  const [mode, setMode] = useState(initialMode); // 'allocate' | 'conflict'
  const [holderType, setHolderType] = useState('employee'); // 'employee' | 'department'
  const [targetId, setTargetId] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [conflictInfo, setConflictInfo] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadHolders = async () => {
      try {
        const [empRes, deptRes] = await Promise.all([
          api.get('organization/employees/?status=Active'),
          api.get('organization/departments/?status=Active'),
        ]);
        if (cancelled) return;
        setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.results || []);
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.results || []);
      } catch (err) {
        if (!cancelled) {
          setEmployees([]);
          setDepartments([]);
          setError(err.response?.data?.detail || 'Could not load employees/departments.');
        }
      }
    };
    loadHolders();
    return () => { cancelled = true; };
  }, []);

  // When opened from Transfer on an already-allocated asset, skip allocate → show conflict UI
  useEffect(() => {
    if (initialMode === 'transfer' && activeAllocation) {
      setConflictInfo({
        detail: 'Asset is already allocated.',
        current_holder: {
          id: activeAllocation.employee || activeAllocation.department,
          name: activeAllocation.employee_name || activeAllocation.department_name || 'Unknown',
          type: activeAllocation.employee ? 'employee' : 'department',
          allocation_id: activeAllocation.id,
        },
      });
      setMode('conflict');
    }
  }, [initialMode, activeAllocation]);

  const handleAllocate = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        asset: asset.id,
        allocated_date: new Date().toISOString().split('T')[0],
        ...(holderType === 'employee' ? { employee: targetId } : { department: targetId }),
        ...(expectedReturn ? { expected_return_date: expectedReturn } : {}),
      };
      await api.post('allocations/', payload);
      onSuccess();
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictInfo(err.response.data);
        setMode('conflict');
      } else {
        const data = err.response?.data;
        setError(
          data?.detail
          || (typeof data === 'object' ? Object.values(data).flat().join(' ') : null)
          || 'Allocation failed.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTransferRequest = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        allocation: conflictInfo.current_holder.allocation_id,
        ...(holderType === 'employee'
          ? { requested_for_employee: targetId }
          : { requested_for_department: targetId }),
      };
      await api.post('transfer-requests/', payload);
      onSuccess('transfer');
    } catch (err) {
      const data = err.response?.data;
      let message = data?.detail || 'Transfer request failed.';
      if (!data?.detail && data && typeof data === 'object') {
        message = Object.entries(data)
          .map(([field, msgs]) => `${field}: ${[].concat(msgs).join(' ')}`)
          .join(' · ');
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const options = holderType === 'employee' ? employees : departments;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {mode === 'conflict' ? 'Request Asset Transfer' : 'Allocate Asset'}
            </h2>
            <p className="text-sm text-slate-500 font-mono">{asset.asset_tag} — {asset.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {mode === 'conflict' && conflictInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">Asset Already Allocated</p>
              <p className="text-sm text-amber-700">
                Currently held by:{' '}
                <span className="font-bold">{conflictInfo.current_holder.name}</span>
                <span className="text-amber-500 text-xs ml-2 capitalize">
                  ({conflictInfo.current_holder.type})
                </span>
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Submit a transfer request to re-assign this asset. An approver must accept it.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {mode === 'conflict' ? 'Transfer to' : 'Assign to'}
            </label>
            <div className="flex gap-2 mb-3">
              {['employee', 'department'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setHolderType(t); setTargetId(''); }}
                  className={`flex-1 py-1.5 text-sm rounded-lg border font-medium capitalize transition-colors ${
                    holderType === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">
                Select {holderType}…
              </option>
              {options.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.email ? ` (${item.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          {mode !== 'conflict' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expected Return Date <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 pt-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">
            Cancel
          </button>
          {mode === 'conflict' ? (
            <button
              onClick={handleTransferRequest}
              disabled={saving || !targetId}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Submitting…' : 'Request Transfer'}
            </button>
          ) : (
            <button
              onClick={handleAllocate}
              disabled={saving || !targetId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Allocating…' : 'Allocate Asset'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllocationModal;
