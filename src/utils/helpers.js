export function formatDateTime(timestamp) {
  if (typeof timestamp !== 'number') return '';
  return new Date(timestamp).toLocaleString();
}

export function sortByUpdatedAt(items) {
  return Object.entries(items).sort(([, a], [, b]) => {
    const tb = typeof b.updatedAt === 'number' ? b.updatedAt : 0;
    const ta = typeof a.updatedAt === 'number' ? a.updatedAt : 0;
    return tb - ta;
  });
}
