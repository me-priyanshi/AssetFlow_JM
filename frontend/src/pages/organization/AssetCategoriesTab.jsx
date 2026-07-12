import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import SharedTable from '../../components/SharedTable';

const AssetCategoriesTab = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('organization/categories/');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Type', accessor: 'type' },
    { header: 'Extra Fields', render: (row) => (
      <span className="text-xs text-slate-500">
        {row.extra_fields ? Object.keys(row.extra_fields).join(', ') : 'None'}
      </span>
    )},
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
        <button className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Add Category</button>
      </div>
      <SharedTable columns={columns} data={categories} />
    </div>
  );
};

export default AssetCategoriesTab;
