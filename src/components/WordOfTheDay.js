import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import WordCard from './WordCard';

const extractWordList = (data) => [
  data,
  data?.words,
  data?.content,
  data?.data,
  data?.data?.words,
  data?.data?.content,
  data?.result,
  data?.payload,
].find(Array.isArray) || [];

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
  const [wordSearch, setWordSearch] = useState('');
  const [wordResults, setWordResults] = useState([]);
  const [wordSearchLoading, setWordSearchLoading] = useState(false);
  const [wordSearchError, setWordSearchError] = useState('');
  const [selectedWord, setSelectedWord] = useState(null);
  const [formData, setFormData] = useState({ wordId: '', publishOn: '', status: 'SCHEDULED' });
  const [viewWord, setViewWord] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/word-of-the-day', { params: range });
      const schedule = Array.isArray(response.data) ? response.data : [];
      setEntries(schedule.slice().sort((first, second) => formatDate(second.publishOn).localeCompare(formatDate(first.publishOn))));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load word of the day entries.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    const query = wordSearch.trim();
    if (!showForm || editingEntry || selectedWord || !query) {
      setWordResults([]);
      setWordSearchError('');
      setWordSearchLoading(false);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setWordSearchLoading(true);
      setWordSearchError('');
      try {
        const response = await api.get('/words/search', {
          params: { q: query, page: 0, size: 10 },
        });
        if (active) setWordResults(extractWordList(response.data));
      } catch (err) {
        if (active) {
          setWordResults([]);
          setWordSearchError(err.response?.data?.message || err.message || 'Word search failed.');
        }
      } finally {
        if (active) setWordSearchLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [wordSearch, showForm, editingEntry, selectedWord]);

  const resetForm = () => {
    setEditingEntry(null);
    setFormData({ wordId: '', publishOn: '', status: 'SCHEDULED' });
    setWordSearch('');
    setSelectedWord(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setEditingEntry(null);
    setFormData({ wordId: '', publishOn: '', status: 'SCHEDULED' });
    setWordSearch('');
    setSelectedWord(null);
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
        await api.patch(`/admin/word-of-the-day/${editingEntry.wordOfTheDayId}`, payload);
      } else {
        await api.post('/word-of-the-day', { ...payload, wordId: Number(selectedWord?.id ?? selectedWord?.wordId) });
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
    setWordSearch('');
    setSelectedWord(null);
    setFormData({
      wordId: String(entry.wordId ?? ''),
      publishOn: formatDate(entry.publishOn),
      status: entry.status || 'SCHEDULED',
    });
  };

  const deleteEntry = async (entry) => {
    if (!window.confirm(`Delete the word of the day scheduled for ${formatDate(entry.publishOn)}?`)) return;
    setError('');
    try {
      await api.delete(`/admin/word-of-the-day/${entry.wordOfTheDayId}`);
      await fetchEntries();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete entry.');
    }
  };

  const viewWordDetails = async (wordId) => {
    setViewLoading(true);
    setViewError('');
    setViewWord(null);
    try {
      const response = await api.get(`/admin/words/${wordId}`);
      const body = response.data;
      const word = body?.data?.word || body?.data || body?.result?.word || body?.result || body?.word || body?.payload?.word || body?.payload || body;
      setViewWord(word);
    } catch (err) {
      setViewError(err.response?.data?.message || err.message || 'Failed to load word details.');
    } finally {
      setViewLoading(false);
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
            <div className="word-of-day-search">
              <label htmlFor="word-of-day-search-input">Find a word</label>
              <input
                id="word-of-day-search-input"
                type="search"
                autoComplete="off"
                value={wordSearch}
                onChange={(event) => {
                  setWordSearch(event.target.value);
                  setSelectedWord(null);
                  setFormData((current) => ({ ...current, wordId: '' }));
                }}
                placeholder="Search by word, e.g. TCP"
                required={!selectedWord}
              />
              {wordSearchLoading && <div className="word-of-day-search-status">Searching words...</div>}
              {wordSearchError && <div className="word-of-day-search-status search-error" role="alert">{wordSearchError}</div>}
              {!wordSearchLoading && !wordSearchError && wordSearch.trim() && !selectedWord && wordResults.length === 0 && (
                <div className="word-of-day-search-status">No matching words found.</div>
              )}
              {wordResults.length > 0 && !selectedWord && (
                <div className="word-of-day-search-results" role="listbox" aria-label="Matching words">
                  {wordResults.map((word) => {
                    const wordId = word.id ?? word.wordId;
                    const wordName = word.word ?? word.name ?? word.title ?? `Word ${wordId}`;
                    return (
                      <button
                        key={wordId}
                        type="button"
                        role="option"
                        aria-selected="false"
                        onClick={() => {
                          setSelectedWord({ ...word, id: wordId });
                          setFormData((current) => ({ ...current, wordId: String(wordId) }));
                          setWordSearch(`${wordName} (#${wordId})`);
                          setWordResults([]);
                        }}
                      >
                        <strong>{wordName}</strong><span>ID {wordId}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedWord && <div className="word-of-day-selected">Selected: {selectedWord.word ?? selectedWord.name ?? selectedWord.title} (ID {formData.wordId})</div>}
            </div>
          )}
          <label>Publish on<input type="date" value={formData.publishOn} onChange={(event) => setFormData((current) => ({ ...current, publishOn: event.target.value }))} required /></label>
          <label>Status<select value={formData.status} onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
            <option value="CANCELLED">Cancelled</option>
          </select></label>
          <button className="btn btn-primary" type="submit" disabled={saving || (!editingEntry && !selectedWord)}>{saving ? 'Saving...' : editingEntry ? 'Save changes' : 'Add to schedule'}</button>
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
                <tr key={entry.wordOfTheDayId}>
                  <td><strong>{formatDate(entry.publishOn)}</strong></td>
                  <td>{entry.wordId ?? '—'}</td>
                  <td><span className={`word-of-day-status status-${String(entry.status || '').toLowerCase()}`}>{entry.status || 'Unknown'}</span></td>
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td>{formatDateTime(entry.updatedAt)}</td>
                  <td className="word-of-day-actions">
                    <button className="btn btn-sm" type="button" onClick={() => viewWordDetails(entry.wordId)}>View</button>
                    <button className="btn btn-sm" type="button" onClick={() => startEdit(entry)}>Edit</button>
                    <button className="btn btn-sm btn-danger" type="button" onClick={() => deleteEntry(entry)}>Delete</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {(viewLoading || viewWord || viewError) && (
        <div className="modal" onClick={() => !viewLoading && (setViewWord(null), setViewError(''))}>
          <div className="modal-content word-of-day-view-modal" onClick={(event) => event.stopPropagation()}>
            {viewLoading ? <div className="loading">Loading word...</div> : viewError ? (
              <>
                <div className="word-of-day-view-heading">
                  <h2>Word details</h2>
                  <button className="word-modal-close" type="button" aria-label="Close word details" onClick={() => setViewError('')}>×</button>
                </div>
                <div className="word-of-day-view-error" role="alert">{viewError}</div>
              </>
            ) : (
              <>
                <div className="word-of-day-view-heading">
                  <h2>Word details</h2>
                  <button className="word-modal-close" type="button" aria-label="Close word details" onClick={() => setViewWord(null)}>×</button>
                </div>
                <WordCard word={viewWord} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WordOfTheDay;