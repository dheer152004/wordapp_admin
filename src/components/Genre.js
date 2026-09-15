import React, { useCallback, useEffect, useState, useRef } from 'react';
import api from '../services/api';
import ImageEditor from './ImageEditor';
import { usePersistentState } from '../hooks/usePersistentState';

function Genre() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGenre, setEditingGenre] = useState(null);
  const [formData, setFormData] = usePersistentState('wordgame.genres.formData', {
    name: '',
    imageUrl: '',
    description: '',
  });
  const [rawFile, setRawFile] = useState(null);
  const [croppedFile, setCroppedFile] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const dropZoneRef = useRef(null);

  const fetchGenres = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/genres');
      setGenres(response.data.genres || response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch genres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  const openCreateModal = () => {
    setEditingGenre(null);
    setFormData({ name: '', imageUrl: '', description: '' });
    setRawFile(null); setCroppedFile(null); setCroppedPreview('');
    setShowModal(true);
  };

  const openEditModal = (genre) => {
    setEditingGenre(genre);
    setFormData({ name: genre.name, imageUrl: genre.imageUrl || '', description: genre.description || '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGenre(null);
    setFormData({ name: '', imageUrl: '', description: '' });
    setRawFile(null); setCroppedFile(null); setCroppedPreview(''); setShowEditor(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (croppedFile) {
        const form = new FormData();
        form.append('name', formData.name);
        form.append('description', formData.description || '');
        form.append('image', croppedFile);
        if (editingGenre) {
          await api.put(`/genres/${editingGenre.id}`, form);
          alert('Genre updated successfully');
        } else {
          await api.post('/genres', form);
          alert('Genre created successfully');
        }
      } else {
        const payload = { name: formData.name, imageUrl: formData.imageUrl || null, description: formData.description || null };
        if (editingGenre) {
          await api.put(`/genres/${editingGenre.id}`, payload);
          alert('Genre updated successfully');
        } else {
          await api.post('/genres', payload);
          alert('Genre created successfully');
        }
      }

      closeModal();
      fetchGenres();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Clipboard paste listener when modal open
  useEffect(() => {
    if (!showModal) return;
    const handlePaste = (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(i => i.type.startsWith('image/'));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) openEditor(file);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showModal]);

  const openEditor = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    setRawFile(file); setShowEditor(true);
  };

  const handleFileChange = (e) => { const f = e.target.files?.[0]; if (f) openEditor(f); };

  const handleDrop = (e) => { e.preventDefault(); dropZoneRef.current?.classList?.remove('drag-over'); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) openEditor(f); };

  const handleDragOver = (e) => { e.preventDefault(); dropZoneRef.current?.classList?.add('drag-over'); };

  const handleDragLeave = () => dropZoneRef.current?.classList?.remove('drag-over');

  const handleEditorConfirm = (file, previewUrl) => { setCroppedFile(file); setCroppedPreview(previewUrl); setShowEditor(false); };
  const handleEditorCancel = () => { setRawFile(null); setShowEditor(false); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this genre?')) {
      return;
    }

    try {
      await api.delete(`/genres/${id}`);
      alert('Genre deleted successfully');
      fetchGenres();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return <div className="loading">Loading genres...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <div className="card-header">
        <h2>Genres ({genres.length})</h2>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Add Genre
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Name</th>
              <th>Description</th>
              <th>Categories</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {genres.map((genre) => (
              <tr key={genre.id}>
                <td>{genre.id}</td>
                <td>
                  {genre.imageUrl ? (
                    <img
                      src={genre.imageUrl}
                      alt={genre.name}
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: 'cover',
                        borderRadius: 5,
                      }}
                    />
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td>{genre.name}</td>
                <td>{genre.description ? (genre.description.length > 80 ? genre.description.slice(0,80) + '...' : genre.description) : '-'}</td>
                <td>{genre.categoryCount}</td>
                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => openEditModal(genre)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(genre.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingGenre ? 'Edit Genre' : 'Add Genre'}</h3>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Genre name"
                value={formData.name}
                required
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
              />

              {/* Image drop / paste / browse zone */}
              <div
                ref={dropZoneRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={{ border: '2px dashed #ccc', padding: 12, borderRadius: 8, marginBottom: 12, textAlign: 'center' }}
              >
                {croppedPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={croppedPreview} alt="preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} />
                    <div style={{ marginTop: 8 }}>
                      <button type="button" onClick={() => rawFile && setShowEditor(true)}>✏️ Re-edit</button>
                      <button type="button" onClick={() => { setCroppedFile(null); setCroppedPreview(''); }}>🗑 Remove</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 24 }}>🖼️</div>
                    <div>Drop image here, <label style={{ color: '#2563eb', cursor: 'pointer' }}>browse<input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} /></label>, or <strong>Ctrl+V</strong> to paste</div>
                    <div style={{ marginTop: 8, color: '#6b7280' }}>Output will be cropped</div>
                    {/* show existing imageUrl preview if provided and no cropped preview */}
                    {formData.imageUrl && (
                      <div style={{ marginTop: 8 }}>
                        <img src={formData.imageUrl} alt="existing" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <textarea
                placeholder="Description"
                value={formData.description}
                rows={3}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />

              {formData.imageUrl && (
                <div style={{ marginBottom: '1rem' }}>
                  <img
                    src={formData.imageUrl}
                    alt="Genre preview"
                    style={{
                      width: '100%',
                      maxHeight: 180,
                      objectFit: 'cover',
                      borderRadius: 8,
                    }}
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary">
                Save
              </button>
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
            </form>
            {showEditor && (
              <ImageEditor file={rawFile} onConfirm={handleEditorConfirm} onCancel={handleEditorCancel} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Genre;
