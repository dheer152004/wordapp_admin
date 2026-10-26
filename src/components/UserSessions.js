import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import './UserSessions.css';

const pageSize = 20;
const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'ALL', label: 'All sessions' },
];

function formatDate(value) {
  if (!value) return 'Never';
  const date = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

function UserSessions() {
  const [status, setStatus] = useState('ACTIVE');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/v1/admin/user-sessions', {
        params: { status, page, size: pageSize },
      });
      setResult(response.data || { content: [], totalElements: 0, totalPages: 0 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load user sessions.');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const changeStatus = (event) => {
    setStatus(event.target.value);
    setPage(0);
    setNotice('');
  };

  const revokeSession = async (session) => {
    if (!window.confirm(`Revoke this session for ${session.username}?`)) return;
    setRevokingId(session.id);
    setError('');
    setNotice('');
    try {
      await api.patch(`/v1/admin/user-sessions/${session.id}/revoke`);
      setNotice(`Session revoked for ${session.username}.`);
      await loadSessions();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not revoke this session.');
    } finally {
      setRevokingId(null);
    }
  };

  const sessions = Array.isArray(result.content) ? result.content : [];
  const totalPages = result.totalPages || 0;

  return (
    <section className="user-sessions-page">
      <header className="user-sessions-header">
        <div>
          <p className="user-sessions-eyebrow">SECURITY</p>
          <h1>User sessions</h1>
          <p>Review signed-in devices and revoke access when needed.</p>
        </div>
        <label className="user-sessions-filter">
          <span>Show</span>
          <select onChange={changeStatus} value={status}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </header>

      {error && <div className="user-sessions-feedback error" role="alert">{error}</div>}
      {notice && <div className="user-sessions-feedback success" role="status">{notice}</div>}

      <div className="user-sessions-toolbar">
        <span>{result.totalElements || 0} {status === 'ALL' ? 'sessions' : `${status.toLowerCase()} sessions`}</span>
        <button disabled={loading} onClick={loadSessions} type="button">Refresh</button>
      </div>

      <div className="user-sessions-table-wrap">
        <table className="user-sessions-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Device</th>
              <th>Signed in</th>
              <th>Last used</th>
              <th>Expires</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="user-sessions-empty" colSpan="7">Loading sessions...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td className="user-sessions-empty" colSpan="7">No sessions found for this filter.</td></tr>
            ) : sessions.map((session) => (
              <tr key={session.id}>
                <td>
                  <strong>{session.username || `User ${session.userId}`}</strong>
                  <small>{session.email || `ID ${session.userId}`}</small>
                </td>
                <td>
                  <strong>{session.deviceName || 'Unknown device'}</strong>
                  <small>{session.deviceId ? `Device ${session.deviceId.slice(0, 8)}` : 'Device ID unavailable'}</small>
                </td>
                <td>{formatDate(session.createdAt)}</td>
                <td>{formatDate(session.lastUsedAt)}</td>
                <td>{formatDate(session.expiresAt)}</td>
                <td><span className={`user-session-status ${session.status?.toLowerCase()}`}>{session.status}</span></td>
                <td className="user-session-action">
                  {session.status === 'ACTIVE' && (
                    <button
                      disabled={revokingId === session.id}
                      onClick={() => revokeSession(session)}
                      type="button"
                    >
                      {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="user-sessions-pagination">
        <span>Page {totalPages === 0 ? 0 : page + 1} of {totalPages}</span>
        <div>
          <button disabled={loading || page === 0} onClick={() => setPage((current) => current - 1)} type="button">Previous</button>
          <button disabled={loading || totalPages === 0 || page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)} type="button">Next</button>
        </div>
      </footer>
    </section>
  );
}

export default UserSessions;