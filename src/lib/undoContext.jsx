import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const UndoContext = createContext(null);

export const UNDO_WINDOW_MS = 20000;
const METADATA_FIELDS = ['id', 'created_date', 'updated_date', 'created_by_id'];

export function toRestorable(record) {
  const data = {};
  Object.entries(record || {}).forEach(([key, value]) => {
    if (!METADATA_FIELDS.includes(key) && value !== undefined) data[key] = value;
  });
  return data;
}

export function UndoProvider({ children }) {
  const [pending, setPending] = useState(null);
  const timer = useRef(null);

  const stopTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const dismiss = useCallback(() => {
    stopTimer();
    setPending(null);
  }, []);

  const offerUndo = useCallback(({ entityName, record, label, onRestored }) => {
    if (!entityName || !record?.id) return;
    stopTimer();
    setPending({
      entityName,
      record: toRestorable(record),
      label: label || record.name || record.title || '',
      onRestored,
    });
    timer.current = setTimeout(() => setPending(null), UNDO_WINDOW_MS);
  }, []);

  const undo = useCallback(async () => {
    if (!pending) return 'idle';
    stopTimer();
    const { entityName, record, onRestored } = pending;
    const entity = base44.entities[entityName];
    const keyField = record.name ? 'name' : record.title ? 'title' : null;

    if (keyField && record[keyField]) {
      const query = { [keyField]: record[keyField] };
      if (record.company_id) query.company_id = record.company_id;
      const existing = await entity.filter(query);
      const rows = Array.isArray(existing) ? existing : existing?.items || [];
      if (rows.length > 0) {
        setPending(null);
        return 'blocked';
      }
    }

    await entity.create(record);
    setPending(null);
    if (onRestored) onRestored();
    return 'done';
  }, [pending]);

  useEffect(() => stopTimer, []);

  return (
    <UndoContext.Provider value={{ pending, offerUndo, undo, dismiss, windowMs: UNDO_WINDOW_MS }}>
      {children}
    </UndoContext.Provider>
  );
}

export const useUndo = () => useContext(UndoContext);