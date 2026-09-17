import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = {
  grammarCategoryId: '',
  name: '',
  displayName: '',
  description: '',
  displayOrder: 1,
  isActive: true,
};

function GrammarValues() {
  const [values, setValues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingValue, setEditingValue] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedValue, setSelectedValue] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchValues = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/grammar-values');
      setValues(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load grammar values.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/admin/grammar-categories');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load grammar categories.');
    }
  }, []);

  useEffect(() => {
    fetchValues();
    fetchCategories();
  }, [fetchValues, fetchCategories]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        description: formData.description.trim(),
        displayOrder: Number(formData.displayOrder) || 1,
        isActive: formData.isActive,
      };

      if (editingValue) {
        await api.patch(`/admin/grammar-values/${editingValue.id}`, payload);
      } else {
        await api.post('/admin/grammar-values', {
          grammarCategoryId: Number(formData.grammarCategoryId),
          ...payload,
        });
      }

      setFormData(emptyForm);
      setEditingValue(null);
      setShowForm(false);
      await fetchValues();
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to ${editingValue ? 'update' : 'create'} grammar value.`);
    } finally {
      setSaving(false);
    }
  };

  const viewValue = async (value) => {
    setDetailLoading(true);
    setError('');
    try {
      const response = await api.get(`/admin/grammar-values/${value.id}`);
      setSelectedValue(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load grammar value details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateForm = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const openCreateForm = () => {
    setEditingValue(null);
    setFormData({ ...emptyForm, grammarCategoryId: categories[0]?.id ? String(categories[0].id) : '' });
    setShowForm(true);
  };

  const openEditForm = (value) => {
    setEditingValue(value);
    setFormData({
      grammarCategoryId: value.grammarCategoryId ? String(value.grammarCategoryId) : '',
      name: value.name || '',
      displayName: value.displayName || '',
      description: value.description || '',
      displayOrder: value.displayOrder || 1,
      isActive: value.isActive !== false,
    });
    setShowForm(true);
  };

  return (
    <div className="languages-page grammar-values-page">
      <div className="languages-header">
        <div>
          <div className="languages-kicker">Grammar settings</div>
          <h1>Grammar values</h1>
          <p>Manage the learning values inside each grammar category.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={showForm ? () => setShowForm(false) : openCreateForm}>
          {showForm ? 'Close form' : '+ Add value'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form className="language-form card" onSubmit={handleSubmit}>
          <div className="language-form-heading">
            <div>
              <h2>{editingValue ? 'Edit grammar value' : 'Add grammar value'}</h2>
              <p>{editingValue ? 'Update this value without changing its category.' : 'Define a value for a grammar category.'}</p>
            </div>
          </div>
          <div className="language-form-grid">
            {editingValue ? (
              <div className="grammar-value-context language-form-wide">
                <span>Category</span>
                <strong>{editingValue.grammarCategoryName || editingValue.grammarCategoryId}</strong>
                <small>{editingValue.languageName || editingValue.languageId}{editingValue.languageCode ? ` (${editingValue.languageCode})` : ''}</small>
              </div>
            ) : (
              <label>Grammar category
                <select value={formData.grammarCategoryId} onChange={(event) => updateForm('grammarCategoryId', event.target.value)} required>
                  <option value="">Select category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.displayName || category.name}{category.languageName ? ` (${category.languageName})` : ''}</option>)}
                </select>
              </label>
            )}
            <label>Name<input value={formData.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Present Tense" required /></label>
            <label>Display name<input value={formData.displayName} onChange={(event) => updateForm('displayName', event.target.value)} placeholder="Present Tense" required /></label>
            <label>Display order<input type="number" min="1" value={formData.displayOrder} onChange={(event) => updateForm('displayOrder', event.target.value)} required /></label>
            <label className="language-form-wide">Description<textarea value={formData.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Example values for present tense grammar" rows="3" /></label>
          </div>
          <div className="language-toggles"><label><input type="checkbox" checked={formData.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} /> Value active</label></div>
          <div className="language-form-actions">
            <button className="btn" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={saving || (!editingValue && !categories.length)}>{saving ? 'Saving...' : editingValue ? 'Update value' : 'Save value'}</button>
          </div>
        </form>
      )}

      <div className="card languages-card">
        <div className="languages-card-heading">
          <div><h2>Grammar values</h2><p>{values.length} value{values.length === 1 ? '' : 's'} configured</p></div>
          <button className="btn btn-sm" type="button" onClick={fetchValues} disabled={loading}>Refresh</button>
        </div>
        {loading ? <div className="loading">Loading grammar values...</div> : values.length === 0 ? <div className="language-empty">No grammar values configured yet.</div> : (
          <div className="languages-table-wrap">
            <table className="languages-table">
              <thead><tr><th>Order</th><th>Category</th><th>Language</th><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{values.map((value) => (
                <tr key={value.id}>
                  <td>{value.displayOrder}</td>
                  <td><span className="language-code">{value.grammarCategoryName || value.grammarCategoryId}</span></td>
                  <td><strong>{value.languageName || value.languageId}</strong><small className="grammar-category-name">{value.languageCode || '—'}</small></td>
                  <td><strong>{value.displayName || value.name}</strong><small className="grammar-category-name">{value.name}</small></td>
                  <td>{value.description || '—'}</td>
                  <td><span className={`badge ${value.isActive ? 'badge-active' : 'badge-inactive'}`}>{value.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="language-actions"><button className="btn btn-sm btn-primary" type="button" onClick={() => openEditForm(value)}>Edit</button><button className="btn btn-sm" type="button" onClick={() => viewValue(value)}>View details</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {(detailLoading || selectedValue) && (
        <div className="modal" onClick={() => !detailLoading && setSelectedValue(null)}>
          <div className="modal-content language-detail-modal" onClick={(event) => event.stopPropagation()}>
            {detailLoading ? <div className="loading">Loading value...</div> : (
              <>
                <div className="language-detail-heading"><div><div className="languages-kicker">Grammar value details</div><h2>{selectedValue.displayName || selectedValue.name}</h2></div><button className="word-modal-close" type="button" onClick={() => setSelectedValue(null)}>x</button></div>
                <div className="language-detail-grid">
                  <div><span>Grammar category</span><strong>{selectedValue.grammarCategoryName || selectedValue.grammarCategoryId}</strong></div>
                  <div><span>Language</span><strong>{selectedValue.languageName || selectedValue.languageId}{selectedValue.languageCode ? ` (${selectedValue.languageCode})` : ''}</strong></div>
                  <div><span>Name</span><strong>{selectedValue.name}</strong></div>
                  <div><span>Display order</span><strong>{selectedValue.displayOrder}</strong></div>
                  <div><span>Status</span><strong>{selectedValue.isActive ? 'Active' : 'Inactive'}</strong></div>
                  <div className="language-detail-wide"><span>Description</span><p>{selectedValue.description || '—'}</p></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GrammarValues;
