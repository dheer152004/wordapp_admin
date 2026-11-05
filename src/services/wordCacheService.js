import api from './api';

const WORD_CACHE_PREFIX = 'wordgame.wordApiCache.v2.';
const WORD_CACHE_TTL_MS = 30 * 60 * 1000;

const getCachedResponse = async (cacheKey, fetchResponse, shouldCache = () => true) => {
  const storageKey = `${WORD_CACHE_PREFIX}${cacheKey}`;
  try {
    const cached = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (cached && Date.now() - cached.savedAt < WORD_CACHE_TTL_MS) {
      if (shouldCache(cached.data)) return cached.data;
      localStorage.removeItem(storageKey);
    }
  } catch (error) {
    try {
      localStorage.removeItem(storageKey);
    } catch (storageError) {
      // Continue with the API request when storage is unavailable.
    }
  }

  const responseData = await fetchResponse();
  if (shouldCache(responseData)) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        savedAt: Date.now(),
        data: responseData,
      }));
    } catch (error) {
      // Keep the API response usable when storage is unavailable or full.
    }
  }
  return responseData;
};

const hasWordListEntries = (data) => {
  const wordList = [
    data,
    data?.words,
    data?.content,
    data?.data,
    data?.data?.words,
    data?.data?.content,
    data?.result,
    data?.payload,
  ].find(Array.isArray);
  return !wordList || wordList.length > 0;
};

export const invalidateWordCache = () => {
  try {
    const cacheKeys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(WORD_CACHE_PREFIX)) cacheKeys.push(key);
    }
    cacheKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    // Cached data expires naturally if local storage cannot be accessed.
  }
};

export const fetchWordsByCategory = (categoryId, page = 0, size = 100) => {
  const normalizedCategoryId = encodeURIComponent(categoryId);
  const cacheKey = `category.${normalizedCategoryId}.${page}.${size}`;
  return getCachedResponse(cacheKey, async () => {
    const response = await api.get(
      `/words/category/${normalizedCategoryId}?page=${page}&size=${size}`
    );
    return response.data;
  }, hasWordListEntries);
};

export const searchWords = (query, page = 0, size = 10) => {
  const trimmedQuery = query.trim();
  const cacheKey = `search.${encodeURIComponent(trimmedQuery.toLocaleLowerCase())}.${page}.${size}`;
  return getCachedResponse(cacheKey, async () => {
    const response = await api.get('/words/search', {
      params: { q: trimmedQuery, page, size },
    });
    return response.data;
  }, hasWordListEntries);
};

export const fetchAdminWord = (wordId) => getCachedResponse(
  `detail.${encodeURIComponent(wordId)}`,
  async () => {
    const response = await api.get(`/admin/words/${encodeURIComponent(wordId)}`);
    return response.data;
  }
);
