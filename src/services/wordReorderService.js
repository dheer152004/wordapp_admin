import api from './api';

export async function reorderWordDisplayOrder(wordId, categoryId, displayOrder) {
  if (
    wordId == null ||
    categoryId == null ||
    !Number.isFinite(Number(categoryId)) ||
    !Number.isFinite(Number(displayOrder))
  ) {
    throw new Error('Word ID, category ID, and display order are required.');
  }

  const response = await api.patch(`/admin/words/${wordId}/display-order`, {
    categoryId: Number(categoryId),
    displayOrder,
  });
  return response.data;
}

export async function rebalanceWordDisplayOrder() {
  const response = await api.post('/admin/words/rebalance-display-order');
  return response.data;
}
