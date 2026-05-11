import { onValue, push, ref, remove, set } from 'firebase/database';
import { db } from './firebase';

export const ITEMS_BASE = 'sampleItems';

export function subscribeItems(userId, onSuccess, onError) {
  const itemsRef = ref(db, `${ITEMS_BASE}/${userId}`);
  return onValue(
    itemsRef,
    (snap) => onSuccess(snap.exists() ? snap.val() : {}),
    onError
  );
}

export function createItem(userId, payload) {
  const itemsRef = ref(db, `${ITEMS_BASE}/${userId}`);
  return push(itemsRef, payload);
}

export function updateItem(userId, itemId, payload) {
  const rowRef = ref(db, `${ITEMS_BASE}/${userId}/${itemId}`);
  return set(rowRef, payload);
}

export function deleteItem(userId, itemId) {
  const rowRef = ref(db, `${ITEMS_BASE}/${userId}/${itemId}`);
  return remove(rowRef);
}
