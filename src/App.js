import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Categories from './components/Categories';
import AdminCategories from './components/AdminCategories';
import Genre from './components/Genre';
import Words from './components/Words';
import Quiz from './components/Quiz';
import BulkImport from './components/BulkImport';
import ProfileTest from './components/ProfileTest';
import Dashboard from './components/Dashboard';
import Users from './components/Users';
import Reports from './components/Reports';
import LegalDocuments from './components/LegalDocuments';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setToken(userData.token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <BrowserRouter>
      <div className="app">
        {token && (
          <aside className="sidebar">
            <Link to="/dashboard" className="brand-lockup">
              <span className="brand-mark">W</span>
              <span><strong>WordGame</strong><small>Admin workspace</small></span>
            </Link>
            <div className="sidebar-section-label">Workspace</div>
            <nav className="sidebar-nav">
              <Link to="/dashboard">⌂ <span>Dashboard</span></Link>
              <Link to="/words" className="sidebar-active">▣ <span>Words</span></Link>
              <Link to="/">▦ <span>Categories</span></Link>
              <Link to="/genres">◈ <span>Genres</span></Link>
              <Link to="/quiz">✓ <span>Quiz management</span></Link>
              <Link to="/bulk-import">↥ <span>Bulk import</span></Link>
              <Link to="/users">♙ <span>Users</span></Link>
              <Link to="/reports">▥ <span>Reports</span></Link>
              <Link to="/legal-documents">▤ <span>Legal documents</span></Link>
            </nav>
            <div className="sidebar-footer">
              <div className="sidebar-help">Need help?<small>Check the documentation or contact support.</small></div>
              <button onClick={handleLogout} className="sidebar-logout">Log out</button>
            </div>
          </aside>
        )}
        <div className={token ? 'app-main' : 'app-main app-main-auth'}>
          {token && (
            <header className="topbar">
              <div className="search-shell">⌕ <span>Search words, categories, or anything...</span></div>
              <div className="topbar-user"><span className="notification">♧</span><span className="user-avatar">{(user?.displayName || user?.username || 'A').slice(0, 1).toUpperCase()}</span><span>{user?.displayName || user?.username || 'Admin'}<small>Admin</small></span>⌄</div>
            </header>
          )}
          <main className="container">
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/" element={token ? <Categories /> : <Navigate to="/login" />} />
            <Route path="/users" element={token ? <Users /> : <Navigate to="/login" />} />
            <Route path="/reports" element={token ? <Reports /> : <Navigate to="/login" />} />
            <Route path="/genres" element={token ? <Genre /> : <Navigate to="/login" />} />
            <Route path="/admin/categories" element={token ? <AdminCategories /> : <Navigate to="/login" />} />
            <Route path="/legal-documents" element={token ? <LegalDocuments /> : <Navigate to="/login" />} />
            <Route path="/words" element={token ? <Words /> : <Navigate to="/login" />} />
            <Route path="/quiz" element={token ? <Quiz /> : <Navigate to="/login" />} />
            <Route path="/bulk-import" element={token ? <BulkImport /> : <Navigate to="/login" />} />
            <Route path="/profile-test" element={token ? <ProfileTest /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
          </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;