import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconButton, CircularProgress } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

const SortableWordRow = memo(function SortableWordRow({
  word,
  onEdit,
  onView,
  onDelete,
  isReordering,
  isPending,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: word.id, disabled: isReordering });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const imageSources = Array.isArray(word.images) ? word.images
    : Array.isArray(word.imageUrls) ? word.imageUrls
    : word.wordImageUrl ? [word.wordImageUrl]
    : [];
  const thumbnail = imageSources
    .map(image => typeof image === 'string' ? image : image?.imageUrl)
    .find(src => typeof src === 'string' && src.trim()) || null;

  return (
    <tr ref={setNodeRef} style={style}>
      <td>{word.id}</td>
      <td>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={word.word || 'word image'}
            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 4, background: '#f3f4f6' }} />
        )}
      </td>
      <td>{word.word}</td>
      <td>{word.meaning}</td>
      <td>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <IconButton
            size="small"
            aria-label="Reorder word"
            {...attributes}
            {...listeners}
            disabled={isReordering}
            sx={{ cursor: isReordering ? 'not-allowed' : 'grab' }}
          >
            {isPending ? <CircularProgress size={16} /> : <DragIndicatorIcon fontSize="small" />}
          </IconButton>
          <button className="btn btn-sm btn-primary" onClick={() => onEdit(word)}>
            Edit
          </button>
          <button className="btn btn-sm btn-info" style={{ marginLeft: 4 }} onClick={() => onView(word.id)}>
            View
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => onDelete(word.id)}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
});

export default SortableWordRow;
