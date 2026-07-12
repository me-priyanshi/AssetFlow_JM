import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import SharedTable from '../../components/SharedTable';
import Modal from '../../components/Modal';

const CATEGORY_TYPES = ['Electronics', 'Furniture', 'Vehicles', 'Software', 'Other'];
const INITIAL_FORM = { name: '', type: 'Electronics', status: 'Active', extra_fields_raw: '' };

const AssetCategoriesTab = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const openModal = () => {
    setForm(INITIAL_FORM);
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!submitting) setModalOpen(false);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Parse extra_fields from "key:type, key:type" shorthand into a JSON object
    let extra_fields = null;
    if (form.extra_fields_raw.trim()) {
      try {
        const pairs = form.extra_fields_raw.split(',').map((s) => s.trim()).filter(Boolean);
        extra_fields = {};
        for (const pair of pairs) {
          const [key, type = 'string'] = pair.split(':').map((s) => s.trim());
          if (!key) throw new Error('Invalid format');
          extra_fields[key] = type;
        }
      } catch {
        setError('Extra Fields format is invalid. Use: fieldname:type, fieldname:type');
        setSubmitting(false);
        return;
      }
    }

    try {
      await api.post('organization/categories/', {
        name: form.name,
        type: form.type,
        status: form.status,
        extra_fields,
      });
      setModalOpen(false);
      await fetchCategories();   // ← refresh table
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ');
        setError(messages);
      } else {
        setError('Failed to create category.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Type', accessor: 'type' },
    {
      header: 'Extra Fields',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.extra_fields ? Object.keys(row.extra_fields).join(', ') : 'None'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            row.status === 'Active'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openModal}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          + Add Category
        </button>
      </div>

      <SharedTable columns={columns} data={categories} />

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title="Add Asset Category">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Laptops"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Extra Fields
              <span className="ml-1 text-xs text-slate-400 font-normal">
                (optional – format: <code>fieldname:type</code>, comma-separated)
              </span>
            </label>
            <input
              type="text"
              name="extra_fields_raw"
              value={form.extra_fields_raw}
              onChange={handleChange}
              placeholder="warranty_months:integer, color:string"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssetCategoriesTab;
