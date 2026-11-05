import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import './UserRequestCategories.css';

function UserRequestCategories() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/user-requests');
      if (!Array.isArray(response.data)) {
        throw new Error('The server returned an invalid user request list.');
      }
      setRequests(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not load user requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const markCreated = async (request) => {
    setCreatingId(request.id);
    setError('');
    setNotice('');
    try {
      await api.patch(`/admin/user-requests/${request.id}/created`);
      setNotice(`"${request.categoryName}" has been marked as created.`);
      await loadRequests();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not update this request.');
    } finally {
      setCreatingId(null);
    }
  };

  const createMailLink = (request) => {
    const subject = `Update on your category request: ${request.categoryName}`;
    const body = [
      `Hi ${request.username || 'there'},`,
      '',
      `The team has seen your request and created the category "${request.categoryName}".`,
      '',
      'Thank you for helping us improve WordGame!',
    ].join('\n');

    return `mailto:${encodeURIComponent(request.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="user-request-categories">
      <header className="user-request-categories-header">
        <div>
          <p className="user-request-categories-eyebrow">COMMUNITY</p>
          <h1>User request categories</h1>
          <p>Review category suggestions and let users know when their request is created.</p>
        </div>
        <button className="user-request-refresh" disabled={loading} onClick={loadRequests} type="button">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      {error && <div className="user-request-feedback error" role="alert">{error}</div>}
      {notice && <div className="user-request-feedback success" role="status">{notice}</div>}

      <div className="user-request-table-wrap">
        <table className="user-request-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Requested by</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Resolved</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="user-request-empty" colSpan="6">Loading user requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td className="user-request-empty" colSpan="6">No user category requests found.</td></tr>
            ) : requests.map((request) => (
              <tr key={request.id}>
                <td>
                  <strong>{request.categoryName || 'Unnamed category'}</strong>
                  <small>{request.description || 'No description provided'}</small>
                </td>
                <td>
                  <strong>{request.username || `User ${request.userId}`}</strong>
                  <small>{request.email || 'Email unavailable'}</small>
                </td>
                <td><span className={`user-request-status ${request.status?.toLowerCase() || ''}`}>{request.status || 'UNKNOWN'}</span></td>
                <td>{request.requestedAt || '—'}</td>
                <td>{request.resolvedAt || '—'}</td>
                <td className="user-request-actions">
                  {request.email && (
                    <a className="user-request-mail" href={createMailLink(request)}>
                      Send mail
                    </a>
                  )}
                  {request.status === 'PENDING' && (
                    <button
                      className="user-request-created"
                      disabled={creatingId === request.id}
                      onClick={() => markCreated(request)}
                      type="button"
                    >
                      {creatingId === request.id ? 'Updating...' : 'Mark created'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default UserRequestCategories;
