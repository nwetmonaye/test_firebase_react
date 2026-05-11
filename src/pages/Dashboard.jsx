import { useMemo, useState } from 'react';
import HabitCard from '../components/HabitCard';
import TaskCard from '../components/TaskCard';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import {
  isGeminiConfigured,
  suggestProductFromIdea,
  summarizeProducts,
} from '../services/aiService';

export default function Dashboard() {
  const { user } = useAuth();
  const { entries, loading, error, createTask, editTask, removeTask } = useTasks(user);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [aiIdea, setAiIdea] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(null);

  const summarizePayload = useMemo(
    () =>
      entries.map(([, item]) => ({
        title: item.title ?? '',
        notes: typeof item.notes === 'string' ? item.notes : '',
      })),
    [entries]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    await createTask({ title: trimmed, notes: notes.trim(), updatedAt: Date.now() });
    setTitle('');
    setNotes('');
  };

  const startEdit = (id, item) => {
    setEditingId(id);
    setEditTitle(item.title ?? '');
    setEditNotes(typeof item.notes === 'string' ? item.notes : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditNotes('');
  };

  const handleSaveEdit = async (id) => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    await editTask(id, { title: trimmed, notes: editNotes.trim(), updatedAt: Date.now() });
    cancelEdit();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product item?')) return;
    await removeTask(id);
  };

  const handleAiSuggest = async () => {
    setAiError(null);
    setAiBusy(true);
    try {
      const suggestion = await suggestProductFromIdea(aiIdea);
      setTitle(suggestion.title);
      setNotes(suggestion.notes);
      setAiIdea('');
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiBusy(false);
    }
  };

  const handleAiSummary = async () => {
    setAiError(null);
    setAiBusy(true);
    setAiSummary('');
    try {
      const result = await summarizeProducts(summarizePayload);
      setAiSummary(result);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="dashboard-grid">
      <section className="card">
        <h1>Dashboard</h1>
        <p className="sub">Manage your product item list and track updates in real time.</p>
      </section>

      <HabitCard total={entries.length} />

      <section className="card">
        <h2>Add Product Item</h2>
        <form className="form" onSubmit={handleCreate}>
          <label>
            Product title
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </label>
          <label>
            Description
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </label>
          <button type="submit" disabled={!title.trim()}>
            Add item
          </button>
        </form>
      </section>

      <section className="card">
        <h2>AI Assistant</h2>
        {!isGeminiConfigured() ? (
          <p className="banner hint">
            Set <code>REACT_APP_GEMINI_API_KEY</code> in your .env and restart app.
          </p>
        ) : (
          <>
            <label className="ai-inline-label">
              Describe new product item
              <textarea value={aiIdea} onChange={(e) => setAiIdea(e.target.value)} rows={3} />
            </label>
            <div className="ai-actions">
              <button type="button" onClick={() => void handleAiSuggest()} disabled={aiBusy || !aiIdea.trim()}>
                {aiBusy ? 'Working...' : 'Suggest item'}
              </button>
              <button type="button" className="ghost" onClick={() => void handleAiSummary()} disabled={aiBusy}>
                Summarize list
              </button>
            </div>
            {aiSummary ? <p className="ai-summary-body">{aiSummary}</p> : null}
          </>
        )}
        {aiError ? <p className="banner error">{aiError}</p> : null}
      </section>

      <section className="card full-width">
        <h2>Product Item List</h2>
        {error ? <p className="banner error">{error}</p> : null}
        {loading ? (
          <p className="muted">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="muted">No product items yet.</p>
        ) : (
          <ul className="product-list">
            {entries.map(([id, item]) => (
              <TaskCard
                key={id}
                item={item}
                isEditing={editingId === id}
                editTitle={editTitle}
                editNotes={editNotes}
                onEditTitleChange={setEditTitle}
                onEditNotesChange={setEditNotes}
                onStartEdit={() => startEdit(id, item)}
                onCancelEdit={cancelEdit}
                onSaveEdit={() => void handleSaveEdit(id)}
                onDelete={() => void handleDelete(id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
