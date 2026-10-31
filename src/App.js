import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
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
import Languages from './components/Languages';
import GrammarCategory from './components/GrammarCategory';
import GrammarValues from './components/GrammarValues';
import WordOfTheDay from './components/WordOfTheDay';
import AppVersions from './components/AppVersions';
import UserSessions from './components/UserSessions';
import Badges from './components/Badges';
import api, { refreshAccessToken, setAccessToken } from './services/api';
import './App.css';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    let active = true;

    refreshAccessToken()
      .then((refreshedToken) => {
        if (active) setToken(refreshedToken);
      })
      .catch((error) => {
        setAccessToken(null);
        if (error.response?.status !== 401 && error.response?.status !== 403) {
          console.error('Unable to restore the session', error);
        }
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = (userData) => {
    setAccessToken(userData.token);
    setToken(userData.token);
    setUser(userData);
  };

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Unable to log out', error);
      setLogoutError(error.response?.data?.message || 'Unable to log out. Please try again.');
      return;
    }

    setAccessToken(null);
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
              <NavLink to="/dashboard" end>⌂ <span>Dashboard</span></NavLink>
              <NavLink to="/words">▣ <span>Words</span></NavLink>
              <NavLink to="/" end>▦ <span>Categories</span></NavLink>
              {/* <NavLink to="/admin/categories">▦ <span>Manage categories</span></NavLink> */}
              <NavLink to="/genres">◈ <span>Genres</span></NavLink>
              <NavLink to="/languages">L <span>Languages</span></NavLink>
              <NavLink to="/grammar-categories">G <span>Grammar categories</span></NavLink>
              <NavLink to="/grammar-values">V <span>Grammar values</span></NavLink>
              <NavLink to="/quiz">✓ <span>Quiz management</span></NavLink>
              <NavLink to="/word-of-the-day">✦ <span>Word of the day</span></NavLink>
              <NavLink to="/badges">🏅 <span>Badges</span></NavLink>
              <NavLink to="/app-versions">↻ <span>App versions</span></NavLink>
              <NavLink to="/user-sessions">◉ <span>User sessions</span></NavLink>
              {/* <NavLink to="/bulk-import">↥ <span>Bulk import</span></NavLink> */}
              <NavLink to="/users">♙ <span>Users</span></NavLink>
              <NavLink to="/reports">▥ <span>Reports</span></NavLink>
              <NavLink to="/legal-documents">▤ <span>Legal documents</span></NavLink>
            </nav>
            <div className="sidebar-footer">
              <div className="sidebar-help">Need help?<small>Check the documentation or contact support.</small></div>
              {logoutError && <div role="alert">{logoutError}</div>}
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
          {!authReady ? <div role="status">Restoring session...</div> : <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/" element={token ? <Categories /> : <Navigate to="/login" />} />
            <Route path="/users" element={token ? <Users /> : <Navigate to="/login" />} />
            <Route path="/reports" element={token ? <Reports /> : <Navigate to="/login" />} />
            <Route path="/genres" element={token ? <Genre /> : <Navigate to="/login" />} />
            <Route path="/languages" element={token ? <Languages /> : <Navigate to="/login" />} />
            <Route path="/grammar-categories" element={token ? <GrammarCategory /> : <Navigate to="/login" />} />
            <Route path="/grammar-values" element={token ? <GrammarValues /> : <Navigate to="/login" />} />
            <Route path="/admin/categories" element={token ? <AdminCategories /> : <Navigate to="/login" />} />
            <Route path="/legal-documents" element={token ? <LegalDocuments /> : <Navigate to="/login" />} />
            <Route path="/words" element={token ? <Words /> : <Navigate to="/login" />} />
            <Route path="/quiz" element={token ? <Quiz /> : <Navigate to="/login" />} />
            <Route path="/word-of-the-day" element={token ? <WordOfTheDay /> : <Navigate to="/login" />} />
            <Route path="/badges" element={token ? <Badges /> : <Navigate to="/login" />} />
            <Route path="/app-versions" element={token ? <AppVersions /> : <Navigate to="/login" />} />
            <Route path="/user-sessions" element={token ? <UserSessions /> : <Navigate to="/login" />} />
            <Route path="/bulk-import" element={token ? <BulkImport /> : <Navigate to="/login" />} />
            <Route path="/profile-test" element={token ? <ProfileTest /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
          </Routes>}
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;