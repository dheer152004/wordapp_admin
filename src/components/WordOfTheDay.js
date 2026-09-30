import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

const getMonthRange = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
};

const formatDate = (value) => {
  if (Array.isArray(value)) {
    const [year, month, day] = value;
    return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
  }
  if (!value) return '—';
  return String(value).slice(0, 10);
};

const formatDateTime = (value) => {
  if (!value) return '—';
  if (Array.isArray(value)) {
    const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0] = value;
    return new Date(year, month - 1, day, hour, minute, second).toLocaleString();
  }
  return new Date(value).toLocaleString();
};

function WordOfTheDay() {
  const [range, setRange] = useState(getMonthRange);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({ wordId: '', publishOn: '', status: 'SCHEDULED' });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/word-of-the-day', { params: range });
      setEntries(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load word of the day entries.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const resetForm = () => {
    setEditingEntry(null);
    setFormData({ wordId: '', publishOn: '', status: 'SCHEDULED' });
    setShowForm(false);
  };

  const openCreateForm = () => {
    setEditingEntry(null);
    setFormData({ wordId: '', publishOn: '', status: 'SCHEDULED' });
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      publishOn: formData.publishOn,
      status: formData.status,
    };

    try {
      if (editingEntry) {
        await api.patch(`/admin/word-of-the-day/${editingEntry.id}`, payload);
      } else {
        await api.post('/word-of-the-day', { ...payload, wordId: Number(formData.wordId) });
      }
      resetForm();
      await fetchEntries();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save word of the day.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
    setFormData({
      wordId: String(entry.wordOfTheDayId ?? ''),
      publishOn: formatDate(entry.publishOn),
      status: entry.status || 'SCHEDULED',
    });
  };

  const deleteEntry = async (entry) => {
    if (!window.confirm(`Delete the word of the day scheduled for ${formatDate(entry.publishOn)}?`)) return;
    setError('');
    try {
      await api.delete(`/admin/word-of-the-day/${entry.id}`);
      await fetchEntries();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete entry.');
    }
  };

  return (
    <div className="word-of-day-page">
      <div className="word-of-day-header">
        <div>
          <div className="word-of-day-kicker">Content scheduling</div>
          <h1>Word of the day</h1>
          <p>Schedule a word and manage its publication status.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openCreateForm}>+ Schedule word</button>
      </div>

      {error && <div className="word-of-day-error" role="alert">{error}</div>}

      {showForm && <form className="word-of-day-form card" onSubmit={handleSubmit}>
        <div className="word-of-day-form-title">
          <h2>{editingEntry ? 'Edit scheduled word' : 'Schedule a word'}</h2>
          {editingEntry && <button type="button" className="btn btn-sm" onClick={resetForm}>Cancel edit</button>}
        </div>
        <div className="word-of-day-fields">
          {!editingEntry && (
            <label>Word ID<input type="number" min="1" value={formData.wordId} onChange={(event) => setFormData((current) => ({ ...current, wordId: event.target.value }))} required /></label>
          )}
          <label>Publish on<input type="date" value={formData.publishOn} onChange={(event) => setFormData((current) => ({ ...current, publishOn: event.target.value }))} required /></label>
          <label>Status<select value={formData.status} onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
            <option value="CANCELLED">Cancelled</option>
          </select></label>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : editingEntry ? 'Save changes' : 'Add to schedule'}</button>
        </div>
      </form>}

      <section className="card word-of-day-list">
        <div className="word-of-day-list-header">
          <div><h2>Schedule</h2><p>{entries.length} entr{entries.length === 1 ? 'y' : 'ies'} in this date range</p></div>
          <div className="word-of-day-range">
            <label>From<input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></label>
            <label>To<input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></label>
            <button className="btn btn-sm" type="button" onClick={fetchEntries} disabled={loading}>Refresh</button>
          </div>
        </div>
        {loading ? <div className="loading">Loading schedule...</div> : entries.length === 0 ? (
          <div className="word-of-day-empty">No words scheduled in this date range.</div>
        ) : (
          <div className="word-of-day-table-wrap">
            <table className="word-of-day-table">
              <thead><tr><th>Publish date</th><th>Word ID</th><th>Status</th><th>Created</th><th>Updated</th><th>Actions</th></tr></thead>
              <tbody>{entries.map((entry) => (
                <tr key={entry.id}>
                  <td><strong>{formatDate(entry.publishOn)}</strong></td>
                  <td>{entry.wordOfTheDayId ?? '—'}</td>
                  <td><span className={`word-of-day-status status-${String(entry.status || '').toLowerCase()}`}>{entry.status || 'Unknown'}</span></td>
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td>{formatDateTime(entry.updatedAt)}</td>
                  <td className="word-of-day-actions">
                    <button className="btn btn-sm" type="button" onClick={() => startEdit(entry)}>Edit</button>
                    <button className="btn btn-sm btn-danger" type="button" onClick={() => deleteEntry(entry)}>Delete</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default WordOfTheDay;