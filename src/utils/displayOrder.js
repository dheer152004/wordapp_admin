export function calculateDisplayOrder({ previousWord, nextWord }) {
  if (previousWord && nextWord) {
    const gap = nextWord.displayOrder - previousWord.displayOrder;
    if (gap <= 1) {
      return null;
    }

    return Math.round((previousWord.displayOrder + nextWord.displayOrder) / 2);
  }

  if (nextWord) {
    return Math.max(1, nextWord.displayOrder - 5000);
  }

  if (previousWord) {
    return previousWord.displayOrder + 10000;
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
