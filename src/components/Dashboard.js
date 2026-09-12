import React from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>
      <p>Welcome to the admin dashboard.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <div style={{ padding: 16, border: '1px solid #e6e6e6', borderRadius: 8 }}>
          <h3>Manage Content</h3>
          <p>Quick links to content areas.</p>
          <div style={{ marginTop: 8 }}>
            <Link to="/words" style={{ marginRight: 12 }}>Words</Link>
            <Link to="/admin/categories" style={{ marginRight: 12 }}>Categories</Link>
            <Link to="/badges">Badges</Link>
          </div>
        </div>

        <div style={{ padding: 16, border: '1px solid #e6e6e6', borderRadius: 8 }}>
          <h3>All Users</h3>
          <p>View and manage application users.</p>
          <div style={{ marginTop: 8 }}>
            <Link to="/users">Open Users</Link>
          </div>
        </div>
          
          <div style={{ padding: 16, border: '1px solid #e6e6e6', borderRadius: 8 }}>
            <h3>Reports</h3>
            <p>View reports submitted by users.</p>
            <div style={{ marginTop: 8 }}>
              <Link to="/reports">Open Reports</Link>
            </div>
          </div>
      </div>
    </div>
  );
}
