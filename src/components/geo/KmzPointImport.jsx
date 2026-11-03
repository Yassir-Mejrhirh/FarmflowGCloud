import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseKmlPoints } from '@/lib/kml';
import { readKmzText } from '@/lib/kmz';
import { useI18n } from '@/lib/I18nContext';

export default function KmzPointImport({ onPick }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = (point) => {
    onPick({ lat: point.latitude, lng: point.longitude });
    setPoints([]);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    setPoints([]);
    try {
      const text = /\.kmz$/i.test(file.name) ? await readKmzText(await file.arrayBuffer()) : await file.text();
      const parsed = parseKmlPoints(text);
      if (!parsed.length) {
        setError(t('geo.kmzNoPlaces'));
        return;
      }
      if (parsed.length === 1) {
        pick(parsed[0]);
        return;
      }
      setPoints(parsed);
    } catch (err) {
      setError(err.message || t('geo.kmzFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" /> {busy ? t('geo.kmzImporting') : t('geo.kmzImport')}
        </Button>
        {points.length > 0 && (
          <button type="button" onClick={() => setPoints([])} className="text-[11px] font-medium text-muted-foreground hover:underline">
            {t('common.cancel')}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml"
        className="hidden"
        onChange={handleFile}
      />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {points.length > 0 && (
        <div className="max-h-44 overflow-y-auto rounded-lg border border-border/70">
          <p className="border-b border-border/70 bg-secondary/40 px-3 py-1.5 text-[11px] text-muted-foreground">
            {t('geo.kmzPick', { n: points.length })}
          </p>
          {points.map((point, index) => (
            <button
              key={`${point.name}-${index}`}
              type="button"
              onClick={() => pick(point)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-xs hover:bg-secondary/60"
            >
              <span className="truncate">{point.name}</span>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground" dir="ltr">
                {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}