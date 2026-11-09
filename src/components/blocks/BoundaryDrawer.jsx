import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Eraser, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SATELLITE_URL } from '@/components/blocks/BlockMap';
import { DEFAULT_CENTER, polygonAreaHa, toLatLngs } from '@/lib/geo';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const LINE = '#b9663f';

const round = (value) => Number(Number(value).toFixed(6));

const vertexIcon = (index, selected) =>
  L.divIcon({
    className: 'boundary-vertex',
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:${selected ? LINE : '#ffffff'};border:2px solid ${LINE};box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function FitBounds({ token, points, center }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView(center || DEFAULT_CENTER, 15);
      return;
    }
    map.fitBounds(toLatLngs(points), { padding: [36, 36], maxZoom: 18 });
  }, [token]);

  return null;
}

function EditLayer({ points, selected, onSelect, onMove, onAdd }) {
  useMapEvents({
    click(event) {
      onAdd({ lat: round(event.latlng.lat), lng: round(event.latlng.lng) });
    },
  });

  return (
    <>
      {points.length > 1 && (
        <Polygon positions={toLatLngs(points)} pathOptions={{ color: LINE, weight: 2, fillOpacity: 0.2 }} />
      )}
      {points.map((point, index) => (
        <Marker
          key={`${index}-${point.lat}-${point.lng}`}
          position={[point.lat, point.lng]}
          icon={vertexIcon(index, index === selected)}
          draggable
          eventHandlers={{
            click: (event) => {
              L.DomEvent.stopPropagation(event.originalEvent);
              onSelect(index);
            },
            dragend: (event) => {
              const { lat, lng } = event.target.getLatLng();
              onMove(index, { lat: round(lat), lng: round(lng) });
            },
          }}
        />
      ))}
    </>
  );
}

export default function BoundaryDrawer({ points = [], onChange, fallbackCenter }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(null);
  const [fitToken, setFitToken] = useState(0);

  useEffect(() => {
    if (selected !== null && selected >= points.length) setSelected(null);
  }, [points.length, selected]);

  const area = polygonAreaHa(points);
  // A parcel without a boundary opens on its farm so the map is immediately useful.
  const home = fallbackCenter || DEFAULT_CENTER;
  const center = points.length ? [points[0].lat, points[0].lng] : home;

  const movePoint = (index, position) =>
    onChange(points.map((point, i) => (i === index ? position : point)));

  const deletePoint = () => {
    if (selected === null) return;
    onChange(points.filter((_, i) => i !== selected));
    setSelected(null);
  };

  return (
    <div className="space-y-2">
      <div className="h-[300px] overflow-hidden rounded-xl border border-border sm:h-[360px]">
        <MapContainer center={center} zoom={points.length ? 16 : 14} scrollWheelZoom className="h-full w-full">
          <TileLayer url={SATELLITE_URL} attribution="Imagery © Esri, Maxar, Earthstar Geographics" />
          <MapResizer />
          <FitBounds token={fitToken} points={points} center={home} />
          <EditLayer
            points={points}
            selected={selected}
            onSelect={setSelected}
            onMove={movePoint}
            onAdd={(point) => onChange([...points, point])}
          />
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {t('bd.tapHint')} · {points.length} {t('bd.points')} ·{' '}
          <span className="font-medium text-foreground">{fmtNum(area, 2)} ha</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-lg px-2.5 text-xs"
            onClick={() => setFitToken((token) => token + 1)}
            title={t('bd.recenter')}
          >
            <Crosshair className="h-3.5 w-3.5" /> {t('bd.recenter')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-lg px-2.5 text-xs"
            onClick={deletePoint}
            disabled={selected === null}
            title={t('bd.deletePoint')}
          >
            <Trash2 className="h-3.5 w-3.5" /> {t('bd.deletePoint')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-lg px-2.5 text-xs"
            onClick={() => {
              onChange(points.slice(0, -1));
              setSelected(null);
            }}
            disabled={!points.length}
            title={t('bd.undo')}
          >
            <Undo2 className="h-3.5 w-3.5" /> {t('bd.undo')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-lg px-2.5 text-xs"
            onClick={() => {
              onChange([]);
              setSelected(null);
            }}
            disabled={!points.length}
            title={t('bd.clear')}
          >
            <Eraser className="h-3.5 w-3.5" /> {t('bd.clear')}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {selected === null
          ? t('bd.moveHint')
          : t('bd.selected', { index: selected + 1, lat: points[selected]?.lat, lng: points[selected]?.lng })}
      </p>
    </div>
  );
}