import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import UserConsents from './UserConsents';
import { usePersistentState } from '../hooks/usePersistentState';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingError, setPendingError] = useState(null);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [deletedError, setDeletedError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingPendingId, setDeletingPendingId] = useState(null);
  const [editingUserId, setEditingUserId] = usePersistentState('wordgame.users.editingUserId', null);
  const [editingRoles, setEditingRoles] = usePersistentState('wordgame.users.editingRoles', []);
  const [savingUserId, setSavingUserId] = useState(null);
  const [showConsentsUserId, setShowConsentsUserId] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/admin/users')
      .then(res => {
        if (!mounted) return;
        const data = res.data || {};
        setTotal(data.total ?? (data.users ? data.users.length : 0));
        setUsers(data.users || []);
        setError(null);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err.message || 'Failed to load users');
      })
      .finally(() => { if (mounted) setLoading(false); });

    api.get('/admin/users/pending-registrations')
      .then(res => {
        if (!mounted) return;
        const data = res.data || {};
        setPendingTotal(data.total ?? (Array.isArray(data.registrations) ? data.registrations.length : 0));
        setPendingRegistrations(Array.isArray(data.registrations) ? data.registrations : []);
        setPendingError(null);
      })
      .catch(err => {
        if (!mounted) return;
        setPendingError(err?.response?.data?.message || err.message || 'Failed to load pending users');
      });

    api.get('/admin/users/deleted')
      .then(res => {
        if (!mounted) return;
        const data = res.data || {};
        setDeletedTotal(data.total ?? (Array.isArray(data.users) ? data.users.length : 0));
        setDeletedUsers(Array.isArray(data.users) ? data.users : []);
        setDeletedError(null);
      })
      .catch(err => {
        if (!mounted) return;
        setDeletedError(err?.response?.data?.message || err.message || 'Failed to load deleted users');
      });

    return () => { mounted = false; };
  }, []);

  function formatDateTime(value) {
    if (!value) return '—';
    if (Array.isArray(value)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0, nanos = 0] = value;
      return new Date(year, month - 1, day, hour, minute, second, Math.round(nanos / 1000000)).toLocaleString();
    }
    return new Date(value).toLocaleString();
  }

  function startEdit(user) {
    setEditingUserId(user.id);
    setEditingRoles(Array.isArray(user.roles) ? user.roles.slice() : []);
  }

  function saveRoles(userId) {
    const roles = Array.from(new Set((editingRoles || []).map(r => (r||'').toString().trim()).filter(Boolean)));
    if (roles.length === 0) {
      // prevent empty role set; still allow if desired
    }
    setSavingUserId(userId);
    api.post(`/admin/users/${userId}/roles`, { roles })
      .then(res => {
        // update local users
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles } : u));
        setEditingUserId(null);
        setEditingRoles([]);
        setError(null);
      })
      .catch(err => {
        setError(err?.response?.data?.message || err.message || 'Failed to save roles');
      })
      .finally(() => setSavingUserId(null));
  }

  function deletePendingRegistration(registrationId) {
    if (!window.confirm('Delete this pending user registration?')) return;

    setDeletingPendingId(registrationId);
    api.delete(`/admin/users/pending-registrations/${registrationId}`)
      .then(() => {
        setPendingRegistrations(prev => prev.filter(registration => registration.id !== registrationId));
        setPendingTotal(prev => Math.max(0, prev - 1));
        setPendingError(null);
      })
      .catch(err => {
        setPendingError(err?.response?.data?.message || err.message || 'Failed to delete pending user');
      })
      .finally(() => setDeletingPendingId(null));
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>All Users</h1>
        <div>
          <Link to="/dashboard" style={{ marginRight: 12 }}>Back</Link>
        </div>
      </div>

      {loading ? (
        <div>Loading users…</div>
      ) : error ? (
        <div style={{ color: 'red' }}>Error: {error}</div>
      ) : (
        <div>
          <div style={{ marginBottom: 8, color: '#374151' }}>Total users: {total}</div>
          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Avatar</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Username</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Created At</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Roles</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>{u.id}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.displayName || u.username || 'User avatar'}
                          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ color: '#6b7280' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>{u.username}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>{u.displayName || '—'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>{u.email || '—'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>{formatDateTime(u.createdAt)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                      {Array.isArray(u.roles) && u.roles.length > 0 ? (
                        u.roles.map((r, i) => (
                          <span key={i} style={{ display: 'inline-block', padding: '4px 8px', marginRight: 8, marginBottom: 6, borderRadius: 999, background: '#eef2ff', color: '#1e3a8a', fontSize: 13 }}>{r}</span>
                        ))
                      ) : (
                        <span style={{ color: '#6b7280' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      {editingUserId === u.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            {['USER','EDITOR','ADMIN'].map(role => {
                              const sel = editingRoles.includes(role);
                              return (
                                <label key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                                  <span style={{
                                    width: 16, height: 16, borderRadius: 16, border: '2px solid #9ca3af', display: 'inline-block',
                                    background: sel ? '#4338ca' : 'transparent'
                                  }} />
                                  <input type="checkbox" value={role} checked={sel} onChange={(e) => {
                                    const next = new Set(editingRoles);
                                    if (e.target.checked) next.add(role); else next.delete(role);
                                    setEditingRoles(Array.from(next));
                                  }} style={{ display: 'none' }} />
                                  <span style={{ fontSize: 13 }}>{role}</span>
                                </label>
                              );
                            })}
                          </div>
                          <div>
                            <button onClick={() => saveRoles(u.id)} disabled={savingUserId===u.id} style={{ marginRight: 6 }}>{savingUserId===u.id ? 'Saving…' : 'Save'}</button>
                            <button onClick={() => { setEditingUserId(null); setEditingRoles([]); }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button onClick={() => startEdit(u)} style={{ marginRight: 8 }}>Edit Roles</button>
                          <button onClick={() => { setShowConsentsUserId(u.id); }}>View Consents</button>
                        </div>
                      )}
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section style={{ marginTop: 28 }}>
            <h2 style={{ marginBottom: 8 }}>Pending Users</h2>
            <div style={{ marginBottom: 8, color: '#374151' }}>Total pending users: {pendingTotal}</div>
            {pendingError ? (
              <div style={{ color: 'red' }}>Error: {pendingError}</div>
            ) : pendingRegistrations.length === 0 ? (
              <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>No pending users found.</div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>ID</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Username</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Email</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Display Name</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Role</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Verification Expires</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Accepted Documents</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Accepted From</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRegistrations.map(registration => (
                      <tr key={registration.id}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{registration.id}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{registration.username || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{registration.email || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{registration.displayName || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{registration.role || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{formatDateTime(registration.verificationExpiresAt)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{registration.acceptedDocumentIds || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{registration.acceptedFrom || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                          <button
                            onClick={() => deletePendingRegistration(registration.id)}
                            disabled={deletingPendingId === registration.id}
                          >
                            {deletingPendingId === registration.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={{ marginTop: 28 }}>
            <h2 style={{ marginBottom: 8 }}>Deleted Users</h2>
            <div style={{ marginBottom: 8, color: '#374151' }}>Total deleted users: {deletedTotal}</div>
            {deletedError ? (
              <div style={{ color: 'red' }}>Error: {deletedError}</div>
            ) : deletedUsers.length === 0 ? (
              <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>No deleted users found.</div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>ID</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>originalUserIdID</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Username</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Email</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Display Name</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Roles</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Deleted At</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eef2f7' }}>Deletion Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedUsers.map(user => (
                      <tr key={user.id}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{user.id}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{user.originalUserId ?? '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{user.username || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{user.email || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{user.displayName || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{user.roles?.join(', ') || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{formatDateTime(user.deletedAt)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{user.deletionReason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
      {typeof showConsentsUserId !== 'undefined' && showConsentsUserId !== null && (
        <UserConsents userId={showConsentsUserId} onClose={() => setShowConsentsUserId(null)} />
      )}
    </div>
  );
}

