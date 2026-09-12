import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

function LegalDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/legal-documents');
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load legal documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (loading) {
    return <div className="loading">Loading legal documents...</div>;
  }

  return (
    <div>
      <div className="card-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Legal Documents</h2>
        <button className="btn btn-primary" onClick={fetchDocuments}>Refresh</button>
      </div>

      <div className="card">
        {error ? (
          <p style={{ color: '#b91c1c' }}>{error}</p>
        ) : documents.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>No legal documents found.</p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {documents.map((doc) => (
              <div key={doc.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{doc.title}</h3>
                    <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
                      {doc.documentType} · Version {doc.version}
                    </p>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 999, background: doc.isActive ? '#dcfce7' : '#f3f4f6', color: doc.isActive ? '#166534' : '#374151', fontSize: 12, fontWeight: 600 }}>
                    {doc.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <div>
                    <strong>Effective From:</strong> {doc.effectiveFrom || '—'}
                  </div>
                  <div>
                    <strong>Published At:</strong> {doc.publishedAt || '—'}
                  </div>
                  <div>
                    <strong>Created At:</strong> {doc.createdAt || '—'}
                  </div>
                  <div>
                    <strong>Updated At:</strong> {doc.updatedAt || '—'}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <strong>Content</strong>
                  <div
                    style={{ marginTop: 8, padding: 12, background: '#f9fafb', borderRadius: 8, whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: doc.content || '' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LegalDocuments;
