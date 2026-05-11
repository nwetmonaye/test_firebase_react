import { useCallback, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  ref,
  onValue,
  push,
  set,
  remove,
} from 'firebase/database';
import { auth, db } from './firebase';
import {
  isGeminiConfigured,
  suggestItemFromDescription,
  summarizeItemList,
} from './gemini';

const ITEMS_BASE = 'sampleItems';

function authErrorMessage(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    default:
      return null;
  }
}

function App() {
  const [user, setUser] = useState(undefined);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState(null);

  const [items, setItems] = useState({});
  const [itemsLoading, setItemsLoading] = useState(false);
  const [dataError, setDataError] = useState(null);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [aiIdea, setAiIdea] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiSummary, setAiSummary] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthError(null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setItems({});
      setItemsLoading(false);
      setDataError(null);
      return undefined;
    }

    const path = `${ITEMS_BASE}/${user.uid}`;
    const itemsRef = ref(db, path);
    setItemsLoading(true);
    const unsub = onValue(
      itemsRef,
      (snap) => {
        setItemsLoading(false);
        setDataError(null);
        setItems(snap.exists() ? snap.val() : {});
      },
      (err) => {
        setItemsLoading(false);
        setDataError(err.message);
      }
    );
    return () => unsub();
  }, [user]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const em = email.trim();
    const pw = password;
    if (!em || pw.length < 6) {
      setAuthError('Enter email and password (min 6 characters).');
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, em, pw);
      } else {
        await signInWithEmailAndPassword(auth, em, pw);
      }
      setPassword('');
    } catch (err) {
      const friendly = authErrorMessage(err.code);
      setAuthError(friendly || err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const itemsPath = user ? `${ITEMS_BASE}/${user.uid}` : ITEMS_BASE;

  const handleCreate = useCallback(
    async (e) => {
      e.preventDefault();
      if (!user) return;
      const trimmed = title.trim();
      if (!trimmed) return;
      try {
        setDataError(null);
        const itemsRef = ref(db, `${ITEMS_BASE}/${user.uid}`);
        await push(itemsRef, {
          title: trimmed,
          notes: notes.trim(),
          updatedAt: Date.now(),
        });
        setTitle('');
        setNotes('');
      } catch (err) {
        setDataError(err.message);
      }
    },
    [title, notes, user]
  );

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

  const handleUpdate = async (id) => {
    if (!user) return;
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    try {
      setDataError(null);
      const rowRef = ref(db, `${ITEMS_BASE}/${user.uid}/${id}`);
      await set(rowRef, {
        title: trimmed,
        notes: editNotes.trim(),
        updatedAt: Date.now(),
      });
      cancelEdit();
    } catch (err) {
      setDataError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    if (!window.confirm('Delete this row?')) return;
    try {
      setDataError(null);
      await remove(ref(db, `${ITEMS_BASE}/${user.uid}/${id}`));
      if (editingId === id) cancelEdit();
    } catch (err) {
      setDataError(err.message);
    }
  };

  const entries = Object.entries(items).sort(([, a], [, b]) => {
    const tb = typeof b.updatedAt === 'number' ? b.updatedAt : 0;
    const ta = typeof a.updatedAt === 'number' ? a.updatedAt : 0;
    return tb - ta;
  });

  const summarizePayload = entries.map(([, item]) => ({
    title: item.title ?? '',
    notes: typeof item.notes === 'string' ? item.notes : '',
  }));

  const handleAISuggest = async () => {
    if (!isGeminiConfigured()) return;
    setAiError(null);
    setAiBusy(true);
    try {
      const suggestion = await suggestItemFromDescription(aiIdea);
      setTitle((prev) =>
        suggestion.title.length > 200 ? suggestion.title.slice(0, 200) : suggestion.title
      );
      setNotes(suggestion.notes);
      setAiIdea('');
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiBusy(false);
    }
  };

  const handleAISummarize = async () => {
    if (!isGeminiConfigured()) return;
    setAiError(null);
    setAiSummary('');
    setAiBusy(true);
    try {
      const text = await summarizeItemList(summarizePayload);
      setAiSummary(text);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiBusy(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="app">
        <p className="muted">Checking session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Sign in</h1>
          <p className="sub">
            Email / password authentication. Enable the provider in Firebase Console → Authentication → Sign-in
            method.
          </p>
        </header>

        <section className="card">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${authMode === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('signin');
                setAuthError(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`tab ${authMode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('signup');
                setAuthError(null);
              }}
            >
              Create account
            </button>
          </div>

          <form className="form auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </label>
            <button type="submit" disabled={authBusy || !email.trim() || password.length < 6}>
              {authBusy ? 'Please wait…' : authMode === 'signup' ? 'Sign up' : 'Sign in'}
            </button>
          </form>
        </section>

        {authError ? (
          <div className="banner error" role="alert">
            {authError}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header app-header-auth">
        <div>
          <h1>Firebase Realtime Database — CRUD</h1>
          <p className="sub">
            Signed in as <strong>{user.email}</strong> · Path:{' '}
            <code>
              {itemsPath}
              {'/*'}
            </code>
          </p>
        </div>
        <button type="button" className="sign-out" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      {authError ? (
        <div className="banner error" role="alert">
          {authError}
        </div>
      ) : null}

      <section className="card ai-card">
        <h2>AI assistant (Gemini)</h2>
        <p className="muted ai-lead">
          Describe a messy idea—the model drafts a concise title and notes you can tweak before saving.
        </p>
        {!isGeminiConfigured() ? (
          <p className="banner hint" role="status">
            Set <code>REACT_APP_GEMINI_API_KEY</code> in <code>.env</code> and restart{' '}
            <code>npm start</code>.
          </p>
        ) : (
          <>
            <label className="ai-inline-label">
              Idea for next item
              <textarea
                value={aiIdea}
                onChange={(e) => setAiIdea(e.target.value)}
                placeholder="e.g. need to remind mom about dinner Sunday and grab a vegetarian option"
                rows={3}
                disabled={aiBusy}
              />
            </label>
            <div className="ai-actions">
              <button
                type="button"
                onClick={() => void handleAISuggest()}
                disabled={aiBusy || !aiIdea.trim()}
              >
                {aiBusy ? 'Working…' : 'Suggest title & notes'}
              </button>
              <button type="button" className="ghost" onClick={() => void handleAISummarize()} disabled={aiBusy}>
                Summarize current list
              </button>
            </div>
            {aiSummary ? (
              <div className="ai-summary" role="region" aria-live="polite">
                <h3>Quick recap</h3>
                <p className="ai-summary-body">{aiSummary}</p>
              </div>
            ) : null}
          </>
        )}
      </section>

      {aiError && isGeminiConfigured() ? (
        <div className="banner error" role="alert">
          {aiError}
        </div>
      ) : null}

      <section className="card">
        <h2>Add item</h2>
        <form className="form" onSubmit={handleCreate}>
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Buy milk"
              maxLength={200}
            />
          </label>
          <label>
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
            />
          </label>
          <button type="submit" disabled={!title.trim()}>
            Create
          </button>
        </form>
      </section>

      {dataError ? (
        <div className="banner error" role="alert">
          {dataError}
        </div>
      ) : null}

      <section className="card">
        <h2>Items</h2>
        {itemsLoading ? (
          <p className="muted">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="muted">No items yet. Add one above.</p>
        ) : (
          <ul className="list">
            {entries.map(([id, item]) => (
              <li key={id} className="list-item">
                {editingId === id ? (
                  <div className="inline-edit">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={200}
                    />
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                    />
                    <div className="row-actions">
                      <button type="button" onClick={() => handleUpdate(id)}>
                        Save
                      </button>
                      <button type="button" className="ghost" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="item-main">
                      <strong>{item.title}</strong>
                      {item.notes ? <p>{item.notes}</p> : null}
                      {typeof item.updatedAt === 'number' ? (
                        <span className="muted small">
                          Updated {new Date(item.updatedAt).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => startEdit(id, item)}>
                        Edit
                      </button>
                      <button type="button" className="danger" onClick={() => handleDelete(id)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
