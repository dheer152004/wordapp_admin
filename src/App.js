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
        <nav className="navbar">
          <div className="nav-brand">WordGame Admin</div>
          <div className="nav-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/users">All Users</Link>
            <Link to="/reports">Reports</Link>
            <Link to="/">Categories</Link>
            <Link to="/genres">Genres</Link>
            <Link to="/admin/categories">Manage Categories</Link>
            <Link to="/legal-documents">Legal Documents</Link>
            <Link to="/words">Words</Link>
            <Link to="/quiz">Quiz</Link>
            <Link to="/bulk-import">Bulk Import</Link>
            <Link to="/profile-test">Profile</Link>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
          <div className="user-info">Welcome, {user?.displayName || user?.username}</div>
        </nav>
        <div className="container">
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
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;