import api from './api';

export async function reorderWordDisplayOrder(wordId, displayOrder) {
  const response = await api.patch(`/admin/words/${wordId}/display-order`, { displayOrder });
  return response.data;
}

export async function rebalanceWordDisplayOrder() {
  const response = await api.post('/admin/words/rebalance-display-order');
  return response.data;
}
