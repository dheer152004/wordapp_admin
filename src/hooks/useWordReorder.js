import { useCallback, useMemo, useState } from 'react';
import { reorderWordDisplayOrder } from '../services/wordReorderService';
import { calculateDisplayOrder, getReorderInsertionContext } from '../utils/displayOrder';

export function useWordReorder({ words, categoryId, setWords, onError }) {
  const [isReordering, setIsReordering] = useState(false);
  const [reorderMessage, setReorderMessage] = useState('');

  const reorderWord = useCallback(async (activeWordId, overWordId) => {
    if (isReordering) {
      return;
    }

    if (categoryId == null || categoryId === '') {
      const message = 'Select a category before changing display order.';
      setReorderMessage(message);
      onError?.(message);
      return;
    }

    const activeWord = words.find((word) => word.id === activeWordId);
    const overWord = words.find((word) => word.id === overWordId);

    if (!activeWord || !overWord || activeWord.id === overWord.id) {
      return;
    }

    const insertionContext = getReorderInsertionContext({
      words,
      activeWordId,
      overWordId,
    });

    if (!insertionContext) {
      return;
    }

    const { previousWord, nextWord } = insertionContext;
    const newDisplayOrder = calculateDisplayOrder({ previousWord, nextWord });

    if (newDisplayOrder === null) {
      setReorderMessage('Display order needs rebalancing.');
      return;
    }

    setIsReordering(true);
    setReorderMessage('');

    const previousItems = words.map((item) => ({ ...item }));

    setWords((currentWords) => {
      const reordered = [...currentWords]
        .slice()
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      const activeIndex = reordered.findIndex((item) => item.id === activeWordId);

      if (activeIndex === -1) {
        return currentWords;
      }

      const [movedItem] = reordered.splice(activeIndex, 1);
      const targetIndex = reordered.findIndex((item) => item.id === overWordId);
      const insertIndex = targetIndex === -1 ? reordered.length : targetIndex;
      reordered.splice(insertIndex, 0, movedItem);

      return reordered.map((item) =>
        item.id === activeWordId ? { ...item, displayOrder: newDisplayOrder } : item
      );
    });

    try {
      const result = await reorderWordDisplayOrder(activeWord.id, Number(categoryId), newDisplayOrder);
      const updatedCategory = result?.categories?.find(
        (category) => Number(category.categoryId) === Number(categoryId)
      );
      setWords((currentWords) =>
        currentWords.map((item) => (
          item.id === activeWord.id
            ? { ...item, displayOrder: updatedCategory?.displayOrder ?? newDisplayOrder }
            : item
        ))
      );
    } catch (error) {
      setWords(previousItems);
      const message = error.response?.data?.message || error.message || 'Unable to reorder the word.';
      setReorderMessage(message);
      onError?.(message);
    } finally {
      setIsReordering(false);
    }
  }, [categoryId, isReordering, words, setWords, onError]);

  return useMemo(() => ({
    isReordering,
    reorderMessage,
    reorderWord,
  }), [isReordering, reorderMessage, reorderWord]);
}
