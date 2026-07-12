import React, { useState } from 'react';
import api from '../../api/axiosConfig';

const CONDITION_OPTIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];

const AssetFormModal = ({ onClose, onSuccess, categories, asset = null }) => {
  const isEdit = Boolean(asset);
  const [form, setForm] = useState({
    name: asset?.name || '',
    category: asset?.category || '',
    serial_number: asset?.serial_number || '',
    acquisition_date: asset?.acquisition_date || '',
    acquisition_cost: asset?.acquisition_cost || '',
    condition: asset?.condition || 'New',
    location: asset?.location || '',
    is_bookable: asset?.is_bookable || false,
  });
  const [photo, setPhoto] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleDocumentChange = (e) => {
    const files = Array.from(e.target.files);
    const nonPdfs = files.filter(f => !f.name.toLowerCase().endsWith('.pdf'));
    if (nonPdfs.length > 0) {
      setError('Only PDF files are allowed for documents.');
      return;
    }
    setError('');
    setDocuments(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== null) formData.append(key, val);
      });
      if (photo) formData.append('photo', photo);

      let savedAsset;
      if (isEdit) {
        const res = await api.patch(`assets/${asset.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        savedAsset = res.data;
      } else {
        const res = await api.post('assets/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        savedAsset = res.data;
      }

      // Upload documents separately
      for (const doc of documents) {
        const docForm = new FormData();
        docForm.append('file', doc);
        await api.post(`assets/${savedAsset.id}/upload-document/`, docForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSuccess(savedAsset);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data) : 'Failed to save asset.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">
            {isEdit ? 'Edit Asset' : 'Register New Asset'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Asset Tag (read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Asset Tag</label>
              <input
                type="text"
                disabled
                value={asset?.asset_tag || 'Auto-generated on save'}
                className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name <span className="text-red-500">*</span></label>
              <input
                type="text" name="name" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name} onChange={handleChange}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
              <select
                name="category" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.category} onChange={handleChange}
              >
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
              <input
                type="text" name="serial_number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.serial_number} onChange={handleChange}
              />
            </div>

            {/* Acquisition Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Acquisition Date</label>
              <input
                type="date" name="acquisition_date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.acquisition_date} onChange={handleChange}
              />
            </div>

            {/* Acquisition Cost */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Acquisition Cost (₹)</label>
              <input
                type="number" name="acquisition_cost" step="0.01" min="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.acquisition_cost} onChange={handleChange}
              />
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
              <select
                name="condition"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.condition} onChange={handleChange}
              >
                {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text" name="location"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.location} onChange={handleChange}
                placeholder="e.g. Floor 2, Rack B"
              />
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo</label>
            <input
              type="file" accept="image/*"
              className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
              onChange={(e) => setPhoto(e.target.files[0])}
            />
          </div>

          {/* Documents */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Documents <span className="text-slate-400 text-xs">(PDF only)</span></label>
            <input
              type="file" accept=".pdf" multiple
              className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-50 file:text-slate-700 file:font-medium hover:file:bg-slate-100"
              onChange={handleDocumentChange}
            />
            {documents.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">{documents.length} PDF(s) selected</p>
            )}
          </div>

          {/* Is Bookable */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox" name="is_bookable" id="is_bookable"
              className="w-4 h-4 rounded text-blue-600"
              checked={form.is_bookable} onChange={handleChange}
            />
            <label htmlFor="is_bookable" className="text-sm font-medium text-slate-700">
              Allow booking for this asset
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Update Asset' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetFormModal;
