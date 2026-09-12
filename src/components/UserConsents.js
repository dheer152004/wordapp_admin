import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function UserConsents({ userId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consents, setConsents] = useState([]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    api.get(`/admin/users/${userId}/consents`)
      .then(res => {
        if (!mounted) return;
        setConsents(res.data?.consents || []);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err?.response?.data?.message || err.message || 'Failed to load consents');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userId]);

  function fmtDate(arr) {
    if (!arr) return '—';
    try {
      // arr expected: [year, month, day, hour, minute, second, nanos]
      const year = arr[0], month = (arr[1] || 1) - 1, day = arr[2] || 1;
      const hour = arr[3] || 0, minute = arr[4] || 0, second = arr[5] || 0;
      const ms = arr[6] ? Math.round(arr[6] / 1e6) : 0;
      const d = new Date(year, month, day, hour, minute, second, ms);
      return d.toLocaleString();
    } catch (e) { return '—'; }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200 }}>
      <div style={{ width: '90%', maxWidth: 760, background: '#fff', borderRadius: 8, padding: 16, maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>User {userId} — Consents</h3>
          <div>
            <button onClick={onClose} style={{ marginLeft: 8 }}>Close</button>
          </div>
        </div>

        {loading ? (
          <div>Loading consents…</div>
        ) : error ? (
          <div style={{ color: 'red' }}>Error: {error}</div>
        ) : consents.length === 0 ? (
          <div>No consents found for this user.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {consents.map(c => (
              <div key={c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{c.legalDocumentTitle || c.legalDocumentType}</strong>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>{c.legalDocumentType} · version {c.legalDocumentVersion || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{c.status}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.acceptedFrom || '—'}</div>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                  <div><strong>Accepted At:</strong> {fmtDate(c.acceptedAt)}</div>
                  <div><strong>Withdrawn At:</strong> {fmtDate(c.withdrawnAt)}</div>
                  <div><strong>Created At:</strong> {fmtDate(c.createdAt)}</div>
                  <div><strong>Updated At:</strong> {fmtDate(c.updatedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
