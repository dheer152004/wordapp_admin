
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { usePersistentState } from '../hooks/usePersistentState';

const AGE_RATING_OPTIONS = [
  { value: 'ALL', label: 'ALL' },
  { value: '_13_PLUS', label: '13_PLUS' },
  { value: '_16_PLUS', label: '16_PLUS' },
  { value: '_18_PLUS', label: '18_PLUS' },
];

const normalizeAgeRating = (value) => {
  if (value === '13_PLUS' || value === '_13_PLUS') return '_13_PLUS';
  if (value === '16_PLUS' || value === '_16_PLUS') return '_16_PLUS';
  if (value === '18_PLUS' || value === '_18_PLUS') return '_18_PLUS';
  return 'ALL';
};

const formatAgeRating = (value) => normalizeAgeRating(value).replace(/^_/, '');

// ── Image Editor Modal ──────────────────────────────────────────────────────
function ImageEditor({ file, onConfirm, onCancel }) {
  const canvasRef = useRef(null);

  const [img, setImg] = useState(null);
  const [cropW, setCropW] = useState(300);
  const [cropH, setCropH] = useState(200);

  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [lockRatio, setLockRatio] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const PREVIEW = 340;

  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {
      setImg(image);

      const w = Math.min(image.width, 600);
      const h = Math.min(image.height, Math.round(w * (2 / 3)));

      setCropW(w);
      setCropH(h);

      setOffset({ x: 0, y: 0 });
    };

    image.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Draw preview
  useEffect(() => {
    if (!img || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const scale = PREVIEW / Math.max(cropW, cropH);

    const pw = Math.round(cropW * scale);
    const ph = Math.round(cropH * scale);

    canvas.width = pw;
    canvas.height = ph;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, pw, ph);

    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      cropW,
      cropH,
      0,
      0,
      pw,
      ph
    );

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;

    [1, 2].forEach(i => {
      ctx.beginPath();
      ctx.moveTo((pw / 3) * i, 0);
      ctx.lineTo((pw / 3) * i, ph);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, (ph / 3) * i);
      ctx.lineTo(pw, (ph / 3) * i);
      ctx.stroke();
    });
  }, [img, offset, cropW, cropH]);

  const clamp = (x, y, w, h, image) => ({
    x: Math.max(0, Math.min(image.width - w, x)),
    y: Math.max(0, Math.min(image.height - h, y)),
  });

  const handleMouseDown = (e) => {
    setDragging(true);

    setDragStart({
      mx: e.clientX,
      my: e.clientY,
      ox: offset.x,
      oy: offset.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging || !dragStart || !img) return;

    const scale = Math.max(cropW, cropH) / PREVIEW;

    const ox =
      dragStart.ox +
      (dragStart.mx - e.clientX) * scale;

    const oy =
      dragStart.oy +
      (dragStart.my - e.clientY) * scale;

    setOffset(clamp(ox, oy, cropW, cropH, img));
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const handleWidthChange = (val) => {
    if (!img) return;

    const w = Math.max(50, Math.min(img.width, val));

    if (lockRatio && cropH > 0) {
      const ratio = cropH / cropW;

      const h = Math.max(
        50,
        Math.min(img.height, Math.round(w * ratio))
      );

      setCropH(h);

      setOffset(prev =>
        clamp(prev.x, prev.y, w, h, img)
      );
    } else {
      setOffset(prev =>
        clamp(prev.x, prev.y, w, cropH, img)
      );
    }

    setCropW(w);
  };

  const handleHeightChange = (val) => {
    if (!img) return;

    const h = Math.max(50, Math.min(img.height, val));

    if (lockRatio && cropW > 0) {
      const ratio = cropW / cropH;

      const w = Math.max(
        50,
        Math.min(img.width, Math.round(h * ratio))
      );

      setCropW(w);

      setOffset(prev =>
        clamp(prev.x, prev.y, w, h, img)
      );
    } else {
      setOffset(prev =>
        clamp(prev.x, prev.y, cropW, h, img)
      );
    }

    setCropH(h);
  };

  const handleConfirm = () => {
    if (!img) return;

    const out = document.createElement('canvas');

    out.width = cropW;
    out.height = cropH;

    const ctx = out.getContext('2d');

    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    out.toBlob(blob => {
      const croppedFile = new File(
        [blob],
        'category.jpg',
        { type: 'image/jpeg' }
      );

      onConfirm(
        croppedFile,
        URL.createObjectURL(blob)
      );
    }, 'image/jpeg', 0.92);
  };

  const maxW = img?.width || 1200;
  const maxH = img?.height || 1200;

  return (
    <div style={s.editorOverlay}>
      <div style={s.editorBox}>
        <h3 style={s.editorTitle}>
          🖼️ Crop & Resize Image
        </h3>

        <p style={s.editorHint}>
          Drag to reposition · Adjust width &
          height freely
        </p>

        {img ? (
          <>
            <canvas
              ref={canvasRef}
              style={{
                ...s.previewCanvas,
                cursor: dragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />

            {/* Dimension controls */}
            <div style={s.dimGrid}>
              {/* Width */}
              <div style={s.dimBlock}>
                <div style={s.dimLabelRow}>
                  <span style={s.dimLabel}>Width</span>
                  <span style={s.dimVal}>
                    {cropW}px
                  </span>
                </div>

                <input
                  type="range"
                  min={50}
                  max={maxW}
                  value={cropW}
                  onChange={(e) =>
                    handleWidthChange(
                      Number(e.target.value)
                    )
                  }
                  style={s.slider}
                />
              </div>

              {/* Lock */}
              <button
                type="button"
                title={
                  lockRatio
                    ? 'Unlock aspect ratio'
                    : 'Lock aspect ratio'
                }
                onClick={() =>
                  setLockRatio(v => !v)
                }
                style={{
                  ...s.lockBtn,
                  background: lockRatio
                    ? '#4f46e5'
                    : '#e5e7eb',
                }}
              >
                {lockRatio ? '🔒' : '🔓'}
              </button>

              {/* Height */}
              <div style={s.dimBlock}>
                <div style={s.dimLabelRow}>
                  <span style={s.dimLabel}>
                    Height
                  </span>

                  <span style={s.dimVal}>
                    {cropH}px
                  </span>
                </div>

                <input
                  type="range"
                  min={50}
                  max={maxH}
                  value={cropH}
                  onChange={(e) =>
                    handleHeightChange(
                      Number(e.target.value)
                    )
                  }
                  style={s.slider}
                />
              </div>
            </div>

            {/* Presets */}
            <div style={s.presetRow}>
              {[
                { label: '16:9', w: 16, h: 9 },
                { label: '4:3', w: 4, h: 3 },
                { label: '3:2', w: 3, h: 2 },
                { label: '1:1', w: 1, h: 1 },
                { label: '2:3', w: 2, h: 3 },
              ].map(({ label, w, h }) => (
                <button
                  key={label}
                  type="button"
                  style={s.presetBtn}
                  onClick={() => {
                    if (!img) return;

                    const base = Math.min(
                      img.width,
                      img.height,
                      600
                    );

                    const nw = Math.min(
                      img.width,
                      Math.round(
                        base *
                          (w / Math.max(w, h))
                      )
                    );

                    const nh = Math.min(
                      img.height,
                      Math.round(
                        base *
                          (h / Math.max(w, h))
                      )
                    );

                    setCropW(nw);
                    setCropH(nh);

                    setOffset(prev =>
                      clamp(
                        prev.x,
                        prev.y,
                        nw,
                        nh,
                        img
                      )
                    );
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={s.editorMeta}>
              Original: {img.width}×{img.height}
              {' · '}
              Crop: {cropW}×{cropH}
            </div>
          </>
        ) : (
          <div style={s.editorLoading}>
            Loading image…
          </div>
        )}

        <div style={s.editorActions}>
          <button
            style={s.btnCancel}
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            style={s.btnConfirm}
            onClick={handleConfirm}
            disabled={!img}
          >
            Use this crop
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Categories Component ───────────────────────────────────────────────
function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);

  const [formData, setFormData] = usePersistentState('wordgame.categories.formData', {
    genreId: '',
    name: '',
    description: '',
    ageRating: 'ALL',
    image: null,
  });

  const [genres, setGenres] = useState([]);

  // Image state
  const [rawFile, setRawFile] = useState(null);
  const [croppedFile, setCroppedFile] = useState(null);
  const [croppedPreview, setCroppedPreview] =
    useState('');

  const [showEditor, setShowEditor] =
    useState(false);

  const dropZoneRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to fetch categories'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGenres = useCallback(async () => {
    try {
      const res = await api.get('/genres');
      // backend returns { total, genres }
      setGenres(res.data.genres || res.data || []);
    } catch (err) {
      console.error('Failed to fetch genres', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchGenres();
  }, [fetchCategories]);

  // Clipboard paste
  useEffect(() => {
    if (!showModal) return;

    const handlePaste = (e) => {
      const items = Array.from(
        e.clipboardData?.items || []
      );

      const imageItem = items.find(item =>
        item.type.startsWith('image/')
      );

      if (!imageItem) return;

      e.preventDefault();

      const file = imageItem.getAsFile();

      if (file) {
        openEditor(file);
      }
    };

    window.addEventListener(
      'paste',
      handlePaste
    );

    return () => {
      window.removeEventListener(
        'paste',
        handlePaste
      );
    };
  }, [showModal]);

  const openEditor = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setRawFile(file);
    setShowEditor(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      openEditor(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();

    dropZoneRef.current?.classList.remove(
      'drag-over'
    );

    const file = e.dataTransfer.files[0];

    if (
      file &&
      file.type.startsWith('image/')
    ) {
      openEditor(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();

    dropZoneRef.current?.classList.add(
      'drag-over'
    );
  };

  const handleDragLeave = () => {
    dropZoneRef.current?.classList.remove(
      'drag-over'
    );
  };

  const handleEditorConfirm = (
    file,
    previewUrl
  ) => {
    setCroppedFile(file);
    setCroppedPreview(previewUrl);
    setShowEditor(false);
  };

  const handleEditorCancel = () => {
    setRawFile(null);
    setShowEditor(false);
  };

  const removeImage = () => {
    setCroppedFile(null);
    setCroppedPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const form = new FormData();

    form.append('name', formData.name);
    form.append(
      'description',
      formData.description
    );

    if (formData.genreId !== '') {
      form.append('genreId', formData.genreId);
    }

    form.append('ageRating', normalizeAgeRating(formData.ageRating));

    if (croppedFile) {
      form.append('image', croppedFile);
    }

    try {
      if (editingCat) {
        await api.put(
          `/admin/categories/${editingCat.id}`,
          form,
          {
            headers: {
              'Content-Type':
                'multipart/form-data',
            },
          }
        );

        alert('Category updated');
      } else {
        await api.post(
          '/admin/categories',
          form,
          {
            headers: {
              'Content-Type':
                'multipart/form-data',
            },
          }
        );

        alert('Category created');
      }

      closeModal();
      fetchCategories();
    } catch (err) {
      alert(
        'Error: ' +
          (err.response?.data?.message ||
            err.message)
      );
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCat(null);

    setFormData({
      genreId: '',
      name: '',
      description: '',
      ageRating: 'ALL',
      image: null,
    });

    setCroppedFile(null);
    setCroppedPreview('');
    setRawFile(null);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        'Delete this category?'
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/admin/categories/${id}`
      );

      alert('Category deleted');

      fetchCategories();
    } catch (err) {
      alert(
        'Error: ' +
          (err.response?.data?.message ||
            err.message)
      );
    }
  };

  if (loading) {
    return (
      <div className="loading">
        Loading categories...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">{error}</div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card-header">
        <h2>
          Categories ({categories.length})
        </h2>

        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingCat(null);
            setFormData({
              genreId: '',
              name: '',
              description: '',
              ageRating: 'ALL',
              image: null,
            });
            setShowModal(true);
          }}
        >
          + Add Category
        </button>
      </div>

      {/* Grid */}
      <div className="categories-grid">
        {categories.map(category => (
          <div
            key={category.id}
            className="category-card"
          >
            {category.imageUrl && (
              <img
                src={category.imageUrl}
                alt={category.name}
                onError={(e) => {
                  e.target.src =
                    'https://placehold.co/300x200?text=No+Image';
                }}
              />
            )}

            <div className="category-info">
              <h3>{category.name}</h3>

              <p>{category.description}</p>

              <span className="word-count ">
                Genre: {category.genreName || category.genreId || 'Unassigned'}
              </span>

              {/* <span className="word-count">
                Age Rating: {category.ageRating || 'ALL'}
              </span> */}

              <span className="word-count" style={{ color: 'black',padding: '8px 15px' }}>
                Age Rating: {formatAgeRating(category.ageRating)}
              </span>


              <span className="word-count" style={{ color: 'green' }}>
                {category.wordCount} words
              </span>

              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  gap: 6,
                }}
              >
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setEditingCat(category);

                    setFormData({
                      genreId: category.genreId ? String(category.genreId) : '',
                      name: category.name,
                      description:
                        category.description ||
                        '',
                      ageRating: normalizeAgeRating(category.ageRating),
                      image: null,
                    });

                    setShowModal(true);
                  }}
                >
                  Edit
                </button>

                <button
                  className="btn btn-sm btn-danger"
                  onClick={() =>
                    handleDelete(category.id)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal"
          onClick={closeModal}
        >
          <div
            className="modal-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h3>
              {editingCat
                ? 'Edit Category'
                : 'Add Category'}
            </h3>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Category name"
                value={formData.name}
                required
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
              />

              <textarea
                placeholder="Description"
                rows="3"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description:
                      e.target.value,
                  })
                }
              />

              <select
                value={normalizeAgeRating(formData.ageRating)}
                onChange={(e) =>
                  setFormData({ ...formData, ageRating: e.target.value })
                }
                required
              >
                {AGE_RATING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={formData.genreId}
                onChange={(e) =>
                  setFormData({ ...formData, genreId: e.target.value })
                }
                required
              >
                <option value="">Select Genre</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              {/* Drop Zone */}
              <div
                ref={dropZoneRef}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={s.dropZone}
              >
                {croppedPreview ? (
                  <div style={s.previewWrapper}>
                    <img
                      src={croppedPreview}
                      alt="preview"
                      style={s.thumbPreview}
                    />

                    <div style={s.previewMeta}>
                      <span style={s.previewName}>
                        {croppedFile?.name ||
                          'Selected image'}
                      </span>

                      <div
                        style={s.previewActions}
                      >
                        <button
                          type="button"
                          style={s.btnReEdit}
                          onClick={(e) => {
                            e.stopPropagation();

                            if (croppedFile) {
                              openEditor(
                                croppedFile
                              );
                            }
                          }}
                        >
                          ✏️ Re-edit
                        </button>

                        <button
                          type="button"
                          style={s.btnRemove}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage();
                          }}
                        >
                          🗑 Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={s.dropPrompt}>
                    <span style={s.dropIcon}>
                      🖼️
                    </span>

                    <span style={s.dropText}>
                      Drop image here, browse,
                      or <strong>Ctrl+V</strong>{' '}
                      to paste
                    </span>

                    <span style={s.dropSub}>
                      You can crop & resize
                      before upload
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
              >
                Save
              </button>

              <button
                type="button"
                className="btn"
                onClick={closeModal}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Editor */}
      {showEditor && rawFile && (
        <ImageEditor
          file={rawFile}
          onConfirm={handleEditorConfirm}
          onCancel={handleEditorCancel}
        />
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = {
  dropZone: {
    border: '2px dashed #ccc',
    borderRadius: 8,
    padding: '1rem',
    textAlign: 'center',
    cursor: 'pointer',
    background: '#fafafa',
    minHeight: 90,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  dropPrompt: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
  },

  dropIcon: {
    fontSize: 28,
  },

  dropText: {
    fontSize: 13,
    color: '#555',
  },

  dropSub: {
    fontSize: 11,
    color: '#999',
  },

  previewWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  thumbPreview: {
    width: 80,
    height: 56,
    objectFit: 'cover',
    borderRadius: 6,
    border: '2px solid #4f46e5',
  },

  previewMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-start',
  },

  previewName: {
    fontSize: 11,
    color: '#888',
  },

  previewActions: {
    display: 'flex',
    gap: 6,
  },

  btnReEdit: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
  },

  btnRemove: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
  },

  editorOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },

  editorBox: {
    background: '#fff',
    borderRadius: 12,
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    boxShadow:
      '0 20px 60px rgba(0,0,0,0.4)',
    maxWidth: 420,
    width: '100%',
  },

  editorTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
  },

  editorHint: {
    margin: 0,
    fontSize: 12,
    color: '#888',
  },

  previewCanvas: {
    borderRadius: 8,
    border: '2px solid #4f46e5',
    display: 'block',
    maxWidth: '100%',
    userSelect: 'none',
  },

  dimGrid: {
    display: 'grid',
    gridTemplateColumns:
      '1fr auto 1fr',
    gap: 10,
    alignItems: 'center',
    width: '100%',
  },

  dimBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  dimLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },

  dimLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
  },

  dimVal: {
    fontSize: 12,
    color: '#6b7280',
  },

  slider: {
    width: '100%',
    accentColor: '#4f46e5',
  },

  lockBtn: {
    border: 'none',
    borderRadius: 6,
    width: 32,
    height: 32,
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  presetRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  presetBtn: {
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: 5,
    padding: '3px 10px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
  },

  editorMeta: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'center',
  },

  editorLoading: {
    padding: '2rem',
    color: '#888',
  },

  editorActions: {
    display: 'flex',
    gap: 10,
    width: '100%',
    justifyContent: 'flex-end',
  },

  btnCancel: {
    padding: '8px 18px',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  },

  btnConfirm: {
    padding: '8px 18px',
    borderRadius: 6,
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
};

export default Categories;
