import { formatDateTime } from '../utils/helpers';

export default function TaskCard({
  item,
  isEditing,
  editTitle,
  editNotes,
  onEditTitleChange,
  onEditNotesChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}) {
  if (isEditing) {
    return (
      <li className="product-card">
        <div className="inline-edit">
          <input value={editTitle} onChange={(e) => onEditTitleChange(e.target.value)} maxLength={200} />
          <textarea value={editNotes} onChange={(e) => onEditNotesChange(e.target.value)} rows={2} />
          <div className="row-actions">
            <button type="button" onClick={onSaveEdit}>
              Save
            </button>
            <button type="button" className="ghost" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="product-card">
      <div className="item-main">
        <h3>{item.title}</h3>
        {item.notes ? <p>{item.notes}</p> : null}
        <span className="muted small">Updated {formatDateTime(item.updatedAt)}</span>
      </div>
      <div className="row-actions">
        <button type="button" onClick={onStartEdit}>
          Edit
        </button>
        <button type="button" className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  );
}
