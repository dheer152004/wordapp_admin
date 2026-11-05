import api from './api';
import extractCategoryList from '../utils/categoryList';

const CATEGORY_CACHE_PREFIX = 'wordgame.categoryApiCache.v1.';
const CATEGORY_CACHE_TTL_MS = 30 * 60 * 1000;

const getCachedApiResponse = async (cacheKey, fetchResponse) => {
  const storageKey = `${CATEGORY_CACHE_PREFIX}${cacheKey}`;
  try {
    const cached = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (cached && Date.now() - cached.savedAt < CATEGORY_CACHE_TTL_MS) {
      return cached.data;
    }
  } catch (error) {
    try {
      localStorage.removeItem(storageKey);
    } catch (storageError) {
      // Continue with the API request when storage is unavailable.
    }
  }

  const responseData = await fetchResponse();
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      savedAt: Date.now(),
      data: responseData,
    }));
  } catch (error) {
    // Keep the API response usable when storage is unavailable or full.
  }
  return responseData;
};

export const invalidateCategoryCache = () => {
  try {
    const cacheKeys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(CATEGORY_CACHE_PREFIX)) cacheKeys.push(key);
    }
    cacheKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    // The cache naturally expires if local storage cannot be accessed.
  }
};

export const fetchAdminCategories = async () => {
  const responseData = await getCachedApiResponse('admin-list', async () => {
    const response = await api.get('/admin/categories');
    return response.data;
  });
  const categories = extractCategoryList(responseData);
  if (!categories) throw new Error('Unexpected response while fetching categories');
  return categories;
};

export const searchCategories = async (query, page = 0, size = 10) => {
  const cacheKey = `search.${encodeURIComponent(query.trim().toLocaleLowerCase())}.${page}.${size}`;
  const responseData = await getCachedApiResponse(cacheKey, async () => {
    const response = await api.get('/categories/search', {
      params: { q: query.trim(), page, size },
    });
    return response.data;
  });
  return extractCategoryList(responseData) || [];
};

const getPaginationMetadata = (data) => {
  const candidates = [data, data?.data, data?.result, data?.payload].filter(
    value => value && typeof value === 'object' && !Array.isArray(value)
  );
  return candidates.find(value => (
    value.totalPages != null
    || value.totalCategories != null
    || value.currentPage != null
    || value.pageSize != null
  )) || candidates[0] || {};
};

export const fetchCategoryPage = async (page = 0) => {
  const responseData = await getCachedApiResponse(`page.${page}`, async () => {
    const response = await api.get('/categories', { params: { page } });
    return response.data;
  });
  const categories = extractCategoryList(responseData);
  if (!categories) {
    throw new Error('Unexpected response while fetching categories');
  }

  const metadata = getPaginationMetadata(responseData);
  const totalPages = Number(metadata.totalPages);
  const totalCategories = Number(metadata.totalCategories);
  const pageSize = Number(metadata.pageSize);
  const currentPage = Number(metadata.currentPage);
  const resolvedTotalPages = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;
  const resolvedCurrentPage = Number.isFinite(currentPage) ? currentPage : page;

  return {
    categories,
    currentPage: resolvedCurrentPage,
    totalPages: resolvedTotalPages,
    totalCategories: Number.isFinite(totalCategories) ? totalCategories : categories.length,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : categories.length,
    hasMore: typeof metadata.hasMore === 'boolean'
      ? metadata.hasMore
      : resolvedCurrentPage + 1 < resolvedTotalPages,
  };
};

export const fetchAllCategories = async () => {
  const firstPage = await fetchCategoryPage(0);
  if (firstPage.totalPages <= 1) return firstPage.categories;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) => fetchCategoryPage(index + 1))
  );
  return [firstPage, ...remainingPages].flatMap(page => page.categories);
};
