import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = {
  code: '',
  name: '',
  grammarName: '',
  grammarDescription: '',
  grammarActive: true,
  displayOrder: 1,
  isActive: true,
};

function Languages() {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLanguages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/languages');
      setLanguages(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load languages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        code: formData.code.trim(),
        name: formData.name.trim(),
        grammarName: formData.grammarName.trim(),
        grammarDescription: formData.grammarDescription.trim(),
        displayOrder: Number(formData.displayOrder) || 1,
      };

      if (editingLanguage) {
        await api.patch(`/admin/languages/${editingLanguage.id}`, payload);
      } else {
        await api.post('/admin/languages', payload);
      }

      setFormData(emptyForm);
      setEditingLanguage(null);
      setShowForm(false);
      await fetchLanguages();
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to ${editingLanguage ? 'update' : 'create'} language.`);
    } finally {
      setSaving(false);
    }
  };

  const viewLanguage = async (language) => {
    setDetailLoading(true);
    setError('');
    try {
      const response = await api.get(`/admin/languages/${language.id}`);
      setSelectedLanguage(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load language details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateForm = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const openCreateForm = () => {
    setEditingLanguage(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (language) => {
    setEditingLanguage(language);
    setFormData({
      code: language.code || '',
      name: language.name || '',
      grammarName: language.grammarName || '',
      grammarDescription: language.grammarDescription || '',
      grammarActive: language.grammarActive !== false,
      displayOrder: language.displayOrder || 1,
      isActive: language.isActive !== false,
    });
    setShowForm(true);
  };

  return (
    <div className="languages-page">
      <div className="languages-header">
        <div>
          <div className="languages-kicker">Content settings</div>
          <h1>Languages</h1>
          <p>Manage the languages and grammar content available in WordGame.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={showForm ? () => setShowForm(false) : openCreateForm}>
          {showForm ? 'Close form' : '+ Add language'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form className="language-form card" onSubmit={handleSubmit}>
          <div className="language-form-heading">
            <div>
              <h2>{editingLanguage ? 'Edit language' : 'Add language'}</h2>
              <p>{editingLanguage ? 'Update the display and grammar information for this language.' : 'Define the display and grammar information for a language.'}</p>
            </div>
          </div>
          <div className="language-form-grid">
            <label>Code<input value={formData.code} onChange={(event) => updateForm('code', event.target.value)} placeholder="en" required /></label>
            <label>Name<input value={formData.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="English" required /></label>
            <label>Grammar name<input value={formData.grammarName} onChange={(event) => updateForm('grammarName', event.target.value)} placeholder="English Grammar" /></label>
            <label>Display order<input type="number" min="1" value={formData.displayOrder} onChange={(event) => updateForm('displayOrder', event.target.value)} required /></label>
            <label className="language-form-wide">Grammar description<textarea value={formData.grammarDescription} onChange={(event) => updateForm('grammarDescription', event.target.value)} placeholder="Basic English grammar rules and usage." rows="3" /></label>
          </div>
          <div className="language-toggles">
            <label><input type="checkbox" checked={formData.grammarActive} onChange={(event) => updateForm('grammarActive', event.target.checked)} /> Grammar active</label>
            <label><input type="checkbox" checked={formData.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} /> Language active</label>
          </div>
          <div className="language-form-actions">
            <button className="btn" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : editingLanguage ? 'Update language' : 'Save language'}</button>
          </div>
        </form>
      )}

      <div className="card languages-card">
        <div className="languages-card-heading">
          <div><h2>Available languages</h2><p>{languages.length} language{languages.length === 1 ? '' : 's'} configured</p></div>
          <button className="btn btn-sm" type="button" onClick={fetchLanguages} disabled={loading}>Refresh</button>
        </div>
        {loading ? <div className="loading">Loading languages...</div> : languages.length === 0 ? <div className="language-empty">No languages configured yet.</div> : (
          <div className="languages-table-wrap">
            <table className="languages-table">
              <thead><tr><th>Order</th><th>Code</th><th>Name</th><th>Grammar</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{languages.map((language) => (
                <tr key={language.id}>
                  <td>{language.displayOrder}</td>
                  <td><span className="language-code">{language.code}</span></td>
                  <td><strong>{language.name}</strong></td>
                  <td>{language.grammarName || '—'}</td>
                  <td><span className={`badge ${language.isActive ? 'badge-active' : 'badge-inactive'}`}>{language.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="language-actions">
                    <button className="btn btn-sm btn-primary" type="button" onClick={() => openEditForm(language)}>Edit</button>
                    <button className="btn btn-sm" type="button" onClick={() => viewLanguage(language)}>View details</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {(detailLoading || selectedLanguage) && (
        <div className="modal" onClick={() => !detailLoading && setSelectedLanguage(null)}>
          <div className="modal-content language-detail-modal" onClick={(event) => event.stopPropagation()}>
            {detailLoading ? <div className="loading">Loading language...</div> : (
              <>
                <div className="language-detail-heading"><div><div className="languages-kicker">Language details</div><h2>{selectedLanguage.name}</h2></div><button className="word-modal-close" type="button" onClick={() => setSelectedLanguage(null)}>x</button></div>
                <div className="language-detail-grid">
                  <div><span>Code</span><strong>{selectedLanguage.code}</strong></div>
                  <div><span>Display order</span><strong>{selectedLanguage.displayOrder}</strong></div>
                  <div><span>Language status</span><strong>{selectedLanguage.isActive ? 'Active' : 'Inactive'}</strong></div>
                  <div><span>Grammar status</span><strong>{selectedLanguage.grammarActive ? 'Active' : 'Inactive'}</strong></div>
                  <div><span>Grammar name</span><strong>{selectedLanguage.grammarName || '—'}</strong></div>
                  <div className="language-detail-wide"><span>Grammar description</span><p>{selectedLanguage.grammarDescription || '—'}</p></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Languages;
