import { useEffect, useRef, useState } from 'react';

// Sheet sizes in CSS pixels at 96 dpi, chosen to stay inside the A4 printable
// area once the 8 mm print margins are applied.
export const SHEET_SIZES = {
  landscape: { width: 1050, height: 720 },
  portrait: { width: 730, height: 1040 },
};

/**
 * Keeps the plan sheet at real A4 dimensions so the map is rendered once, at
 * full size, and prints exactly as previewed. The orientation drives both the
 * sheet size and the printed page size.
 */
export default function PlanSheetFrame({ orientation = 'landscape', children }) {
  const ref = useRef(null);
  const size = SHEET_SIZES[orientation] || SHEET_SIZES.landscape;
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / size.width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [size.width]);

  return (
    <div
      ref={ref}
      id="plan-print-root"
      className="w-full"
      style={{ '--sheet-w': `${size.width}px`, '--sheet-h': `${size.height}px` }}
    >
      <style>{`@page { size: A4 ${orientation}; margin: 8mm; }`}</style>
      <div className="plan-sheet-viewport" style={{ height: size.height * scale }}>
        <div className="plan-sheet-frame" style={{ '--plan-scale': scale }}>
          {children}
        </div>
      </div>
    </div>
  );
}