import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteWordDraft, getWordDrafts, MAX_WORD_DRAFTS } from '../services/wordDraftService';

function WordDrafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState('');

  const refreshDrafts = () => {
    try {
      setDrafts(getWordDrafts());
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    refreshDrafts();
  }, []);

  const removeDraft = (draftId) => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    try {
      setDrafts(deleteWordDraft(draftId));
      setError('');
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="languages-page">
      <div className="languages-header">
        <div>
          <div className="languages-kicker">Word library</div>
          <h1>Word drafts</h1>
          <p>Drafts are saved only in this browser and can be published later.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/words')}>
          Create a word
        </button>
      </div>

      <div className="card languages-card">
        <div className="languages-card-heading">
          <div>
            <h2>Saved drafts</h2>
            <p>{drafts.length} of {MAX_WORD_DRAFTS} drafts used</p>
          </div>
        </div>
        {error && <div className="error-message" role="alert">{error}</div>}
        {drafts.length === 0 ? (
          <div className="language-empty">No drafts yet. Use “Save Draft” in the word form to keep a word for later.</div>
        ) : (
          <div className="languages-table-wrap">
            <table className="languages-table">
              <thead>
                <tr><th>Word</th><th>Meaning</th><th>Last saved</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {drafts.map(draft => (
                  <tr key={draft.id}>
                    <td><strong>{draft.formData.word || 'Untitled draft'}</strong></td>
                    <td>{draft.formData.meaning || '—'}</td>
                    <td>{new Date(draft.updatedAt).toLocaleString()}</td>
                    <td className="language-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate('/words', { state: { draftId: draft.id } })}
                      >
                        Edit / Publish
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => removeDraft(draft.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default WordDrafts;
