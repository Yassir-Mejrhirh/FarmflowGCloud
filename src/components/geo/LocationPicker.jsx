import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { SATELLITE_URL } from '@/components/blocks/BlockMap';
import { DEFAULT_CENTER } from '@/lib/geo';
import { useI18n } from '@/lib/I18nContext';

function ClickCatcher({ onPick }) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

export default function LocationPicker({ value, onChange }) {
  const { t } = useI18n();
  const hasPoint = value?.lat != null && value?.lng != null;
  const center = hasPoint ? [value.lat, value.lng] : DEFAULT_CENTER;

  return (
    <div className="space-y-2">
      <div className="h-[220px] w-full overflow-hidden rounded-xl border border-border/70">
        <MapContainer center={center} zoom={hasPoint ? 15 : 12} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer url={SATELLITE_URL} attribution="Imagery © Esri, Maxar, Earthstar Geographics" />
          <ClickCatcher onPick={onChange} />
          {hasPoint && (
            <CircleMarker
              center={[value.lat, value.lng]}
              radius={8}
              pathOptions={{ color: '#e08a5b', fillColor: '#e08a5b', fillOpacity: 0.85, weight: 2 }}
            />
          )}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="tabular-nums" dir="ltr">
          {hasPoint ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : t('geo.hint')}
        </span>
        {hasPoint && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-medium text-destructive hover:underline"
          >
            {t('geo.clear')}
          </button>
        )}
      </div>
    </div>
  );
}