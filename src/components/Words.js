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
import { Link, useLocation } from 'react-router-dom';
import { useWordReorder } from '../hooks/useWordReorder';
import { usePersistentState } from '../hooks/usePersistentState';
import { rebalanceWordDisplayOrder } from '../services/wordReorderService';
import {
  fetchAllCategories,
  invalidateCategoryCache,
  searchCategories,
} from '../services/categoryService';
import { deleteWordDraft, getWordDraft, saveWordDraft } from '../services/wordDraftService';
import {
  fetchAdminWord,
  fetchWordsByCategory,
  invalidateWordCache,
  searchWords,
} from '../services/wordCacheService';
import ImageEditor from './ImageEditor';
import SortableWordRow from './SortableWordRow';
import WordCard from './WordCard';

const extractWordList = (data) => [
  data,
  data?.words,
  data?.content,
  data?.data,
  data?.data?.words,
  data?.data?.content,
  data?.result,
  data?.payload,
].find(Array.isArray) || [];

const extractWordObject = (data) => [
  data?.data?.word,
  data?.result?.word,
  data?.payload?.word,
  data?.word,
  data?.data,
  data?.result,
  data?.payload,
  Array.isArray(data?.words) ? data.words[0] : null,
  data,
].find(value => value && typeof value === 'object' && !Array.isArray(value)) || null;

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') resolve(reader.result);
    else reject(new Error('Could not read the selected image.'));
  };
  reader.onerror = () => reject(reader.error || new Error('Could not read the selected image.'));
  reader.readAsDataURL(file);
});

const createEmptyMediaCredits = () => ({
  author: '',
  platform: '',
  creditUrl: '',
  license: '',
  licenseUrl: '',
  attributionRequired: false,
  attributionText: '',
});

const mediaPlatformPresets = {
  Pixabay: {
    platform: 'Pixabay',
    license: 'Pixabay Content License',
    licenseUrl: 'https://pixabay.com/service/license-summary/',
  },
  Pexels: {
    platform: 'Pexels',
    license: 'Pexels License',
    licenseUrl: 'https://www.pexels.com/license/',
  },
  Unsplash: {
    platform: 'Unsplash',
    license: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license',
  },
};

const mediaCreditFields = [
  ['author', 'Author'],
  ['creditUrl', 'Credit URL'],
  ['license', 'License'],
  ['licenseUrl', 'License URL'],
  ['attributionText', 'Attribution text'],
];

