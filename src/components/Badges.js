import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const badgeTypes = ['QUIZ', 'STREAK', 'COLLECTION', 'COMMUNITY', 'EVENT'];
const badgeRarities = ['RARE', 'EPIC', 'LEGENDARY'];

function Badges() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    badgeName: '',
    description: '',
    iconUrl: '',
    badgeType: 'QUIZ',
    rarity: 'RARE',
    hidden: false,
    active: true,
    displayOrder: 0,
    image: null,
  });

  const sortedBadges = useMemo(
    () => [...badges].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [badges]
  );

  const fetchBadges = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/badges');
      setBadges(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const form = new FormData();
      form.append('badge', new Blob([JSON.stringify({
        badgeName: formData.badgeName,
        description: formData.description,
        iconUrl: formData.iconUrl,
        badgeType: formData.badgeType,
        rarity: formData.rarity,
        hidden: formData.hidden,
        active: formData.active,
        displayOrder: Number(formData.displayOrder) || 0,
      })], { type: 'application/json' }));

      if (formData.image) {
        form.append('image', formData.image);
      }

      await api.post('/badges', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFormData({
        badgeName: '',
        description: '',
        iconUrl: '',
        badgeType: 'QUIZ',
        rarity: 'RARE',
        hidden: false,
        active: true,
        displayOrder: 0,
        image: null,
      });
      await fetchBadges();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create badge');
    }
  };

  const rebalanceBadges = async () => {
    try {
      await api.post('/admin/badges/rebalance-display-order');
      await fetchBadges();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to rebalance badges');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Badges ({badges.length})</h2>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>Upload badge art and manage badge metadata.</p>
        </div>
        <button type="button" onClick={() => setShowCreateForm((prev) => !prev)} style={addButtonStyle}>
          + Add badge
        </button>
      </div>

      {error ? <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div> : null}

      <div style={{ background: 'white', borderRadius: 20, padding: 20, boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)' }}>
        {showCreateForm && (
          <div style={{ marginBottom: 24, borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18 }}>
                  ✨
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Create badge</h3>
                  <div style={{ color: '#64748b', fontSize: 13 }}>Add a new badge and set its display metadata.</div>
                </div>
              </div>
              <button type="button" onClick={() => setShowCreateForm(false)} style={secondaryButtonStyle}>
                Cancel
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <input
                placeholder="Badge name"
                value={formData.badgeName}
                onChange={(e) => setFormData({ ...formData, badgeName: e.target.value })}
                required
                style={inputStyle}
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={inputStyle}
              />
              <input
                placeholder="Icon URL (optional)"
                value={formData.iconUrl}
                onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                style={inputStyle}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, image: e.target.files[0] || null })}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <select value={formData.badgeType} onChange={(e) => setFormData({ ...formData, badgeType: e.target.value })} style={inputStyle}>
                  {badgeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <select value={formData.rarity} onChange={(e) => setFormData({ ...formData, rarity: e.target.value })} style={inputStyle}>
                  {badgeRarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={formData.hidden}
                    onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                  />
                  Hidden
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <input
                type="number"
                placeholder="Display order"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                style={inputStyle}
              />
              <button type="submit" style={buttonStyle}>✨ Create badge</button>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Existing badges</h3>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>{sortedBadges.length} badge{sortedBadges.length === 1 ? '' : 's'} found</p>
          </div>
          <button onClick={rebalanceBadges} style={secondaryButtonStyle}>Rebalance order</button>
        </div>

        {loading ? <div>Loading...</div> : null}

        <div style={{ display: 'grid', gap: 12 }}>
          {sortedBadges.length === 0 ? (
            <div style={{ padding: 20, border: '1px dashed #d1d5db', borderRadius: 14, color: '#64748b' }}>
              No badges created yet. Click + Add badge to get started.
            </div>
          ) : (
            sortedBadges.map((badge) => (
              <div key={badge.badgeId || badge.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#f8fafc', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {badge.iconUrl ? (
                      <img src={badge.iconUrl} alt={badge.badgeName} style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 12, background: '#ffffff', padding: 6 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>🏅</div>
                    )}
                    <div>
                      <strong>{badge.badgeName}</strong>
                      <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{badge.badgeType || 'GENERAL'}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b', background: '#eef2ff', padding: '6px 12px', borderRadius: 999 }}>#{badge.displayOrder ?? 0}</span>
                </div>
                <div style={{ marginTop: 10, color: '#475569', fontSize: 14 }}>{badge.description || '—'}</div>
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '6px 10px', borderRadius: 999, fontSize: 12 }}>Type: {badge.badgeType}</span>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '6px 10px', borderRadius: 999, fontSize: 12 }}>Rarity: {badge.rarity}</span>
                  <span style={{ background: badge.active === false ? '#fee2e2' : '#dcfce7', color: badge.active === false ? '#b91c1c' : '#166534', padding: '6px 10px', borderRadius: 999, fontSize: 12 }}>{badge.active === false ? 'Inactive' : 'Active'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
};

const buttonStyle = {
  padding: '10px 14px',
  borderRadius: 999,
  border: 'none',
  background: '#2563eb',
  color: 'white',
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  padding: '10px 14px',
  borderRadius: 999,
  border: '1px solid #d1d5db',
  background: 'white',
  cursor: 'pointer',
};

const addButtonStyle = {
  padding: '10px 20px',
  borderRadius: 999,
  border: 'none',
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 600,
};

export default Badges;
