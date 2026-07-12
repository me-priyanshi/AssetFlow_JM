import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import SharedTable from '../../components/SharedTable';

const EmployeeDirectoryTab = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [newRole, setNewRole] = useState('DepartmentHead');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('organization/employees/');
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!selectedEmp) return;
    try {
      await api.post(`organization/employees/${selectedEmp.id}/promote/`, { role: newRole });
      setPromotionModalOpen(false);
      fetchEmployees();
    } catch (err) {
      alert('Promotion failed');
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Department', accessor: 'department_name' },
    { header: 'Role', accessor: 'role' },
    { header: 'Status', render: (row) => (
      <span className={`px-2 py-1 text-xs rounded-full ${row.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {row.status}
      </span>
    )},
  ];

  const actionRender = (row) => {
    if (row.role === 'Employee') {
      return (
        <button 
          onClick={() => { setSelectedEmp(row); setPromotionModalOpen(true); }}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
        >
          Promote
        </button>
      );
    }
    return null;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <SharedTable columns={columns} data={employees} onAction={actionRender} />

      {promotionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Promote {selectedEmp?.name}</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select New Role</label>
              <select 
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full border border-slate-300 rounded p-2"
              >
                <option value="DepartmentHead">Department Head</option>
                <option value="AssetManager">Asset Manager</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setPromotionModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
              <button onClick={handlePromote} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Promote</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectoryTab;
