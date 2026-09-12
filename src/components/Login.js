import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = (process.env.REACT_APP_API_BASE || '').replace(/\/$/, '');

// Lightweight shadCN-like UI shim (small set of components used here)
function Button({ children, variant = 'default', ...props }) {
  const base = 'px-4 py-2 rounded';
  const style = variant === 'primary' ? `${base} bg-blue-600 text-white` : `${base} bg-gray-200`;
  return (
    <button className={style} {...props}>
      {children}
    </button>
  );
}

function Input({ label, type = 'text', ...props }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: 'block', marginBottom: 6 }}>{label}</label>}
      <input type={type} style={{ padding: 8, width: '100%', borderRadius: 6, border: '1px solid #ddd' }} {...props} />
    </div>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = role === 'ADMIN' ? '/api/auth/login-admin' : '/api/auth/login-editor';
      const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint;
      const res = await axios.post(url, {
        username,
        password
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const data = res.data;
      if (data?.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user || { username }));
        if (onLogin) onLogin(data);
        navigate('/dashboard');
      } else {
        setError('Authentication failed: no token returned');
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 20, border: '1px solid #eee', borderRadius: 8 }}>
      <h2 style={{ marginBottom: 12 }}>Admin / Editor Login</h2>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Login As</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: 8, borderRadius: 6, width: '100%' }}>
            <option value="ADMIN">Admin</option>
            <option value="EDITOR">Editor</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
          <Button type="button" onClick={() => { setUsername('admin1'); setPassword('secret123'); setRole('ADMIN'); }}>Use Demo</Button>
        </div>
      </form>
    </div>
  );
}

export default Login;