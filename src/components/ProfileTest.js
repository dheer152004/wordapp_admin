import React, { useState, useEffect } from 'react';
import api from '../services/api';

function ProfileTest() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Form states
  const [profileData, setProfileData] = useState({
    displayName: '',
    bio: '',
    phoneNumber: '',
    location: '',
    website: '',
    socialInstagram: '',
    socialTwitter: '',
    socialLinkedin: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Fetch profile on load
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/user/profile');
      setProfile(response.data);
      // Populate form with current data
      setProfileData({
        displayName: response.data.displayName || '',
        bio: response.data.bio || '',
        phoneNumber: response.data.phoneNumber || '',
        location: response.data.location || '',
        website: response.data.website || '',
        socialInstagram: response.data.socialInstagram || '',
        socialTwitter: response.data.socialTwitter || '',
        socialLinkedin: response.data.socialLinkedin || ''
      });
      setMessage('Profile fetched successfully!');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.put('/user/profile', profileData);
      setProfile(response.data);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  const uploadAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile) {
      setError('Please select an image file');
      return;
    }
    
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    
    try {
      const response = await api.post('/user/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(response.data);
      setMessage('Avatar uploaded successfully!');
      setAvatarFile(null);
      setAvatarPreview(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  const removeAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your avatar?')) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await api.delete('/user/profile/avatar');
      setProfile(response.data);
      setMessage('Avatar removed successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await api.put('/user/profile/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      setMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading && !profile) return <div className="loading">Loading profile...</div>;

  return (
    <div className="profile-test-container">
      <h1>Profile API Test</h1>
      
      {/* Messages */}
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      
      {/* Current Profile Display */}
      {profile && (
        <div className="profile-card">
          <h2>Current Profile</h2>
          <div className="profile-header">
            <div className="avatar-section">
              <img 
                src={profile.avatarUrl || 'https://via.placeholder.com/120'} 
                alt={profile.displayName}
                className="profile-avatar-large"
              />
            </div>
            <div className="profile-stats">
              <h3>{profile.displayName || profile.username}</h3>
              <p>@{profile.username}</p>
              <p>📧 {profile.email}</p>
              <div className="stats-grid-small">
                <div className="stat">
                  <span className="stat-value">{profile.totalXp}</span>
                  <span className="stat-label">XP</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{profile.level}</span>
                  <span className="stat-label">Level</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{profile.currentStreak}</span>
                  <span className="stat-label">Streak</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{profile.totalWordsSaved}</span>
                  <span className="stat-label">Saved</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="profile-details">
            <h4>Profile Details</h4>
            <p><strong>Bio:</strong> {profile.bio || 'Not set'}</p>
            <p><strong>Location:</strong> {profile.location || 'Not set'}</p>
            <p><strong>Phone:</strong> {profile.phoneNumber || 'Not set'}</p>
            <p><strong>Website:</strong> {profile.website || 'Not set'}</p>
            <p><strong>Instagram:</strong> {profile.socialInstagram || 'Not set'}</p>
            <p><strong>Twitter:</strong> {profile.socialTwitter || 'Not set'}</p>
            <p><strong>LinkedIn:</strong> {profile.socialLinkedin || 'Not set'}</p>
            <p><strong>Badges:</strong> {profile.recentBadges?.join(', ') || 'No badges yet'}</p>
          </div>
        </div>
      )}
      
      {/* Update Profile Form */}
      <div className="card">
        <h2>Update Profile (PUT /api/user/profile)</h2>
        <form onSubmit={updateProfile}>
          <div className="form-row">
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={profileData.displayName}
                onChange={e => setProfileData({ ...profileData, displayName: e.target.value })}
                placeholder="Display Name"
              />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={profileData.bio}
                onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Tell us about yourself"
                rows="3"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                value={profileData.phoneNumber}
                onChange={e => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                placeholder="+1-555-123-4567"
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={profileData.location}
                onChange={e => setProfileData({ ...profileData, location: e.target.value })}
                placeholder="City, Country"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                value={profileData.website}
                onChange={e => setProfileData({ ...profileData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Instagram</label>
              <input
                type="text"
                value={profileData.socialInstagram}
                onChange={e => setProfileData({ ...profileData, socialInstagram: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div className="form-group">
              <label>Twitter</label>
              <input
                type="text"
                value={profileData.socialTwitter}
                onChange={e => setProfileData({ ...profileData, socialTwitter: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div className="form-group">
              <label>LinkedIn</label>
              <input
                type="text"
                value={profileData.socialLinkedin}
                onChange={e => setProfileData({ ...profileData, socialLinkedin: e.target.value })}
                placeholder="LinkedIn URL"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
      
      {/* Avatar Upload Section */}
      <div className="card">
        <h2>Upload Avatar (POST /api/user/profile/avatar)</h2>
        <form onSubmit={uploadAvatar}>
          <div className="avatar-upload-section">
            {avatarPreview && (
              <div className="avatar-preview">
                <img src={avatarPreview} alt="Preview" className="avatar-preview-img" />
                <button type="button" className="btn-clear" onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview(null);
                }}>Clear</button>
              </div>
            )}
            <div className="form-group">
              <label>Select Image (Max 2MB, JPG/PNG/GIF)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>
          </div>
          <div className="button-group">
            <button type="submit" className="btn btn-primary" disabled={!avatarFile || loading}>
              Upload Avatar
            </button>
            <button type="button" className="btn btn-danger" onClick={removeAvatar} disabled={loading}>
              Remove Avatar
            </button>
          </div>
        </form>
      </div>
      
      {/* Change Password Form */}
      <div className="card">
        <h2>Change Password (PUT /api/user/profile/change-password)</h2>
        <form onSubmit={changePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>New Password (min 6 characters)</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Change Password
          </button>
        </form>
      </div>
      
      {/* Raw JSON Response */}
      {profile && (
        <div className="card">
          <h2>Raw API Response</h2>
          <pre className="json-response">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ProfileTest;