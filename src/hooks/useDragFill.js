import { useCallback, useEffect, useRef, useState } from 'react';

// Remplissage par glisser : on maintient le petit carré d'une cellule, puis on
// descend (ou monte) sur les autres lignes. Chaque cellule traversée reçoit la
// valeur de départ. Le glissement reste limité à une seule colonne.
export default function useDragFill(onApply) {
  const [filling, setFilling] = useState(null);
  const applyRef = useRef(onApply);
  const paintedRef = useRef(new Set());

  applyRef.current = onApply;

  const startFill = useCallback((event, key, value) => {
    event.preventDefault();
    paintedRef.current = new Set();
    setFilling({ key, value: value ?? '' });
  }, []);

  useEffect(() => {
    if (!filling) return undefined;

    const paint = (event) => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const cell = element?.closest?.(`[data-fill-key="${filling.key}"]`);
      const draftId = cell?.getAttribute('data-draft-id');
      if (!draftId || paintedRef.current.has(draftId)) return;
      paintedRef.current.add(draftId);
      applyRef.current(draftId, filling.key, filling.value);
    };

    const stop = () => setFilling(null);

    const previousSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    window.addEventListener('mousemove', paint);
    window.addEventListener('mouseup', stop);

    return () => {
      document.body.style.userSelect = previousSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener('mousemove', paint);
      window.removeEventListener('mouseup', stop);
    };
  }, [filling]);

  return { filling, startFill };
}