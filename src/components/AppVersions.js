import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import './AppVersions.css';

const platforms = ['ANDROID', 'IOS'];
const emptyPolicy = (platform) => ({
  platform,
  latestVersion: '',
  minimumVersion: '',
  forceUpdate: false,
  title: 'UPDATE AVAILABLE',
  message: '',
  buttonText: 'UPDATE NOW',
  storeUrl: '',
});

const getPolicyRequestError = (requestError, fallback) => {
  const status = requestError.response?.status;
  if (status === 401) return 'Admin session expired. Sign in again to load version policies.';
  if (status === 403) return 'This account is not authorized to manage app versions. Sign in as an admin.';
  if (!status) return 'Cannot reach the backend. Check the admin API URL and backend availability.';
  return requestError.response?.data?.message || fallback;
};

function AppVersions() {
  const [policies, setPolicies] = useState([]);
  const [platform, setPlatform] = useState('ANDROID');
  const [form, setForm] = useState(emptyPolicy('ANDROID'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/v1/admin/app-versions');
      const items = response.data || [];
      setPolicies(items);
      const selected = items.find((item) => item.platform === platform);
      setForm(selected ? { ...selected } : emptyPolicy(platform));
    } catch (requestError) {
      setError(getPolicyRequestError(requestError, 'Could not load app version policies.'));
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const selectPlatform = async (nextPlatform) => {
    setPlatform(nextPlatform);
    setError('');
    setNotice('');
    const existing = policies.find((item) => item.platform === nextPlatform);
    if (!existing) {
      setForm(emptyPolicy(nextPlatform));
      return;
    }

    try {
      const response = await api.get(`/v1/admin/app-versions/${nextPlatform}`);
      setForm({ ...response.data });
    } catch (requestError) {
      setError(getPolicyRequestError(requestError, 'Could not load this platform policy.'));
    }
  };

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const savePolicy = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const existing = policies.some((item) => item.platform === platform);
    try {
      if (existing) {
        await api.put(`/v1/admin/app-versions/${platform}`, form);
      } else {
        await api.post('/v1/admin/app-versions', form);
      }
      setNotice(`${platform} version policy saved.`);
      await loadPolicies();
    } catch (requestError) {
      setError(getPolicyRequestError(requestError, 'Could not save the version policy.'));
    } finally {
      setSaving(false);
    }
  };

  const togglePolicy = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.patch(`/v1/admin/app-versions/${platform}/status`, {
        enabled: !form.enabled,
      });
      setForm((current) => ({ ...current, ...response.data }));
      setPolicies((current) => current.map((item) => (
        item.platform === platform ? { ...item, ...response.data } : item
      )));
      setNotice(`Updates ${response.data.enabled ? 'enabled' : 'disabled'} for ${platform}.`);
    } catch (requestError) {
      setError(getPolicyRequestError(requestError, 'Could not change policy status.'));
    } finally {
      setSaving(false);
    }
  };

  const hasPolicy = policies.some((item) => item.platform === platform);

  return (
    <section className="app-versions-page">
      <header className="app-versions-header">
        <div>
          <p className="app-versions-eyebrow">APP MANAGEMENT</p>
          <h1>Version policies</h1>
          <p>Set the release thresholds and store destination for each platform.</p>
        </div>
        <div className="app-version-platforms" role="group" aria-label="Select platform">
          {platforms.map((item) => (
            <button
              className={platform === item ? 'selected' : ''}
              key={item}
              onClick={() => selectPlatform(item)}
              type="button"
            >
              {item === 'IOS' ? 'iOS' : 'Android'}
            </button>
          ))}
        </div>
      </header>

      {error && <div className="app-version-feedback error" role="alert">{error}</div>}
      {notice && <div className="app-version-feedback success" role="status">{notice}</div>}
      {loading ? <div className="loading">Loading version policies...</div> : (
        <div className="app-version-layout">
          <form className="app-version-form" onSubmit={savePolicy}>
            <div className="app-version-form-heading">
              <div>
                <span className="app-version-kicker">{platform === 'IOS' ? 'APPLE APP STORE' : 'GOOGLE PLAY'}</span>
                <h2>{hasPolicy ? 'Release settings' : 'Create policy'}</h2>
              </div>
              {hasPolicy && (
                <button
                  className={`app-version-status ${form.enabled ? 'is-enabled' : ''}`}
                  disabled={saving}
                  onClick={togglePolicy}
                  type="button"
                >
                  <span />{form.enabled ? 'Enabled' : 'Disabled'}
                </button>
              )}
            </div>

            <div className="app-version-fields">
              <label>Latest version<input name="latestVersion" onChange={updateField} placeholder="1.5.0" required value={form.latestVersion || ''} /></label>
              <label>Minimum supported version<input name="minimumVersion" onChange={updateField} placeholder="1.4.0" required value={form.minimumVersion || ''} /></label>
              <label className="app-version-wide">Store URL<input name="storeUrl" onChange={updateField} placeholder="https://..." required type="url" value={form.storeUrl || ''} /></label>
              <label className="app-version-wide">Dialog title<input name="title" onChange={updateField} required value={form.title || ''} /></label>
              <label className="app-version-wide">Message<textarea name="message" onChange={updateField} required rows="3" value={form.message || ''} /></label>
              <label>Button text<input name="buttonText" onChange={updateField} required value={form.buttonText || ''} /></label>
              <label className="app-version-force">
                <input checked={Boolean(form.forceUpdate)} name="forceUpdate" onChange={updateField} type="checkbox" />
                <span><strong>Force update</strong><small>Require every outdated install to update.</small></span>
              </label>
            </div>

            <footer className="app-version-form-footer">
              <span>{hasPolicy ? `Policy ID: ${platform}` : 'No policy exists for this platform yet.'}</span>
              <button className="btn btn-primary" disabled={saving} type="submit">
                {saving ? 'Saving...' : hasPolicy ? 'Save changes' : 'Create policy'}
              </button>
            </footer>
          </form>

          <aside className="app-version-preview">
            <div className="app-version-preview-top"><span>INSTALL RULE</span><span className="app-version-live">LIVE</span></div>
            <h2>What users see</h2>
            <div className="app-version-dialog-preview">
              <span className="app-version-preview-mark">N</span>
              <h3>{form.title || 'UPDATE AVAILABLE'}</h3>
              <p>{form.message || 'Your update message will appear here.'}</p>
              <button type="button">{form.buttonText || 'UPDATE NOW'}</button>
            </div>
            <div className="app-version-thresholds">
              <div><span>Installed below</span><strong>{form.minimumVersion || 'minimum'} <b>Required</b></strong></div>
              <div><span>Installed below latest</span><strong>{form.latestVersion || 'latest'} <b>Optional</b></strong></div>
              <div><span>Latest or newer</span><strong>Continue <b className="ok">OK</b></strong></div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

export default AppVersions;