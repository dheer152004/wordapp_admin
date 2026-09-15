export function calculateDisplayOrder({ previousWord, nextWord }) {
  const previousOrder = Number(previousWord?.displayOrder);
  const nextOrder = Number(nextWord?.displayOrder);
  const hasPreviousOrder = Number.isFinite(previousOrder);
  const hasNextOrder = Number.isFinite(nextOrder);

  if (hasPreviousOrder && hasNextOrder) {
    const gap = nextOrder - previousOrder;
    if (gap <= 1) {
      return null;
    }

    return Math.round((previousOrder + nextOrder) / 2);
  }

  if (hasNextOrder) {
    return Math.max(1, nextOrder - 5000);
  }

  if (hasPreviousOrder) {
    return previousOrder + 10000;
  }

  return 10000;
}

export function getReorderInsertionContext({ words, activeWordId, overWordId }) {
  const orderedWords = [...words]
    .slice()
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const activeIndex = orderedWords.findIndex((word) => word.id === activeWordId);
  const overIndex = orderedWords.findIndex((word) => word.id === overWordId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return null;
  }

  const wordsWithoutActive = orderedWords.filter((word) => word.id !== activeWordId);
  const targetIndex = wordsWithoutActive.findIndex((word) => word.id === overWordId);

  if (targetIndex === -1) {
    return null;
  }

  return {
    previousWord: wordsWithoutActive[targetIndex - 1] ?? null,
    nextWord: wordsWithoutActive[targetIndex] ?? null,
  };
}
