import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null
  });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', formData.name);
    form.append('description', formData.description || '');
    if (formData.image) form.append('image', formData.image);

    try {
      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory.id}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Category updated successfully');
      } else {
        await api.post('/admin/categories', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Category created successfully');
      }
      setShowModal(false);
      setFormData({ name: '', description: '', image: null });
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure? This will delete all words in this category.')) {
      try {
        await api.delete(`/admin/categories/${id}`);
        alert('Category deleted successfully');
        fetchCategories();
      } catch (error) {
        alert('Error: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/admin/categories/${id}/toggle-status`);
      fetchCategories();
    } catch (error) {
      alert('Error toggling status');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="card-header">
        <h2>Manage Categories</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Category</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Name</th>
              <th>Description</th>
              <th>Words</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td>{cat.id}</td>
                <td>
                  {cat.imageUrl && (
                    <img src={cat.imageUrl} alt={cat.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 5 }} />
                  )}
                </td>
                <td>{cat.name}</td>
                <td>{cat.description}</td>
                <td>{cat.wordCount}</td>
                <td>
                  <span className={`badge ${cat.isActive ? 'badge-active' : 'badge-inactive'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => {
                    setEditingCategory(cat);
                    setFormData({ name: cat.name, description: cat.description || '', image: null });
                    setShowModal(true);
                  }}>Edit</button>
                  <button className="btn btn-sm btn-warning" onClick={() => toggleStatus(cat.id)}>Toggle</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cat.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows="3"
              />
              <input type="file" accept="image/*" onChange={e => setFormData({ ...formData, image: e.target.files[0] })} />
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCategories;