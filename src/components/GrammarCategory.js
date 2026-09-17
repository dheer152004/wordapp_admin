import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = {
  languageId: '',
  name: '',
  displayName: '',
  description: '',
  displayOrder: 1,
  isActive: true,
};

function GrammarCategory() {
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/grammar-categories');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load grammar categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLanguages = useCallback(async () => {
    try {
      const response = await api.get('/admin/languages');
      setLanguages(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load languages.');
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchLanguages();
  }, [fetchCategories, fetchLanguages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        languageId: Number(formData.languageId),
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        description: formData.description.trim(),
        displayOrder: Number(formData.displayOrder) || 1,
        isActive: formData.isActive,
      };

      if (editingCategory) {
        await api.patch(`/admin/grammar-categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/admin/grammar-categories', payload);
      }

      setFormData(emptyForm);
      setEditingCategory(null);
      setShowForm(false);
      await fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to ${editingCategory ? 'update' : 'create'} grammar category.`);
    } finally {
      setSaving(false);
    }
  };

  const viewCategory = async (category) => {
    setDetailLoading(true);
    setError('');
    try {
      const response = await api.get(`/admin/grammar-categories/${category.id}`);
      setSelectedCategory(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load grammar category details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateForm = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const openCreateForm = () => {
    setEditingCategory(null);
    setFormData({ ...emptyForm, languageId: languages[0]?.id ? String(languages[0].id) : '' });
    setShowForm(true);
  };

  const openEditForm = (category) => {
    setEditingCategory(category);
    setFormData({
      languageId: category.languageId ? String(category.languageId) : '',
      name: category.name || '',
      displayName: category.displayName || '',
      description: category.description || '',
      displayOrder: category.displayOrder || 1,
      isActive: category.isActive !== false,
    });
    setShowForm(true);
  };

  return (
    <div className="languages-page grammar-category-page">
      <div className="languages-header">
        <div>
          <div className="languages-kicker">Grammar settings</div>
          <h1>Grammar categories</h1>
          <p>Organize grammar lessons into language-specific categories.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={showForm ? () => setShowForm(false) : openCreateForm}>
          {showForm ? 'Close form' : '+ Add category'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form className="language-form card" onSubmit={handleSubmit}>
          <div className="language-form-heading">
            <div>
              <h2>{editingCategory ? 'Edit grammar category' : 'Add grammar category'}</h2>
              <p>{editingCategory ? 'Update this category without changing its language.' : 'Define a category for a language.'}</p>
            </div>
          </div>
          <div className="language-form-grid">
            <label>Language
              <select value={formData.languageId} onChange={(event) => updateForm('languageId', event.target.value)} required>
                <option value="">Select language</option>
                {languages.map((language) => <option key={language.id} value={language.id}>{language.name} ({language.code})</option>)}
              </select>
            </label>
            <label>Name<input value={formData.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Tenses" required /></label>
            <label>Display name<input value={formData.displayName} onChange={(event) => updateForm('displayName', event.target.value)} placeholder="Tenses" required /></label>
            <label>Display order<input type="number" min="1" value={formData.displayOrder} onChange={(event) => updateForm('displayOrder', event.target.value)} required /></label>
            <label className="language-form-wide">Description<textarea value={formData.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Verb tense categories for grammar learning" rows="3" /></label>
          </div>
          <div className="language-toggles"><label><input type="checkbox" checked={formData.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} /> Category active</label></div>
          <div className="language-form-actions">
            <button className="btn" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={saving || (!editingCategory && !languages.length)}>{saving ? 'Saving...' : editingCategory ? 'Update category' : 'Save category'}</button>
          </div>
        </form>
      )}

      <div className="card languages-card">
        <div className="languages-card-heading">
          <div><h2>Grammar categories</h2><p>{categories.length} categor{categories.length === 1 ? 'y' : 'ies'} configured</p></div>
          <button className="btn btn-sm" type="button" onClick={fetchCategories} disabled={loading}>Refresh</button>
        </div>
        {loading ? <div className="loading">Loading grammar categories...</div> : categories.length === 0 ? <div className="language-empty">No grammar categories configured yet.</div> : (
          <div className="languages-table-wrap">
            <table className="languages-table">
              <thead><tr><th>Order</th><th>Language</th><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.displayOrder}</td>
                  <td><span className="language-code">{category.languageName || category.languageId}</span></td>
                  <td><strong>{category.displayName || category.name}</strong><small className="grammar-category-name">{category.name}</small></td>
                  <td>{category.description || '—'}</td>
                  <td><span className={`badge ${category.isActive ? 'badge-active' : 'badge-inactive'}`}>{category.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="language-actions"><button className="btn btn-sm btn-primary" type="button" onClick={() => openEditForm(category)}>Edit</button><button className="btn btn-sm" type="button" onClick={() => viewCategory(category)}>View details</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {(detailLoading || selectedCategory) && (
        <div className="modal" onClick={() => !detailLoading && setSelectedCategory(null)}>
          <div className="modal-content language-detail-modal" onClick={(event) => event.stopPropagation()}>
            {detailLoading ? <div className="loading">Loading category...</div> : (
              <>
                <div className="language-detail-heading"><div><div className="languages-kicker">Grammar category details</div><h2>{selectedCategory.displayName || selectedCategory.name}</h2></div><button className="word-modal-close" type="button" onClick={() => setSelectedCategory(null)}>x</button></div>
                <div className="language-detail-grid">
                  <div><span>Language</span><strong>{selectedCategory.languageName || selectedCategory.languageId}</strong></div>
                  <div><span>Name</span><strong>{selectedCategory.name}</strong></div>
                  <div><span>Display order</span><strong>{selectedCategory.displayOrder}</strong></div>
                  <div><span>Status</span><strong>{selectedCategory.isActive ? 'Active' : 'Inactive'}</strong></div>
                  <div className="language-detail-wide"><span>Description</span><p>{selectedCategory.description || '—'}</p></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GrammarCategory;
