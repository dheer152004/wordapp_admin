const DRAFTS_STORAGE_KEY = 'wordgame.wordDrafts.v1';
export const MAX_WORD_DRAFTS = 100;

const readDrafts = () => {
  const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
  if (!stored) return [];

  const drafts = JSON.parse(stored);
  if (!Array.isArray(drafts)) {
    throw new Error('Saved drafts data is invalid. Clear the damaged drafts before continuing.');
  }
  return drafts;
};

const writeDrafts = (drafts) => {
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    if (error?.name === 'QuotaExceededError' || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      throw new Error('Browser storage is full. Remove media or delete some drafts, then try again.');
    }
    throw new Error(`Could not save drafts in this browser: ${error.message}`);
  }
};

export const getWordDrafts = () => readDrafts();

export const getWordDraft = (draftId) => (
  readDrafts().find(draft => draft.id === draftId) || null
);

export const saveWordDraft = (draft) => {
  const drafts = readDrafts();
  const existingIndex = drafts.findIndex(item => item.id === draft.id);
  if (existingIndex < 0 && drafts.length >= MAX_WORD_DRAFTS) {
    throw new Error(`You can save up to ${MAX_WORD_DRAFTS} word drafts. Delete a draft before adding another.`);
  }

  const savedDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  const nextDrafts = existingIndex < 0
    ? [savedDraft, ...drafts]
    : drafts.map((item, index) => index === existingIndex ? savedDraft : item);
  writeDrafts(nextDrafts);
  return savedDraft;
};

export const deleteWordDraft = (draftId) => {
  const nextDrafts = readDrafts().filter(draft => draft.id !== draftId);
  writeDrafts(nextDrafts);
  return nextDrafts;
};
