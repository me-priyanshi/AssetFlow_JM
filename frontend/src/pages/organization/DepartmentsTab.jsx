import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import SharedTable from '../../components/SharedTable';

const DepartmentsTab = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('organization/departments/');
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Name', accessor: 'name' },
    { header: 'Status', render: (row) => (
      <span className={`px-2 py-1 text-xs rounded-full ${row.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {row.status}
      </span>
    )},
  ];

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Add Department</button>
      </div>
      <SharedTable columns={columns} data={departments} />
    </div>
  );
};

export default DepartmentsTab;
