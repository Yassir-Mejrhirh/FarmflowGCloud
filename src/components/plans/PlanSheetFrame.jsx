import { useEffect, useRef, useState } from 'react';

export const SHEET_WIDTH = 1060;
export const SHEET_HEIGHT = 736;

/**
 * Keeps the plan sheet at real A4 landscape dimensions so the map is rendered
 * once, at full size, and prints exactly as previewed.
 */
export default function PlanSheetFrame({ children }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / SHEET_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} id="plan-print-root" className="w-full">
      <div className="plan-sheet-viewport" style={{ height: SHEET_HEIGHT * scale }}>
        <div className="plan-sheet-frame" style={{ '--plan-scale': scale }}>
          {children}
        </div>
      </div>
    </div>
  );
}