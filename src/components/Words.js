import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Alert, CircularProgress, Snackbar } from '@mui/material';
import api from '../services/api';
import { useWordReorder } from '../hooks/useWordReorder';
import { rebalanceWordDisplayOrder } from '../services/wordReorderService';
import ImageEditor from './ImageEditor';
import SortableWordRow from './SortableWordRow';
import WordCard from './WordCard';

// ── Main Words Component ────────────────────────────────────────────────────
function Words() {
  const [words, setWords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewWord, setViewWord] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewRaw, setViewRaw] = useState(null);
  const [viewShowRaw, setViewShowRaw] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [formData, setFormData] = useState({
    word: '',
    wordType: 'NORMAL_WORD',
    expandedForm: '',
    partOfSpeech: 'OTHER',
    meaning: '',
    categoryId: '',
    examples: [],
    wordImage: null,
    imageUrls: [],
    videos: [],
    audios: [],
    description: '',
    facts: [],
    relatedWordIds: [],
    alsoAppearsIn: [],
    sourceAndCredits: {},
    quizModes: [],
  });

  // Image editor state
  const [rawImageFile, setRawImageFile] = useState(null);   // file going INTO editor
  const [croppedFile, setCroppedFile] = useState(null);     // file coming OUT of editor
  const [croppedPreview, setCroppedPreview] = useState(''); // object URL for display
  const [showEditor, setShowEditor] = useState(false);

  const dropZoneRef = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const sortedWords = useMemo(
    () => [...words].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [words]
  );

  const { isReordering, reorderMessage, reorderWord } = useWordReorder({
    words: sortedWords,
    setWords,
    onError: () => setSnackbarOpen(true),
  });

  // ── Fetch helpers ──
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
      if (res.data.length > 0) setSelectedCategory(String(res.data[0].id));
    } catch (err) { console.error(err); }
  }, []);

  const fetchWords = useCallback(async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      const res = await api.get(`/words/category/${encodeURIComponent(selectedCategory)}?page=0&size=100`);
      const responseData = res.data;
      const wordList = [
        responseData,
        responseData?.words,
        responseData?.content,
        responseData?.data,
        responseData?.data?.words,
        responseData?.data?.content,
        responseData?.result,
        responseData?.payload,
      ].find(Array.isArray) || [];
      const fetchedWords = wordList.slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setWords(fetchedWords);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedCategory]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchWords(); }, [selectedCategory, fetchWords]);
  useEffect(() => { if (reorderMessage) setSnackbarOpen(true); }, [reorderMessage]);

  // ── Clipboard paste listener ──
  useEffect(() => {
    if (!showModal) return;
    const handlePaste = (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find(i => i.type.startsWith('image/'));
      if (!imgItem) return;
      const file = imgItem.getAsFile();
      if (file) openEditor(file);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showModal]);

  // ── File input / drop ──
  const openEditor = (file) => {
    setRawImageFile(file);
    setShowEditor(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) openEditor(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) openEditor(file);
  };

  const handleDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id || isReordering) {
      return;
    }

    reorderWord(Number(active.id), Number(over.id));
  }, [isReordering, reorderWord]);

  const handleDragOver = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.add('drag-over');
  };

  const handleDragLeave = () => dropZoneRef.current?.classList.remove('drag-over');

  const handleEditorConfirm = (file, previewUrl) => {
    setCroppedFile(file);
    setCroppedPreview(previewUrl);
    setFormData(prev => ({ ...prev, wordImage: file }));
    setShowEditor(false);
  };

  const handleEditorCancel = () => {
    setRawImageFile(null);
    setShowEditor(false);
  };

  const removeCroppedImage = () => {
    setCroppedFile(null);
    setCroppedPreview('');
    setFormData(prev => ({ ...prev, wordImage: null }));
  };

  const addUploadedMedia = async (event, field, urlKey) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setFormData(prev => ({ ...prev, [field]: [...(prev[field] || []), { [urlKey]: dataUrl }] }));
    } catch (error) {
      console.error(`Failed to read ${field} file`, error);
    }
  };

  const addMediaUrl = (field, urlKey, inputId) => {
    const input = document.getElementById(inputId);
    const value = input?.value.trim();
    if (!value) return;
    setFormData(prev => ({ ...prev, [field]: [...(prev[field] || []), { [urlKey]: value }] }));
    input.value = '';
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Build payload following new schema
    const payload = {
      word: formData.word,
      wordType: formData.wordType,
      expandedForm: formData.expandedForm || null,
      partOfSpeech: formData.partOfSpeech,
      meaning: formData.meaning,
      description: formData.description || null,
      categoryId: Number(formData.categoryId) || null,
      imageUrls: [],
      videos: formData.videos || [],
      audios: formData.audios || [],
      facts: formData.facts || [],
      examples: formData.examples || [],
      relatedWordIds: (formData.relatedWordIds || []).map(item => {
        if (item == null) return null;
        if (typeof item === 'object') return item.wordId ?? item.id ?? null;
        return item;
      }).filter(Boolean),
      alsoAppearsIn: (formData.alsoAppearsIn || []).map((item) => ({
        categoryId: item.categoryId ?? item.category_id ?? item.categoryId,
        wordId: item.wordId ?? item.id ?? item.wordId,
      })).filter((item) => item.categoryId != null && item.wordId != null),
      quizModes: formData.quizModes || [],
    };

    // attach source&credits using bracket notation
    payload['source&credits'] = formData.sourceAndCredits || {};

    const imageToUpload = croppedFile || formData.wordImage;

    try {
      if (imageToUpload) {
        const toDataUrl = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        try {
          const dataUrl = await toDataUrl(imageToUpload);
          payload.imageUrls = [dataUrl];
        } catch (err) {
          console.error('Failed to convert image to data URL', err);
          payload.imageUrls = [];
        }
      } else if (formData.imageUrls && formData.imageUrls.length > 0) {
        payload.imageUrls = formData.imageUrls.slice();
      }

      if (editingWord) {
        await api.patch(`/admin/words/${editingWord.id}`, payload, { headers: { 'Content-Type': 'application/json' } });
        alert('Word updated successfully');
      } else {
        await api.post('/admin/words', payload, { headers: { 'Content-Type': 'application/json' } });
        alert('Word created successfully');
      }
      closeModal();
      fetchWords();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingWord(null);
    setFormData({ word: '', wordType: 'NORMAL_WORD', expandedForm: '', partOfSpeech: 'OTHER', meaning: '', categoryId: '', examples: [], wordImage: null, imageUrls: [], videos: [], audios: [], description: '', facts: [], relatedWordIds: [], alsoAppearsIn: [], sourceAndCredits: {}, quizModes: [] });
    setCroppedFile(null);
    setCroppedPreview('');
    setRawImageFile(null);
  };

  const normalizeWordForEdit = (selectedWord) => {
    const examples = Array.isArray(selectedWord.examples)
      ? selectedWord.examples
      : Array.isArray(selectedWord.examplesList)
        ? selectedWord.examplesList
        : [];
    const facts = Array.isArray(selectedWord.facts) ? selectedWord.facts : [];
    const imageUrls = Array.isArray(selectedWord.imageUrls)
      ? selectedWord.imageUrls.map(image => typeof image === 'string' ? image : image?.imageUrl).filter(Boolean)
      : Array.isArray(selectedWord.images)
        ? selectedWord.images.map(image => typeof image === 'string' ? image : image?.imageUrl).filter(Boolean)
        : selectedWord.image
          ? [selectedWord.image]
          : selectedWord.wordImageUrl
            ? [selectedWord.wordImageUrl]
            : [];
        const videos = Array.isArray(selectedWord.videos) ? selectedWord.videos : [];
        const audios = Array.isArray(selectedWord.audios) ? selectedWord.audios : [];
    const relatedWordIds = Array.isArray(selectedWord.relatedWordIds)
      ? selectedWord.relatedWordIds.filter((item) => item != null)
      : Array.isArray(selectedWord.related)
        ? selectedWord.related.filter((item) => item != null)
        : [];
    const alsoAppearsIn = Array.isArray(selectedWord.alsoAppearsIn)
      ? selectedWord.alsoAppearsIn
      : Array.isArray(selectedWord.also)
        ? selectedWord.also
        : [];

    return {
      word: selectedWord.word || selectedWord.name || selectedWord.title || '',
      wordType: selectedWord.wordType || 'NORMAL_WORD',
      expandedForm: selectedWord.expandedForm || '',
      partOfSpeech: selectedWord.partOfSpeech || 'OTHER',
      meaning: (selectedWord.meaning || selectedWord.definition || selectedWord.mean) ?? '',
      categoryId: selectedWord.categoryId || selectedWord.category_id || selectedWord.category?.id || '',
      examples,
      wordImage: null,
      imageUrls,
      videos,
      audios,
      description: selectedWord.description || selectedWord.desc || '',
      facts,
      relatedWordIds,
      alsoAppearsIn,
      sourceAndCredits: selectedWord['source&credits'] || selectedWord.sourceAndCredits || selectedWord.source || {},
      quizModes: Array.isArray(selectedWord.quizModes) ? selectedWord.quizModes : [],
    };
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/admin/words/${id}`);
      alert('Word deleted successfully');
      fetchWords();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRebalance = async () => {
    try {
      setLoading(true);
      await rebalanceWordDisplayOrder();
      await fetchWords();
      setSnackbarOpen(true);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Unable to rebalance display orders.';
      setSnackbarOpen(true);
      console.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id) => {
    setViewLoading(true);
    setShowViewModal(true);
    setViewWord(null);
    try {
      console.debug('[Words] handleView: fetching word id=', id);
      const res = await api.get(`/admin/words/${id}`);
      // store raw response for debugging
      const body = res.data;
      console.debug('[Words] handleView: raw response:', body);
      setViewRaw(body);
      setViewShowRaw(false);
      // try several common wrapper keys the backend may use
      const extracted =
  (body?.data && typeof body.data === 'object' && body.data) ||
  (body?.result && typeof body.result === 'object' && body.result) ||
  (body?.payload && typeof body.payload === 'object' && body.payload) ||
  (body?.word && typeof body.word === 'object' && body.word) ||
  body;
      console.debug('[Words] handleView: extracted object:', extracted);

      // normalize shape to expected fields used by WordCard
      const normalize = (obj) => {
        if (!obj || typeof obj !== 'object') return null;
        const out = {};
        out.id = obj.id ?? obj.wordId ?? obj._id ?? null;
        out.word = obj.word ?? obj.name ?? obj.title ?? '';
        out.wordType = obj.wordType ?? null;
        out.expandedForm = obj.expandedForm ?? null;
        out.partOfSpeech = obj.partOfSpeech ?? null;
        out.meaning = obj.meaning ?? obj.definition ?? obj.mean ?? '';
        out.description = obj.description ?? obj.desc ?? null;
        out.categoryId = obj.categoryId ?? obj.category_id ?? obj.category?.id ?? null;
        const imgs = Array.isArray(obj.images) ? obj.images : (Array.isArray(obj.imageUrls) ? obj.imageUrls : (obj.image ? [obj.image] : []));
        // coerce to array of strings
        const imgUrls = (Array.isArray(imgs) ? imgs.map(i => {
          const url = typeof i === 'string' ? i : i?.imageUrl;
          return typeof url === 'string' ? url.trim() : '';
        }).filter(Boolean) : []);
        out.imageUrls = imgUrls;
        out.images = imgUrls;
        out.videos = Array.isArray(obj.videos) ? obj.videos : [];
        out.audios = Array.isArray(obj.audios) ? obj.audios : [];
        out.facts = Array.isArray(obj.facts) ? obj.facts : [];
        out.examples = Array.isArray(obj.examples) ? obj.examples : (Array.isArray(obj.examplesList) ? obj.examplesList : []);
        // relatedWordIds may be array of ids or objects; normalize to ids
        if (Array.isArray(obj.relatedWordIds)) {
          out.relatedWordIds = obj.relatedWordIds.map(r => {
            if (typeof r === 'object' && r !== null) return r;
            return r;
          }).filter(r => r != null);
        } else if (Array.isArray(obj.related)) {
          out.relatedWordIds = obj.related.map(r => {
            if (typeof r === 'object' && r !== null) return r;
            return r;
          }).filter(r => r != null);
        } else {
          out.relatedWordIds = [];
        }
        out.alsoAppearsIn = Array.isArray(obj['alsoAppearsIn']) ? obj['alsoAppearsIn'] : (Array.isArray(obj.also) ? obj.also : []);
        out['source&credits'] = obj['source&credits'] || obj.sourceAndCredits || obj.source || {};
        out.created = obj.created ?? obj.createdAt ?? obj.created_at ?? null;
        out.updated = obj.updated ?? obj.updatedAt ?? obj.updated_at ?? null;
        return out;
      };

      const normalized = normalize(extracted || body);
      console.debug('[Words] handleView: normalized object:', normalized);
      setViewWord(normalized || null);
      // only auto-open raw JSON if normalization failed entirely (no keys)
      if (!normalized || Object.keys(normalized).length === 0) {
        setViewShowRaw(true);
      } else {
        setViewShowRaw(false);
      }
    } catch (err) {
      console.error('Failed to fetch word details', err);
      setViewWord({ error: err.response?.data?.message || err.message });
    } finally {
      setViewLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading words...</div>;

  return (
    <div>
      {/* ── Header ── */}
      <div className="card-header">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h2>Words</h2>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.map(cat => (
              <option key={cat.id} value={String(cat.id)}>{cat.name} ({cat.wordCount} words)</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-info" onClick={handleRebalance} disabled={loading}>
            {loading ? 'Rebalancing…' : 'Rebalance Orders'}
          </button>
          <button className="btn btn-primary" onClick={() => {
            setEditingWord(null);
            setFormData({ word: '', wordType: 'NORMAL_WORD', expandedForm: '', partOfSpeech: 'OTHER', meaning: '', categoryId: '', examples: [], wordImage: null, imageUrls: [], videos: [], audios: [], description: '', facts: [], relatedWordIds: [], alsoAppearsIn: [], sourceAndCredits: {}, quizModes: [] });
            setShowModal(true);
          }}>+ Add Word</button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card">
        {sortedWords.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>No words found. Add some words!</p>
        ) : (
          <>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#4b5563', fontSize: 13 }}>
                Drag the handle to reorder words. Changes are saved immediately.
              </span>
              {isReordering && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4338ca', fontSize: 13 }}>
                  <CircularProgress size={14} /> Reordering…
                </span>
              )}
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr><th>ID</th><th>Image</th><th>Word</th><th>Meaning</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  <SortableContext items={sortedWords.map((word) => word.id)} strategy={verticalListSortingStrategy}>
                    {sortedWords.map((word) => (
                      <SortableWordRow
                        key={word.id}
                        word={word}
                        onEdit={(selectedWord) => {
                          setEditingWord(selectedWord);
                          setFormData(normalizeWordForEdit(selectedWord));
                          setShowModal(true);
                        }}
                        onView={handleView}
                        onDelete={handleDelete}
                        isReordering={isReordering}
                        isPending={isReordering}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
          </>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="modal" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{editingWord ? 'Edit Word' : 'Add Word'}</h3>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Word" value={formData.word}
                onChange={e => setFormData({ ...formData, word: e.target.value })} required />
              <select value={formData.wordType} onChange={e => setFormData({ ...formData, wordType: e.target.value })} required>
                <option value="ACRONYM">ACRONYM</option>
                <option value="NORMAL_WORD">NORMAL_WORD</option>
                <option value="ABBRIVATION">ABBRIVATION</option>
              </select>
              <input type="text" placeholder="Expanded form (optional)" value={formData.expandedForm}
                onChange={e => setFormData({ ...formData, expandedForm: e.target.value })} />
              <select value={formData.partOfSpeech} onChange={e => setFormData({ ...formData, partOfSpeech: e.target.value })} required>
                <option value="VERB">VERB</option>
                <option value="NOUN">NOUN</option>
                <option value="ADJECTIVE">ADJECTIVE</option>
                <option value="HELPING_VERB">HELPING_VERB</option>
                <option value="ADVERB">ADVERB</option>
                <option value="PRONOUN">PRONOUN</option>
                <option value="PREPOSITION">PREPOSITION</option>
                <option value="CONJUNCTION">CONJUNCTION</option>
                <option value="INTERJECTION">INTERJECTION</option>
                <option value="DETERMINER">DETERMINER</option>
                <option value="ARTICLE">ARTICLE</option>
                <option value="OTHER">OTHER</option>
              </select>
              <textarea placeholder="Meaning" value={formData.meaning}
                onChange={e => setFormData({ ...formData, meaning: e.target.value })} rows="3" required />
              <select value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required>
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>

              {/* ── Description ── */}
              <div style={{ marginBottom: 8 }}>
                <textarea placeholder="Description" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} style={{ width: '100%', padding: 8 }} />
              </div>

              {/* ── Quiz Modes ── */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Quiz Modes</label>
                <label style={{ marginRight: 12 }}>
                  <input type="checkbox" checked={(formData.quizModes||[]).includes('IMAGE')} onChange={e => {
                    const has = (formData.quizModes||[]).includes('IMAGE');
                    const updated = has ? (formData.quizModes||[]).filter(m=>m!=='IMAGE') : [...(formData.quizModes||[]),'IMAGE'];
                    setFormData({ ...formData, quizModes: updated });
                  }} /> IMAGE
                </label>
                <label style={{ marginRight: 12 }}>
                  <input type="checkbox" checked={(formData.quizModes||[]).includes('TEXT')} onChange={e => {
                    const has = (formData.quizModes||[]).includes('TEXT');
                    const updated = has ? (formData.quizModes||[]).filter(m=>m!=='TEXT') : [...(formData.quizModes||[]),'TEXT'];
                    setFormData({ ...formData, quizModes: updated });
                  }} /> TEXT
                </label>
                <label>
                  <input type="checkbox" checked={(formData.quizModes||[]).includes('AUDIO')} onChange={e => {
                    const has = (formData.quizModes||[]).includes('AUDIO');
                    const updated = has ? (formData.quizModes||[]).filter(m=>m!=='AUDIO') : [...(formData.quizModes||[]),'AUDIO'];
                    setFormData({ ...formData, quizModes: updated });
                  }} /> AUDIO
                </label>
              </div>


              {/* ── Image Upload Zone ── */}
              <div
                ref={dropZoneRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={styles.dropZone}
              >
                {croppedPreview ? (
                  <div style={styles.previewWrapper}>
                    <img src={croppedPreview} alt="preview" style={styles.thumbPreview} />
                    <div style={styles.previewActions}>
                      <button type="button" style={styles.btnReEdit}
                        onClick={() => rawImageFile && openEditor(rawImageFile)}>
                        ✏️ Re-edit
                      </button>
                      <button type="button" style={styles.btnRemove} onClick={removeCroppedImage}>
                        🗑 Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={styles.dropPrompt}>
                    <span style={styles.dropIcon}>🖼️</span>
                    <span style={styles.dropText}>
                      Drop image here, <label style={styles.browseLink}>
                        browse
                        <input type="file" accept="image/*" onChange={handleFileChange}
                          style={{ display: 'none' }} />
                      </label>, or <strong>Ctrl+V</strong> to paste
                    </span>
                    <span style={styles.dropSub}>Output will be cropped to a square (400×400)</span>
                  </div>
                )}
              </div>

              {/* ── Facts ── */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ marginBottom: 6 }}>Facts</label>
                  <button type="button" style={styles.btnAddExample} onClick={() => setFormData({ ...formData, facts: [...(formData.facts||[]), ''] })}>+ Add Fact</button>
                </div>
                  {formData.facts.length === 0 && (
                  <p style={styles.factsEmpty}>No Facts yet. Click &quot;+ Add Facts&quot; to add one.</p>
                )}
                {(formData.facts || []).map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                   <span style={styles.factNum}>{i + 1}</span>
                    <input
                      type="text"
                      placeholder={`Facts sentence ${i + 1}`}
                      value={f}
                      onChange={e => {
                        const updated = [...formData.facts];
                        updated[i] = e.target.value;
                        setFormData({ ...formData, facts: updated });
                      }}
                      style={styles.exampleInput}
                    />
                    <button type="button" style={styles.btnRemoveExample} onClick={() => setFormData({ ...formData, facts: formData.facts.filter((_, j) => j !== i) })}>&#x2715;</button>
                  </div>
                ))}
              </div>

              {/* ── Examples ── */}
              <div style={styles.examplesSection}>
                <div style={styles.examplesHeader}>
                  <label style={styles.examplesLabel}>Examples</label>
                  <button type="button" style={styles.btnAddExample} onClick={() => setFormData({ ...formData, examples: [...formData.examples, ''] })} > + Add Example </button>
                </div>
                {formData.examples.length === 0 && (
                  <p style={styles.examplesEmpty}>No examples yet. Click &quot;+ Add Example&quot; to add one.</p>
                )}
                {formData.examples.map((ex, i) => (
                  <div key={i} style={styles.exampleRow}>
                    <span style={styles.exampleNum}>{i + 1}</span>
                    <input
                      type="text"
                      placeholder={`Example sentence ${i + 1}`}
                      value={ex}
                      onChange={e => {
                        const updated = [...formData.examples];
                        updated[i] = e.target.value;
                        setFormData({ ...formData, examples: updated });
                      }}
                      style={styles.exampleInput}
                    />
                    <button type="button"style={styles.btnRemoveExample} onClick={() => setFormData({ ...formData, examples: formData.examples.filter((_, j) => j !== i) })} >
                      &#x2715;
                    </button>
                  </div>
                ))}
              </div>

              {/* ── Image URLs ── */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Image URLs</label>
                {(formData.imageUrls || []).map((u, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <input type="text" value={u} onChange={e => { const updated = [...formData.imageUrls]; updated[i] = e.target.value; setFormData({ ...formData, imageUrls: updated }); }} style={{ flex: 1, padding: 6 }} />
                    <button type="button" style={styles.btnRemoveExample} onClick={() => setFormData({ ...formData, imageUrls: formData.imageUrls.filter((_, j) => j !== i) })}>&#x2715;</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" placeholder="Add image URL" id="newImageUrl" style={{ flex: 1, padding: 6 }} />
                  <button type="button" style={styles.btnAddExample} onClick={() => {
                    const el = document.getElementById('newImageUrl');
                    if (!el) return;
                    const v = el.value.trim();
                    if (!v) return;
                    setFormData({ ...formData, imageUrls: [...(formData.imageUrls||[]), v] });
                    el.value = '';
                  }}>Add</button>
                  {croppedPreview && (
                    <button type="button" style={styles.btnAddExample} onClick={async () => {
                      if (!croppedFile) return;
                      const toDataUrl = (file) => new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });
                      try {
                        const dataUrl = await toDataUrl(croppedFile);
                        setFormData({ ...formData, imageUrls: [...(formData.imageUrls||[]), dataUrl] });
                        setCroppedFile(null);
                        setCroppedPreview('');
                      } catch (err) { console.error(err); }
                    }}>Use Uploaded Image</button>
                  )}
                </div>
              </div>

              {/* ── Videos ── */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Videos</label>
                {(formData.videos || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <video src={item.videoUrl} controls style={{ width: 120, maxHeight: 70 }} />
                    <input type="text" value={item.videoUrl} onChange={e => {
                      const updated = [...formData.videos];
                      updated[i] = { videoUrl: e.target.value };
                      setFormData({ ...formData, videos: updated });
                    }} style={{ flex: 1, padding: 6 }} />
                    <button type="button" style={styles.btnRemoveExample} onClick={() => setFormData({ ...formData, videos: formData.videos.filter((_, j) => j !== i) })}>&#x2715;</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" placeholder="Add video URL" id="newVideoUrl" style={{ flex: 1, padding: 6 }} />
                  <button type="button" style={styles.btnAddExample} onClick={() => addMediaUrl('videos', 'videoUrl', 'newVideoUrl')}>Add URL</button>
                  <label style={styles.btnAddExample}>
                    Upload video
                    <input type="file" accept="video/*" onChange={e => addUploadedMedia(e, 'videos', 'videoUrl')} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              {/* ── Audios ── */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Audios</label>
                {(formData.audios || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <audio src={item.audioUrl} controls style={{ width: 220 }} />
                    <input type="text" value={item.audioUrl} onChange={e => {
                      const updated = [...formData.audios];
                      updated[i] = { audioUrl: e.target.value };
                      setFormData({ ...formData, audios: updated });
                    }} style={{ flex: 1, padding: 6 }} />
                    <button type="button" style={styles.btnRemoveExample} onClick={() => setFormData({ ...formData, audios: formData.audios.filter((_, j) => j !== i) })}>&#x2715;</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="Add audio URL" id="newAudioUrl" style={{ flex: 1, padding: 6 }} />
                  <button type="button" style={styles.btnAddExample} onClick={() => addMediaUrl('audios', 'audioUrl', 'newAudioUrl')}>Add URL</button>
                  <label style={styles.btnAddExample}>
                    Upload audio
                    <input type="file" accept="audio/*" onChange={e => addUploadedMedia(e, 'audios', 'audioUrl')} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              {/* ── Related Word IDs ── */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Related Word IDs</label>
                {(formData.relatedWordIds || []).map((item, i) => {
                  const value = typeof item === 'object' ? (item.wordId ?? item.id ?? '') : item;
                  const displayName = typeof item === 'object' ? (item.word || item.name || '') : '';
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, flexDirection: 'column', marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="number" value={value} onChange={e => {
                          const updated = [...formData.relatedWordIds];
                          const newId = Number(e.target.value);
                          updated[i] = typeof item === 'object' ? { ...item, wordId: newId, id: newId } : newId;
                          setFormData({ ...formData, relatedWordIds: updated });
                        }} style={{ padding: 6, flex: 1 }} />
                        <button type="button" style={styles.btnRemoveExample} onClick={() => setFormData({ ...formData, relatedWordIds: formData.relatedWordIds.filter((_, j) => j !== i) })}>&#x2715;</button>
                      </div>
                      {displayName ? <div style={{ color: '#6b7280', fontSize: 12 }}>Name: {displayName}</div> : null}
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" id="newRelatedId" placeholder="Add related word id" style={{ padding: 6 }} />
                  <button type="button" style={styles.btnAddExample} onClick={() => { const el = document.getElementById('newRelatedId'); if (!el) return; const v = Number(el.value); if (!v) return; setFormData({ ...formData, relatedWordIds: [...(formData.relatedWordIds||[]), v] }); el.value = ''; }}>Add</button>
                </div>
              </div>

              {/* ── Also Appears In ── */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Also Appears In</label>
                {(formData.alsoAppearsIn || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, flexDirection: 'column', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" value={item.categoryId} onChange={e => { const updated = [...formData.alsoAppearsIn]; updated[i] = { ...updated[i], categoryId: Number(e.target.value) }; setFormData({ ...formData, alsoAppearsIn: updated }); }} placeholder="CategoryId" style={{ padding: 6, flex: 1 }} />
                      <input type="number" value={item.wordId} onChange={e => { const updated = [...formData.alsoAppearsIn]; updated[i] = { ...updated[i], wordId: Number(e.target.value) }; setFormData({ ...formData, alsoAppearsIn: updated }); }} placeholder="WordId" style={{ padding: 6, flex: 1 }} />
                      <button type="button" style={styles.btnRemoveExample} onClick={() => setFormData({ ...formData, alsoAppearsIn: formData.alsoAppearsIn.filter((_, j) => j !== i) })}>&#x2715;</button>
                    </div>
                    {(item.categoryName || item.word) ? (
                      <div style={{ color: '#6b7280', fontSize: 12 }}>
                        {item.categoryName ? `Category: ${item.categoryName}` : ''}
                        {item.categoryName && item.word ? ' · ' : ''}
                        {item.word ? `Word: ${item.word}` : ''}
                      </div>
                    ) : null}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" id="newAlsoCategory" placeholder="CategoryId" style={{ padding: 6 }} />
                  <input type="number" id="newAlsoWord" placeholder="WordId" style={{ padding: 6 }} />
                  <button type="button" style={styles.btnAddExample} onClick={() => {
                    const c = Number(document.getElementById('newAlsoCategory')?.value);
                    const w = Number(document.getElementById('newAlsoWord')?.value);
                    if (!c || !w) return;
                    setFormData({ ...formData, alsoAppearsIn: [...(formData.alsoAppearsIn||[]), { categoryId: c, wordId: w }] });
                    document.getElementById('newAlsoCategory').value = '';
                    document.getElementById('newAlsoWord').value = '';
                  }}>Add</button>
                </div>
              </div>

              {/* ── Source & Credits ── */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Source & Credits</label>
                <input type="text" placeholder="Author" value={formData.sourceAndCredits?.author || ''} onChange={e => setFormData({ ...formData, sourceAndCredits: { ...(formData.sourceAndCredits||{}), author: e.target.value } })} style={{ width: '100%', padding: 6, marginBottom: 6 }} />
                <input type="text" placeholder="Platform" value={formData.sourceAndCredits?.platform || ''} onChange={e => setFormData({ ...formData, sourceAndCredits: { ...(formData.sourceAndCredits||{}), platform: e.target.value } })} style={{ width: '100%', padding: 6, marginBottom: 6 }} />
                <input type="text" placeholder="URL" value={formData.sourceAndCredits?.url || ''} onChange={e => setFormData({ ...formData, sourceAndCredits: { ...(formData.sourceAndCredits||{}), url: e.target.value } })} style={{ width: '100%', padding: 6, marginBottom: 6 }} />
                <input type="text" placeholder="Type" value={formData.sourceAndCredits?.type || ''} onChange={e => setFormData({ ...formData, sourceAndCredits: { ...(formData.sourceAndCredits||{}), type: e.target.value } })} style={{ width: '100%', padding: 6, marginBottom: 6 }} />
                <input type="text" placeholder="Source" value={formData.sourceAndCredits?.source || ''} onChange={e => setFormData({ ...formData, sourceAndCredits: { ...(formData.sourceAndCredits||{}), source: e.target.value } })} style={{ width: '100%', padding: 6, marginBottom: 6 }} />
                <input type="text" placeholder="Licences" value={formData.sourceAndCredits?.licences || ''} onChange={e => setFormData({ ...formData, sourceAndCredits: { ...(formData.sourceAndCredits||{}), licences: e.target.value } })} style={{ width: '100%', padding: 6 }} />
              </div>

              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn" onClick={closeModal}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {showViewModal && (
            <div className="modal" onClick={() => setShowViewModal(false)} >
              <div className="modal-content" onClick={e => e.stopPropagation()}>
            {viewLoading && <p>Loading...</p>}
            {!viewLoading && viewWord && viewWord.error && (
              <div style={{ color: 'red' }}>Error: {viewWord.error}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Word Details</h3>
                <button className="btn" onClick={() => setViewShowRaw(v => !v)}>{viewShowRaw ? 'Hide Raw' : 'Show Raw'}</button>
              </div>
              <div>
                <button className="btn" onClick={() => setShowViewModal(false)}>Close</button>
              </div>
            </div>

            {!viewLoading && viewShowRaw && viewRaw && (
              <div style={{ marginTop: 12 }}>
                <pre style={{ maxHeight: 400, overflow: 'auto', background: '#f8fafc', padding: 8 }}>{JSON.stringify(viewRaw, null, 2)}</pre>
              </div>
            )}

            {!viewLoading && !viewShowRaw && viewWord && !viewWord.error && (
              <div style={{ marginTop: 12 }}>
                <WordCard word={viewWord} />
              </div>
            )}

            {/* If normalized word is empty, show a diagnostic message and the raw JSON */}
            {!viewLoading && !viewShowRaw && (!viewWord || Object.keys(viewWord).length === 0) && (
              <div style={{ marginTop: 12, padding: 12, background: '#fff6f6', borderRadius: 8 }}>
                <strong>No parsed word data available.</strong>
                <p style={{ margin: '6px 0' }}>Showing raw response to inspect fields — click <em>Show Raw</em> if hidden.</p>
                <pre style={{ maxHeight: 240, overflow: 'auto', background: '#f8fafc', padding: 8 }}>{JSON.stringify(viewRaw, null, 2)}</pre>
              </div>
            )}            
          </div>
        </div>
      )}

      {/* ── Image Editor ── */}
      {showEditor && rawImageFile && (
        <ImageEditor
          file={rawImageFile}
          onConfirm={handleEditorConfirm}
          onCancel={handleEditorCancel}
        />
      )}

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="info" sx={{ width: '100%' }}>
          {reorderMessage || 'Word order updated.'}
        </Alert>
      </Snackbar>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  // Drop zone
  dropZone: {
    border: '2px dashed #ccc',
    borderRadius: 8,
    padding: '1rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    background: '#fafafa',
    minHeight: 90,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dropPrompt: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' },
  dropIcon: { fontSize: 28 },
  dropText: { fontSize: 13, color: '#555' },
  dropSub: { fontSize: 11, color: '#999' },
  browseLink: { color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' },
  previewWrapper: { display: 'flex', alignItems: 'center', gap: 12 },
  thumbPreview: { width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '2px solid #4f46e5' },
  previewActions: { display: 'flex', flexDirection: 'column', gap: 6 },
  btnReEdit: { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
  btnRemove: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },

  // Editor overlay
  editorOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  editorBox: {
    background: '#fff', borderRadius: 12, padding: '1.5rem',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxWidth: 380, width: '100%',
  },
  editorTitle: { margin: 0, fontSize: 18, fontWeight: 700 },
  editorHint: { margin: 0, fontSize: 12, color: '#888' },
  previewCanvas: {
    width: 300, height: 300, borderRadius: 8,
    border: '2px solid #4f46e5', display: 'block',
    userSelect: 'none',
  },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 10, width: '100%' },
  sliderLabel: { fontSize: 13, fontWeight: 600, minWidth: 35 },
  slider: { flex: 1, accentColor: '#4f46e5' },
  sliderVal: { fontSize: 12, color: '#555', minWidth: 50, textAlign: 'right' },
  editorMeta: { fontSize: 11, color: '#aaa', textAlign: 'center' },
  editorLoading: { padding: '2rem', color: '#888' },
  editorActions: { display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end' },
  // Examples
  examplesSection: { marginBottom: 10 },
  examplesHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  examplesLabel: { fontWeight: 600, fontSize: 13 },
  examplesEmpty: { fontSize: 12, color: '#aaa', margin: '4px 0 8px', fontStyle: 'italic' },
  factsEmpty: { fontSize: 12, color: '#aaa', margin: '4px 0 8px', fontStyle: 'italic' },
  exampleRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  exampleNum: { fontSize: 12, color: '#888', minWidth: 16, textAlign: 'right' },
  exampleInput: { flex: 1, padding: '6px 10px', borderRadius: 5, border: '1px solid #ccc', fontSize: 13 },
  btnAddExample: { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnRemoveExample: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 5, width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnCancel: { padding: '8px 18px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 14 },
  btnConfirm: { padding: '8px 18px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};

export default Words;