const MediaCreditsFields = ({ credits, onChange }) => {
  const isPresetPlatform = Object.prototype.hasOwnProperty.call(mediaPlatformPresets, credits?.platform);

  const handlePlatformChange = (event) => {
    const preset = mediaPlatformPresets[event.target.value];
    if (preset) {
      Object.entries(preset).forEach(([key, value]) => onChange(key, value));
      return;
    }

    onChange('platform', '');
    onChange('license', '');
    onChange('licenseUrl', '');
  };

  return (
    <fieldset style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: 8, margin: '6px 0' }}>
      <legend style={{ padding: '0 6px', fontSize: 12, fontWeight: 600 }}>Media credits</legend>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
        <label style={{ display: 'grid', gap: 3, fontSize: 12 }}>
          Platform
          <select
            value={isPresetPlatform ? credits.platform : 'custom'}
            onChange={handlePlatformChange}
            style={{ padding: 6 }}
          >
            <option value="custom">Other (enter manually)</option>
            {Object.keys(mediaPlatformPresets).map(platform => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
        </label>
        {!isPresetPlatform && (
          <label style={{ display: 'grid', gap: 3, fontSize: 12 }}>
            Custom platform
            <input
              type="text"
              value={credits?.platform || ''}
              onChange={event => onChange('platform', event.target.value)}
              style={{ padding: 6 }}
            />
          </label>
        )}
        {mediaCreditFields.map(([key, label]) => (
          <label key={key} style={{ display: 'grid', gap: 3, fontSize: 12 }}>
            {label}
            <input
              type="text"
              value={credits?.[key] || ''}
              onChange={event => onChange(key, event.target.value)}
              style={{ padding: 6 }}
            />
          </label>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
        <input
          type="checkbox"
          checked={Boolean(credits?.attributionRequired)}
          onChange={event => onChange('attributionRequired', event.target.checked)}
        />
        Attribution required
      </label>
    </fieldset>
  );
};

const createEmptyFormData = (languageId = '') => ({
  languageId,
  grammarValueIds: [],
  word: '',
  wordDetails: {
    expandedForm: '',
    usage: '',
    etymology: '',
  },
  meaning: '',
  categoryIds: [],
  categoryDisplayOrders: {},
  redirectCategory: '',
  examples: [],
  wordImage: null,
  wordImageCredits: createEmptyMediaCredits(),
  imageUrls: [],
  videos: [],
  audios: [],
  description: '',
  facts: [],
  relatedWordIds: [],
  alsoAppearsIn: [],
  quizModes: [],
});

// ── Main Words Component ────────────────────────────────────────────────────
function Words() {
  const location = useLocation();
  const [words, setWords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryDirectory, setCategoryDirectory] = useState({});
  const [languages, setLanguages] = useState([]);
  const [grammarValues, setGrammarValues] = useState([]);
  const [grammarOptionsLoading, setGrammarOptionsLoading] = useState(true);
  const [grammarOptionsError, setGrammarOptionsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewWord, setViewWord] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewRaw, setViewRaw] = useState(null);
  const [viewShowRaw, setViewShowRaw] = useState(false);
  const [selectedCategory, setSelectedCategory] = usePersistentState('wordgame.words.selectedCategory', '');
  const [grammarValueSearch, setGrammarValueSearch] = useState('');
  const [grammarValuesOpen, setGrammarValuesOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categorySearchLoading, setCategorySearchLoading] = useState(false);
  const [relatedWordSearch, setRelatedWordSearch] = useState('');
  const [relatedWordResults, setRelatedWordResults] = useState([]);
  const [relatedWordSearchLoading, setRelatedWordSearchLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [formData, setFormData] = useState(() => createEmptyFormData());
  const handledCategoryNavigation = useRef(null);
  const handledDraftNavigation = useRef(null);
  const [selectionPresets, setSelectionPresets] = usePersistentState('wordgame.words.selectionPresets', []);
  const [selectionPresetName, setSelectionPresetName] = useState('');
  const [selectedSelectionPresetId, setSelectedSelectionPresetId] = useState('');
  const [selectionPresetError, setSelectionPresetError] = useState('');

  // Image editor state
  const [rawImageFile, setRawImageFile] = useState(null);   // file going INTO editor
  const [croppedFile, setCroppedFile] = useState(null);     // file coming OUT of editor
  const [croppedPreview, setCroppedPreview] = useState(''); // object URL for display
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    const categoryId = location.state?.categoryId;
    if (categoryId == null || handledCategoryNavigation.current === location.key) return;

    handledCategoryNavigation.current = location.key;
    setSelectedCategory(String(categoryId));
    if (location.state.openCreateWord) {
      setEditingWord(null);
      setActiveDraftId(null);
      setFormData(createEmptyFormData(languages[0]?.id ? String(languages[0].id) : ''));
      setShowModal(true);
    }
  }, [location.key, location.state, languages, setSelectedCategory]);

  useEffect(() => {
    const draftId = location.state?.draftId;
    if (!draftId || handledDraftNavigation.current === location.key) return;

    handledDraftNavigation.current = location.key;
    try {
      const draft = getWordDraft(draftId);
      if (!draft) {
        alert('This draft could not be found in this browser.');
        return;
      }

      setEditingWord(null);
      setActiveDraftId(draft.id);
      setFormData({
        ...createEmptyFormData(draft.formData?.languageId || ''),
        ...draft.formData,
        wordDetails: {
          ...createEmptyFormData().wordDetails,
          ...draft.formData?.wordDetails,
        },
      });
      if (draft.formData?.categoryIds?.length) {
        setSelectedCategory(String(draft.formData.categoryIds[0]));
      }
      setCroppedFile(null);
      setCroppedPreview('');
      setRawImageFile(null);
      setShowModal(true);
    } catch (error) {
      alert(`Could not load this draft: ${error.message}`);
    }
  }, [location.key, location.state, setSelectedCategory]);

  const dropZoneRef = useRef(null);
  const grammarValuesRef = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const sortedWords = useMemo(
    () => [...words].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [words]
  );

  const { isReordering, reorderMessage, reorderWord } = useWordReorder({
    words: sortedWords,
    categoryId: selectedCategory,
    setWords,
    onError: () => setSnackbarOpen(true),
  });

  // ── Fetch helpers ──
  const fetchCategories = useCallback(async () => {
    try {
      const categoryList = await fetchAllCategories();
      setCategories(categoryList);
      setCategoryDirectory(previous => ({
        ...previous,
        ...Object.fromEntries(categoryList.map(category => [category.id, category])),
      }));
      if (categoryList.length > 0) {
        setSelectedCategory(current => current || String(categoryList[0].id));
      }
    } catch (err) { console.error(err); }
  }, [setSelectedCategory]);

  useEffect(() => {
    let active = true;
    const fetchWordFormOptions = async () => {
      setGrammarOptionsError('');
      try {
        const [languageResponse, grammarValueResponse] = await Promise.all([
          api.get('/admin/languages'),
          api.get('/admin/grammar-values'),
        ]);
        if (!active) return;
        setLanguages(Array.isArray(languageResponse.data) ? languageResponse.data : []);
        setGrammarValues(Array.isArray(grammarValueResponse.data) ? grammarValueResponse.data : []);
      } catch (error) {
        if (active) {
          setGrammarOptionsError(
            error.response?.data?.message || error.message || 'Failed to load languages and grammar values.'
          );
        }
      } finally {
        if (active) setGrammarOptionsLoading(false);
      }
    };

    fetchWordFormOptions();
    return () => { active = false; };
  }, []);

  const fetchWords = useCallback(async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      const responseData = await fetchWordsByCategory(selectedCategory, 0, 100);
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
  useEffect(() => {
    if (!showModal || !relatedWordSearch.trim()) {
      setRelatedWordResults([]);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setRelatedWordSearchLoading(true);
      try {
        const responseData = await searchWords(relatedWordSearch, 0, 10);
        if (active) setRelatedWordResults(extractWordList(responseData));
      } catch (err) {
        if (active) setRelatedWordResults([]);
        console.error('Failed to search related words', err);
      } finally {
        if (active) setRelatedWordSearchLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [relatedWordSearch, showModal]);
  useEffect(() => {
    if (!grammarValuesOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!grammarValuesRef.current?.contains(event.target)) {
        setGrammarValuesOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [grammarValuesOpen]);
  useEffect(() => {
    if (!showModal) setGrammarValuesOpen(false);
  }, [showModal]);
  useEffect(() => {
    if (!showModal) return undefined;
    if (!categorySearch.trim()) {
      fetchCategories();
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setCategorySearchLoading(true);
      try {
        if (active) {
          const categoryList = await searchCategories(categorySearch, 0, 10);
          setCategories(categoryList);
          setCategoryDirectory(previous => ({
            ...previous,
            ...Object.fromEntries(categoryList.map(category => [category.id, category])),
          }));
        }
      } catch (err) {
        if (active) setCategories([]);
        console.error('Failed to search categories', err);
      } finally {
        if (active) setCategorySearchLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [categorySearch, showModal, fetchCategories]);
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
    setFormData(prev => ({ ...prev, wordImage: null, wordImageCredits: createEmptyMediaCredits() }));
  };

  const updateMediaCredits = (field, index, creditField, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, itemIndex) => itemIndex === index
        ? { ...item, credits: { ...createEmptyMediaCredits(), ...item.credits, [creditField]: value } }
        : item),
    }));
  };

  const updateMediaItem = (field, index, updates) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item),
    }));
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
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), { [urlKey]: dataUrl, credits: createEmptyMediaCredits() }],
      }));
    } catch (error) {
      console.error(`Failed to read ${field} file`, error);
    }
  };

  const addMediaUrl = (field, urlKey, inputId) => {
    const input = document.getElementById(inputId);
    const value = input?.value.trim();
    if (!value) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), { [urlKey]: value, credits: createEmptyMediaCredits() }],
    }));
    input.value = '';
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.languageId) {
      alert('Please select a language.');
      return;
    }
    if (!formData.categoryIds?.length) {
      alert('Please select at least one category.');
      return;
    }

    const payload = {
      languageId: Number(formData.languageId),
      grammarValueIds: (formData.grammarValueIds || [])
        .map(Number)
        .filter(id => id && grammarValuesForLanguage.some(value => Number(value.id) === id)),
      word: formData.word,
      meaning: formData.meaning,
      wordDetails: {
        expandedForm: formData.wordDetails.expandedForm || null,
        usage: formData.wordDetails.usage || null,
        etymology: formData.wordDetails.etymology || null,
      },
      description: formData.description || null,
      redirectCategory: formData.redirectCategory ? Number(formData.redirectCategory) : null,
      categories: (formData.categoryIds || [])
        .map(Number)
        .filter(Boolean)
        .map(categoryId => {
          const displayOrder = formData.categoryDisplayOrders?.[categoryId];
          return {
            categoryId,
            displayOrder: displayOrder == null || displayOrder === '' ? null : Number(displayOrder),
          };
        }),
      images: (formData.imageUrls || [])
        .map(image => ({
          imageUrl: typeof image === 'string' ? image : image?.imageUrl,
          credits: {
            ...createEmptyMediaCredits(),
            ...(typeof image === 'object' && image !== null ? image.credits : {}),
          },
        }))
        .filter(image => typeof image.imageUrl === 'string' && image.imageUrl.trim()),
      videos: (formData.videos || [])
        .map(video => ({
          videoUrl: typeof video === 'string' ? video : video?.videoUrl,
          credits: {
            ...createEmptyMediaCredits(),
            ...(typeof video === 'object' && video !== null ? video.credits : {}),
          },
        }))
        .filter(video => typeof video.videoUrl === 'string' && video.videoUrl.trim()),
      audios: (formData.audios || [])
        .map(audio => ({
          audioUrl: typeof audio === 'string' ? audio : audio?.audioUrl,
          credits: {
            ...createEmptyMediaCredits(),
            ...(typeof audio === 'object' && audio !== null ? audio.credits : {}),
          },
        }))
        .filter(audio => typeof audio.audioUrl === 'string' && audio.audioUrl.trim()),
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
          payload.images.unshift({
            imageUrl: dataUrl,
            credits: { ...createEmptyMediaCredits(), ...formData.wordImageCredits },
          });
        } catch (err) {
          console.error('Failed to convert image to data URL', err);
        }
      }

      if (editingWord) {
        await api.patch(`/admin/words/${editingWord.id}`, payload, { headers: { 'Content-Type': 'application/json' } });
        alert('Word updated successfully');
      } else {
        await api.post('/admin/words', payload, { headers: { 'Content-Type': 'application/json' } });
        alert('Word created successfully');
      }
      if (activeDraftId) {
        try {
          deleteWordDraft(activeDraftId);
        } catch (draftError) {
          alert(`Word was saved, but its local draft could not be removed: ${draftError.message}`);
        }
        setActiveDraftId(null);
      }
      invalidateWordCache();
      invalidateCategoryCache();
      closeModal();
      fetchWords();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingWord(null);
    setActiveDraftId(null);
    setCategorySearch('');
    setRelatedWordSearch('');
    setFormData(createEmptyFormData());
    setCroppedFile(null);
    setCroppedPreview('');
    setRawImageFile(null);
  };

  const handleSaveDraft = async () => {
    if (!formData.word.trim()) {
      alert('Enter a word before saving it as a draft.');
      return;
    }

    setSavingDraft(true);
    try {
      const draftFormData = {
        ...formData,
        wordImage: null,
        imageUrls: [...(formData.imageUrls || [])],
      };
      const imageToSave = croppedFile || formData.wordImage;
      if (imageToSave) {
        const imageUrl = await fileToDataUrl(imageToSave);
        draftFormData.imageUrls.push({
          imageUrl,
          credits: { ...createEmptyMediaCredits(), ...formData.wordImageCredits },
        });
      }

      const savedDraft = saveWordDraft({
        id: activeDraftId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        formData: draftFormData,
      });
      setActiveDraftId(savedDraft.id);
      setFormData(draftFormData);
      setCroppedFile(null);
      setCroppedPreview('');
      setRawImageFile(null);
      alert('Draft saved in this browser.');
    } catch (error) {
      alert(`Could not save draft: ${error.message}`);
    } finally {
      setSavingDraft(false);
    }
  };

  const normalizeWordForEdit = (selectedWord) => {
    const examples = Array.isArray(selectedWord.examples)
      ? selectedWord.examples
      : Array.isArray(selectedWord.examplesList)
        ? selectedWord.examplesList
        : [];
    const facts = Array.isArray(selectedWord.facts) ? selectedWord.facts : [];
    const imageEntries = Array.isArray(selectedWord.images) && selectedWord.images.length
      ? selectedWord.images
      : Array.isArray(selectedWord.imageUrls)
        ? selectedWord.imageUrls
        : [];
    const imageUrls = imageEntries.length
      ? imageEntries.map(image => typeof image === 'string'
        ? { imageUrl: image, credits: createEmptyMediaCredits() }
        : { ...image, credits: { ...createEmptyMediaCredits(), ...image?.credits } }).filter(image => image.imageUrl)
      : selectedWord.image
          ? [{ imageUrl: selectedWord.image, credits: createEmptyMediaCredits() }]
          : selectedWord.wordImageUrl
            ? [{ imageUrl: selectedWord.wordImageUrl, credits: createEmptyMediaCredits() }]
            : [];
    const videos = Array.isArray(selectedWord.videos)
      ? selectedWord.videos.map(video => ({ ...video, credits: { ...createEmptyMediaCredits(), ...video.credits } }))
      : [];
    const audios = Array.isArray(selectedWord.audios)
      ? selectedWord.audios.map(audio => ({ ...audio, credits: { ...createEmptyMediaCredits(), ...audio.credits } }))
      : [];
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

    const categoryEntries = Array.isArray(selectedWord.categories)
      ? selectedWord.categories
      : Array.isArray(selectedWord.categoryIds)
        ? selectedWord.categoryIds
        : [selectedWord.categoryId || selectedWord.category_id || selectedWord.category].filter(Boolean);
    const categoryIds = categoryEntries
      .map(category => Number(category?.categoryId ?? category?.id ?? category))
      .filter(Boolean);
    const categoryDisplayOrders = Object.fromEntries(
      categoryEntries
        .map(category => {
          const categoryId = Number(category?.categoryId ?? category?.id ?? category);
          return categoryId ? [categoryId, category?.displayOrder ?? null] : null;
        })
        .filter(Boolean)
    );

    return {
      languageId: selectedWord.languageId ?? selectedWord.language?.id ?? '',
      grammarValueIds: Array.isArray(selectedWord.grammarValueIds)
        ? selectedWord.grammarValueIds.map(value => Number(value?.id ?? value)).filter(Boolean)
        : [],
      word: selectedWord.word || selectedWord.name || selectedWord.title || '',
      wordDetails: {
        expandedForm: selectedWord.wordDetails?.expandedForm || selectedWord.expandedForm || '',
        usage: selectedWord.wordDetails?.usage || '',
        etymology: selectedWord.wordDetails?.etymology || '',
      },
      meaning: (selectedWord.meaning || selectedWord.definition || selectedWord.mean) ?? '',
      categoryIds,
      categoryDisplayOrders,
      redirectCategory: selectedWord.redirectCategory?.id ?? selectedWord.redirectCategory ?? '',
      examples,
      wordImage: null,
      wordImageCredits: createEmptyMediaCredits(),
      imageUrls,
      videos,
      audios,
      description: selectedWord.description || selectedWord.desc || '',
      facts,
      relatedWordIds,
      alsoAppearsIn,
      quizModes: Array.isArray(selectedWord.quizModes) ? selectedWord.quizModes : [],
    };
  };

  const handleEdit = async (selectedWord) => {
    setEditingWord(selectedWord);
    setActiveDraftId(null);
    try {
      const responseData = await fetchAdminWord(selectedWord.id);
      const fullWord = extractWordObject(responseData) || selectedWord;
      setFormData(normalizeWordForEdit(fullWord));
    } catch (error) {
      console.error('Failed to load word for editing', error);
      setFormData(normalizeWordForEdit(selectedWord));
    }
    setShowModal(true);
  };

  const grammarValuesForLanguage = grammarValues.filter((value) => (
    String(value.languageId ?? value.grammarCategory?.languageId ?? '') === String(formData.languageId)
    && value.isActive !== false
  ));
  const normalizedGrammarValueSearch = grammarValueSearch.trim().toLocaleLowerCase();
  const filteredGrammarValues = grammarValuesForLanguage.filter(value => [
    value.displayName,
    value.name,
    value.id,
    value.grammarCategoryName,
    value.grammarCategory?.displayName,
    value.grammarCategory?.name,
  ].some(field => String(field ?? '').toLocaleLowerCase().includes(normalizedGrammarValueSearch)));
  const savedSelectionPresets = Array.isArray(selectionPresets) ? selectionPresets.slice(0, 3) : [];

  const saveSelectionPreset = () => {
    const name = selectionPresetName.trim();
    if (!name) {
      setSelectionPresetError('Enter a name for this selection.');
      return;
    }

    const grammarValueIds = formData.grammarValueIds.map(Number).filter(Boolean);
    const categoryIds = formData.categoryIds.map(Number).filter(Boolean);
    if (!grammarValueIds.length && !categoryIds.length) {
      setSelectionPresetError('Select at least one grammar value or category to save.');
      return;
    }

    const existingPreset = savedSelectionPresets.find(
      preset => preset.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    if (!existingPreset && savedSelectionPresets.length >= 3) {
      setSelectionPresetError('You can save up to 3 selections. Delete one before adding another.');
      return;
    }

    const preset = {
      id: existingPreset?.id || `${Date.now()}`,
      name,
      languageId: formData.languageId,
      grammarValueIds,
      categoryIds,
      categoryDisplayOrders: Object.fromEntries(
        categoryIds.map(categoryId => [
          categoryId,
          formData.categoryDisplayOrders?.[categoryId] ?? null,
        ])
      ),
    };

    setSelectionPresets(current => {
      const currentPresets = Array.isArray(current) ? current.slice(0, 3) : [];
      const existingIndex = currentPresets.findIndex(item => item.id === preset.id);
      if (existingIndex >= 0) {
        return currentPresets.map((item, index) => index === existingIndex ? preset : item);
      }
      return currentPresets.length < 3 ? [...currentPresets, preset] : currentPresets;
    });
    setSelectedSelectionPresetId(preset.id);
    setSelectionPresetName('');
    setSelectionPresetError('');
  };

  const applySelectionPreset = (presetId) => {
    setSelectedSelectionPresetId(presetId);
    const preset = savedSelectionPresets.find(item => item.id === presetId);
    if (!preset) return;

    setFormData(current => ({
      ...current,
      languageId: preset.languageId || current.languageId,
      grammarValueIds: Array.isArray(preset.grammarValueIds) ? preset.grammarValueIds : [],
      categoryIds: Array.isArray(preset.categoryIds) ? preset.categoryIds : [],
      categoryDisplayOrders: preset.categoryDisplayOrders || {},
    }));
    setSelectionPresetError('');
  };

  const deleteSelectionPreset = () => {
    if (!selectedSelectionPresetId) return;
    setSelectionPresets(current => (
      Array.isArray(current) ? current.filter(preset => preset.id !== selectedSelectionPresetId) : []
    ));
    setSelectedSelectionPresetId('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/admin/words/${id}`);
      alert('Word deleted successfully');
      invalidateWordCache();
      invalidateCategoryCache();
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
      const responseData = await fetchAdminWord(id);
      // store raw response for debugging
      const body = responseData;
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
        out.categoryIds = Array.isArray(obj.categories)
          ? obj.categories.map(category => Number(category?.categoryId ?? category?.id ?? category)).filter(Boolean)
          : Array.isArray(obj.categoryIds)
            ? obj.categoryIds.map(category => Number(category?.id ?? category)).filter(Boolean)
            : [obj.categoryId ?? obj.category_id ?? obj.category?.id].filter(Boolean).map(Number);
        out.categoryId = out.categoryIds[0] ?? null;
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

  const stepProgress = [
    Boolean(formData.languageId && formData.word.trim() && formData.meaning.trim() && formData.categoryIds.length),
    Boolean(formData.description.trim() || formData.examples.some(Boolean) || formData.facts.some(Boolean)),
    Boolean(croppedFile || formData.imageUrls.length || formData.videos.length || formData.audios.length),
    Boolean(formData.relatedWordIds.length || formData.alsoAppearsIn.length || formData.quizModes.length),
  ];
  const activeStep = stepProgress.findIndex(completed => !completed);
  const currentStep = activeStep === -1 ? stepProgress.length - 1 : activeStep;

  if (loading) return <div className="loading">Loading words...</div>;

  return (
    <div className="words-workspace">
      {/* ── Header ── */}
      <div className="card-header words-page-header">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div>
            <h2>Words</h2>
            <p className="words-page-subtitle">Create and manage the vocabulary in your game.</p>
          </div>
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
          <button className="btn btn-primary words-add-button" onClick={() => {
            setEditingWord(null);
            setActiveDraftId(null);
            setFormData(createEmptyFormData(languages[0]?.id ? String(languages[0].id) : ''));
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
                        onEdit={handleEdit}
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
          <div className="modal-content word-modal-content" onClick={e => e.stopPropagation()}>
            <div className="word-modal-header">
              <div>
                <span className="word-modal-kicker">Word library</span>
                <h3>{editingWord ? 'Edit Word' : 'Add New Word'}</h3>
                <p>Select a language, then define its word, meaning, and learning content.</p>
              </div>
              <button type="button" className="word-modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="word-stepper" aria-label="Word form sections">
              {['Basic info', 'Content', 'Media', 'Additional'].map((label, index) => (
                <React.Fragment key={label}>
                  <span className={`${stepProgress[index] ? 'completed' : ''} ${currentStep === index ? 'active' : ''}`}>
                    <b>{stepProgress[index] ? '✓' : index + 1}</b> {label}
                  </span>
                  {index < 3 && <i className={stepProgress[index] ? 'completed' : ''} />}
                </React.Fragment>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="word-form">
              {grammarOptionsError && (
                <div className="word-form-options-error" role="alert">
                  Unable to load language and grammar options: {grammarOptionsError}
                </div>
              )}
              <section className="word-form-section word-basic-section">
                <div className="word-section-heading"><span className="section-icon">▣</span><div><strong>Basic information</strong><small>Start with the core details about this word.</small></div></div>
              <label className="word-field"><span>Language <em>*</em></span>
                <select value={formData.languageId} disabled={grammarOptionsLoading} onChange={event => setFormData(current => ({
                  ...current,
                  languageId: event.target.value,
                  grammarValueIds: [],
                }))} required>
                  <option value="">{grammarOptionsLoading ? 'Loading languages...' : 'Select a language'}</option>
                  {languages.filter(language => language.isActive !== false).map(language => (
                    <option key={language.id} value={String(language.id)}>{language.name} (ID: {language.id})</option>
                  ))}
                </select>
              </label>
              <div className="word-field grammar-values-field" ref={grammarValuesRef}>
                <span>Grammar values</span>
                {grammarOptionsLoading ? (
                  <small>Loading grammar values...</small>
                ) : !formData.languageId ? (
                  <small>Select a language to see its grammar values.</small>
                ) : grammarValuesForLanguage.length ? (
                  <>
                    <input
                      type="search"
                      value={grammarValueSearch}
                      onFocus={() => setGrammarValuesOpen(true)}
                      onClick={() => setGrammarValuesOpen(true)}
                      onChange={event => {
                        setGrammarValueSearch(event.target.value);
                        setGrammarValuesOpen(true);
                      }}
                      placeholder="Search grammar values..."
                      aria-label="Search grammar values"
                      style={{ width: '100%', padding: 8, margin: '6px 0' }}
                    />
                    {grammarValuesOpen && filteredGrammarValues.length ? (
                      <div className="grammar-value-options" id="grammar-value-options">
                        {filteredGrammarValues.map(value => {
                          const valueId = Number(value.id);
                          const selected = formData.grammarValueIds.includes(valueId);
                          return (
                            <label key={value.id}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => setFormData(current => ({
                                  ...current,
                                  grammarValueIds: selected
                                    ? current.grammarValueIds.filter(id => id !== valueId)
                                    : [...current.grammarValueIds, valueId],
                                }))}
                              />
                              {value.displayName || value.name} (ID: {value.id})
                            </label>
                          );
                        })}
                      </div>
                    ) : grammarValuesOpen ? (
                      <small>No grammar values match your search.</small>
                    ) : null}
                  </>
                ) : (
                  <small>No grammar values are available for this language.</small>
                )}
                {formData.grammarValueIds.length > 0 && (
                  <div className="grammar-selected-chips" aria-label="Selected grammar values">
                    {formData.grammarValueIds.map(valueId => {
                      const grammarValue = grammarValues.find(value => Number(value.id) === Number(valueId));
                      const displayName = grammarValue?.displayName || grammarValue?.name || `Grammar value ${valueId}`;
                      return (
                        <span className="grammar-selected-chip" key={valueId}>
                          {displayName}
                          <button
                            type="button"
                            aria-label={`Remove ${displayName}`}
                            onClick={() => setFormData(current => ({
                              ...current,
                              grammarValueIds: current.grammarValueIds.filter(id => Number(id) !== Number(valueId)),
                            }))}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <label className="word-field"><span>Word <em>*</em></span><input type="text" placeholder="Enter a word or term" value={formData.word}
                onChange={e => setFormData({ ...formData, word: e.target.value })} required />
              </label>
              <label className="word-field word-meaning-field"><span>Meaning <em>*</em></span><textarea placeholder="Write a short and clear meaning" value={formData.meaning}
                onChange={e => setFormData({ ...formData, meaning: e.target.value })} rows="3" required />
              </label>
              <label className="word-field"><span>Expanded form</span><input type="text" value={formData.wordDetails.expandedForm}
                onChange={event => setFormData(current => ({
                  ...current,
                  wordDetails: { ...current.wordDetails, expandedForm: event.target.value },
                }))} placeholder="Transmission Control Protocol" />
              </label>
              <label className="word-field word-meaning-field"><span>Usage</span><textarea value={formData.wordDetails.usage}
                onChange={event => setFormData(current => ({
                  ...current,
                  wordDetails: { ...current.wordDetails, usage: event.target.value },
                }))} rows="2" placeholder="How this word is used" />
              </label>
              <label className="word-field word-meaning-field"><span>Etymology</span><textarea value={formData.wordDetails.etymology}
                onChange={event => setFormData(current => ({
                  ...current,
                  wordDetails: { ...current.wordDetails, etymology: event.target.value },
                }))} rows="2" placeholder="Origin and history of the word" />
              </label>
              <label className="word-field"><span>Redirect category ID</span><input
                type="number"
                min="1"
                value={formData.redirectCategory}
                onChange={event => setFormData(current => ({ ...current, redirectCategory: event.target.value }))}
                placeholder="Optional"
              />
              </label>
              </section>
              <fieldset style={{ margin: '0 0 8px', padding: 12, border: '1px solid #d1d5db', borderRadius: 6 }}>
                <legend style={{ padding: '0 6px', fontWeight: 600 }}>
                  Categories{' '}
                  <Link to="/admin/categories" style={{ fontSize: 12, fontWeight: 400 }}>
                    Add category
                  </Link>
                </legend>
                <input
                  className="category-search-input"
                  type="search"
                  value={categorySearch}
                  onChange={e => setCategorySearch(e.target.value)}
                  placeholder="Search and select categories..."
                  aria-label="Search categories"
                />
                {formData.categoryIds.length > 0 && (
                  <div className="selected-category-chips">
                    {formData.categoryIds.map(categoryId => {
                      const category = categoryDirectory[categoryId] || categories.find(item => Number(item.id) === categoryId);
                      return (
                        <span key={categoryId} className="selected-category-chip">
                          {category?.name || `Category ${categoryId}`}
                          <button
                            type="button"
                            aria-label={`Remove ${category?.name || `category ${categoryId}`}`}
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              categoryIds: prev.categoryIds.filter(id => id !== categoryId),
                              categoryDisplayOrders: Object.fromEntries(
                                Object.entries(prev.categoryDisplayOrders || {}).filter(([id]) => Number(id) !== categoryId)
                              ),
                            }))}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {formData.categoryIds.length > 0 && (
                  <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                    {formData.categoryIds.map(categoryId => {
                      const category = categoryDirectory[categoryId] || categories.find(item => Number(item.id) === categoryId);
                      return (
                        <label key={categoryId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          {category?.name || `Category ${categoryId}`} display order
                          <input
                            type="number"
                            value={formData.categoryDisplayOrders?.[categoryId] ?? ''}
                            onChange={event => setFormData(prev => ({
                              ...prev,
                              categoryDisplayOrders: {
                                ...prev.categoryDisplayOrders,
                                [categoryId]: event.target.value === '' ? null : Number(event.target.value),
                              },
                            }))}
                            placeholder="None"
                            style={{ width: 110, padding: 6 }}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
                {categorySearchLoading ? (
                  <div className="category-search-status">Searching categories...</div>
                ) : categories.length > 0 ? (
                  <div className="category-search-results">
                    {categories.map(cat => {
                      const categoryId = Number(cat.id);
                      const selected = (formData.categoryIds || []).includes(categoryId);

                      return (
                        <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => setFormData(prev => ({
                              ...prev,
                              categoryIds: selected
                                ? prev.categoryIds.filter(id => id !== categoryId)
                                : [...prev.categoryIds, categoryId],
                              categoryDisplayOrders: selected
                                ? prev.categoryDisplayOrders
                                : { ...prev.categoryDisplayOrders, [categoryId]: cat.displayOrder ?? null },
                            }))}
                          />
                          <span>{cat.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="category-search-status">
                    {categorySearch.trim() ? 'No categories found.' : 'No categories available.'}{' '}
                    <Link to="/admin/categories">Add a category</Link>
                  </div>
                )}
                <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
                  {formData.categoryIds.length > 0
                    ? `${formData.categoryIds.length} categor${formData.categoryIds.length === 1 ? 'y' : 'ies'} selected`
                    : 'Select at least one category'}
                </div>
                <div className="word-form-section" style={{ margin: '12px 0 0', padding: 8 }}>
                  <div className="word-section-heading">
                    <span className="section-icon">▣</span>
                    <div>
                      <strong>Saved grammar and category selections</strong>
                      <small>Save up to 3 combinations in this browser and apply one to a word.</small>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <select
                      value={selectedSelectionPresetId}
                      onChange={event => applySelectionPreset(event.target.value)}
                      aria-label="Apply a saved grammar and category selection"
                      style={{ flex: '1 1 220px', padding: 8 }}
                    >
                      <option value="">Select a saved selection...</option>
                      {savedSelectionPresets.map(preset => (
                        <option key={preset.id} value={preset.id}>{preset.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn"
                      onClick={deleteSelectionPreset}
                      disabled={!selectedSelectionPresetId}
                    >
                      Delete selected
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    <input
                      type="text"
                      value={selectionPresetName}
                      onChange={event => {
                        setSelectionPresetName(event.target.value);
                        setSelectionPresetError('');
                      }}
                      placeholder="Name this selection"
                      aria-label="Saved selection name"
                      maxLength={60}
                      style={{ flex: '1 1 220px', padding: 8 }}
                    />
                    <button type="button" className="btn btn-primary" onClick={saveSelectionPreset}>
                      Save current selection ({savedSelectionPresets.length}/3)
                    </button>
                  </div>
                  {selectionPresetError && (
                    <small role="alert" style={{ display: 'block', color: '#b91c1c', marginTop: 6 }}>
                      {selectionPresetError}
                    </small>
                  )}
                </div>
              </fieldset>

              <div className="word-form-section word-description-section" style={{ marginBottom: 8 }}>
                <div className="word-section-heading"><span className="section-icon">▤</span><div><strong>Description</strong><small>Add context and supporting content.</small></div></div>
                <textarea placeholder="Description" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} style={{ width: '100%', padding: 8 }} />
              </div>

                            {/* ── Facts ── */}
              <div className="word-form-section word-facts-section" style={{ marginBottom: 8 }}>
                <div className="word-section-heading"><span className="section-icon">✦</span><div><strong>Interesting facts</strong><small>Add short facts about the word.</small></div></div>
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
              <div className="word-form-section word-examples-section" style={styles.examplesSection}>
                <div className="word-section-heading"><span className="section-icon">▤</span><div><strong>Examples</strong><small>Add example sentences to show usage.</small></div></div>
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

              {/* ── Quiz Modes ── */}
              <div className="word-form-section" style={{ marginBottom: 8 }}>
                <div className="word-section-heading"><span className="section-icon">✦</span><div><strong>Quiz modes</strong><small>Choose how learners can practice this word.</small></div></div>
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
              <div className="word-form-section word-media-section"
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



              {/* ── Image URLs ── */}
              <div className="word-form-section word-image-urls-section" style={{ marginBottom: 8 }}>
                <div className="word-section-heading"><span className="section-icon">▧</span><div><strong>Images</strong><small>Add images to make the word more engaging.</small></div></div>
                <label style={{ display: 'block', marginBottom: 6 }}>Image URLs</label>
                {(formData.imageUrls || []).map((image, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <input
                        type="text"
                        value={image.imageUrl}
                        onChange={event => updateMediaItem('imageUrls', i, { imageUrl: event.target.value })}
                        style={{ flex: 1, padding: 6 }}
                        aria-label={`Image ${i + 1} URL`}
                      />
                      <button type="button" style={styles.btnRemoveExample} onClick={() => setFormData(prev => ({
                        ...prev,
                        imageUrls: prev.imageUrls.filter((_, j) => j !== i),
                      }))}>&#x2715;</button>
                    </div>
                    <MediaCreditsFields
                      credits={image.credits}
                      onChange={(key, value) => updateMediaCredits('imageUrls', i, key, value)}
                    />
                  </div>
                ))}
                {croppedPreview && (
                  <MediaCreditsFields
                    credits={formData.wordImageCredits}
                    onChange={(key, value) => setFormData(prev => ({
                      ...prev,
                      wordImageCredits: { ...prev.wordImageCredits, [key]: value },
                    }))}
                  />
                )}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" placeholder="Add image URL" id="newImageUrl" style={{ flex: 1, padding: 6 }} />
                  <button type="button" style={styles.btnAddExample} onClick={() => {
                    const el = document.getElementById('newImageUrl');
                    if (!el) return;
                    const v = el.value.trim();
                    if (!v) return;
                    setFormData(prev => ({
                      ...prev,
                      imageUrls: [...(prev.imageUrls || []), { imageUrl: v, credits: createEmptyMediaCredits() }],
                    }));
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
                        setFormData(prev => ({
                          ...prev,
                          imageUrls: [...(prev.imageUrls || []), {
                            imageUrl: dataUrl,
                            credits: { ...createEmptyMediaCredits(), ...prev.wordImageCredits },
                          }],
                          wordImage: null,
                          wordImageCredits: createEmptyMediaCredits(),
                        }));
                        setCroppedFile(null);
                        setCroppedPreview('');
                      } catch (err) { console.error(err); }
                    }}>Use Uploaded Image</button>
                  )}
                </div>
              </div>

              {/* ── Videos ── */}
              <div className="word-form-section word-video-section" style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Videos</label>
                {(formData.videos || []).map((item, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <video src={item.videoUrl} controls style={{ width: 120, maxHeight: 70 }} />
                      <input type="text" value={item.videoUrl} onChange={event => updateMediaItem('videos', i, { videoUrl: event.target.value })} style={{ flex: 1, padding: 6 }} />
                      <button type="button" style={styles.btnRemoveExample} onClick={() => setFormData(prev => ({
                        ...prev,
                        videos: prev.videos.filter((_, j) => j !== i),
                      }))}>&#x2715;</button>
                    </div>
                    <MediaCreditsFields
                      credits={item.credits}
                      onChange={(key, value) => updateMediaCredits('videos', i, key, value)}
                    />
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
              <div className="word-form-section word-audio-section" style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Audios</label>
                {(formData.audios || []).map((item, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <audio src={item.audioUrl} controls style={{ width: 220 }} />
                      <input type="text" value={item.audioUrl} onChange={event => updateMediaItem('audios', i, { audioUrl: event.target.value })} style={{ flex: 1, padding: 6 }} />
                      <button type="button" style={styles.btnRemoveExample} onClick={() => setFormData(prev => ({
                        ...prev,
                        audios: prev.audios.filter((_, j) => j !== i),
                      }))}>&#x2715;</button>
                    </div>
                    <MediaCreditsFields
                      credits={item.credits}
                      onChange={(key, value) => updateMediaCredits('audios', i, key, value)}
                    />
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
              <div className="word-form-section word-related-section" style={{ marginBottom: 8 }}>
                <div className="word-section-heading"><span className="section-icon">↗</span><div><strong>Related Words</strong><small>Link to other related words.</small></div></div>
                <label style={{ display: 'block', marginBottom: 6 }}>Search and select words</label>
                {(formData.relatedWordIds || []).map((item, i) => {
                  const value = typeof item === 'object' ? (item.wordId ?? item.id ?? '') : item;
                  const displayName = typeof item === 'object' ? (item.word || item.name || item.title || '') : '';
                  return (
                    <div key={`${value}-${i}`} className="related-word-selected">
                      <span>{displayName || `Word ${value}`}</span>
                      <small>ID {value}</small>
                      <button type="button" className="related-word-remove" onClick={() => setFormData(prev => ({
                        ...prev,
                        relatedWordIds: prev.relatedWordIds.filter((_, j) => j !== i),
                      }))} aria-label={`Remove ${displayName || `word ${value}`}`}>×</button>
                    </div>
                  );
                })}
                <input
                  className="related-word-search-input"
                  type="search"
                  value={relatedWordSearch}
                  onChange={e => setRelatedWordSearch(e.target.value)}
                  placeholder="Search words by name..."
                  aria-label="Search related words"
                />
                {relatedWordSearchLoading ? (
                  <div className="related-word-search-status">Searching words...</div>
                ) : relatedWordResults.length > 0 ? (
                  <div className="related-word-results">
                    {relatedWordResults.map(result => {
                      const resultId = result.id ?? result.wordId;
                      const resultName = result.word || result.name || result.title || `Word ${resultId}`;
                      const alreadySelected = formData.relatedWordIds.some(item => (item?.wordId ?? item?.id ?? item) === resultId);

                      return (
                        <button
                          type="button"
                          key={resultId}
                          className="related-word-result"
                          disabled={alreadySelected || resultId == null}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              relatedWordIds: [...prev.relatedWordIds, { ...result, wordId: resultId, word: resultName }],
                            }));
                            setRelatedWordSearch('');
                            setRelatedWordResults([]);
                          }}
                        >
                          <span>{resultName}</span><small>ID {resultId}</small>
                        </button>
                      );
                    })}
                  </div>
                ) : relatedWordSearch.trim() ? (
                  <div className="related-word-search-status">No matching words found.</div>
                ) : null}
              </div>

              {/* ── Also Appears In ── */}
              <div className="word-form-section word-also-section" style={{ marginBottom: 8 }}>
                <div className="word-section-heading"><span className="section-icon">▦</span><div><strong>Also Appears In</strong><small>Link this word to another category and word.</small></div></div>
                <label style={{ display: 'block', marginBottom: 6 }}>Category and word IDs</label>
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

              <div className="word-form-actions">
              <button type="button" className="btn word-cancel-button" onClick={closeModal}>Cancel</button>
              <button type="button" className="btn" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving draft...' : activeDraftId ? 'Update Draft' : 'Save Draft'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingDraft}>
                {editingWord ? 'Save Changes' : 'Publish Word'}
              </button>
              </div>
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
  btnAddExample: { background: '#1769ed', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnRemoveExample: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 5, width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnCancel: { padding: '8px 18px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 14 },
  btnConfirm: { padding: '8px 18px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};

export default Words;
