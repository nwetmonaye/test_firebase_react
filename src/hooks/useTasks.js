import { useEffect, useMemo, useState } from 'react';
import {
  createItem,
  deleteItem,
  subscribeItems,
  updateItem,
} from '../services/taskService';
import { sortByUpdatedAt } from '../utils/helpers';

export function useTasks(user) {
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setItems({});
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    const unsub = subscribeItems(
      user.uid,
      (data) => {
        setItems(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setLoading(false);
        setError(err.message);
      }
    );

    return () => unsub();
  }, [user]);

  const entries = useMemo(() => sortByUpdatedAt(items), [items]);

  const createTask = async (payload) => {
    if (!user) return;
    try {
      setError(null);
      await createItem(user.uid, payload);
    } catch (err) {
      setError(err.message);
    }
  };

  const editTask = async (itemId, payload) => {
    if (!user) return;
    try {
      setError(null);
      await updateItem(user.uid, itemId, payload);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeTask = async (itemId) => {
    if (!user) return;
    try {
      setError(null);
      await deleteItem(user.uid, itemId);
    } catch (err) {
      setError(err.message);
    }
  };

  return { entries, loading, error, createTask, editTask, removeTask };
}
