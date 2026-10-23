import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { SATELLITE_URL } from '@/components/blocks/BlockMap';
import { DEFAULT_CENTER, polygonAreaHa, toLatLngs } from '@/lib/geo';
import { fmtNum } from '@/lib/format';

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function DrawLayer({ points, onAdd }) {
  useMapEvents({
    click(event) {
      onAdd({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return (
    <>
      {points.length > 1 && (
        <Polygon positions={toLatLngs(points)} pathOptions={{ color: '#b9663f', weight: 2, fillOpacity: 0.22 }} />
      )}
      {points.map((point, index) => (
        <CircleMarker
          key={`${point.lat}-${point.lng}-${index}`}
          center={[point.lat, point.lng]}
          radius={5}
          pathOptions={{ color: '#b9663f', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }}
        />
      ))}
    </>
  );
}

export default function BoundaryDrawer({ points = [], onChange }) {
  const area = polygonAreaHa(points);
  const center = points.length ? [points[0].lat, points[0].lng] : DEFAULT_CENTER;

  return (
    <div className="space-y-2">
      <div className="h-[280px] overflow-hidden rounded-xl border border-border sm:h-[320px]">
        <MapContainer center={center} zoom={points.length ? 16 : 14} scrollWheelZoom className="h-full w-full">
          <TileLayer url={SATELLITE_URL} attribution="Imagery © Esri, Maxar, Earthstar Geographics" />
          <MapResizer />
          <DrawLayer points={points} onAdd={(point) => onChange([...points, point])} />
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Tap the map to place boundary corners · {points.length} points ·{' '}
          <span className="font-medium text-foreground">{fmtNum(area, 2)} ha</span>
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-lg px-2.5 text-xs"
            onClick={() => onChange(points.slice(0, -1))}
            disabled={!points.length}
          >
            Undo point
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-lg px-2.5 text-xs"
            onClick={() => onChange([])}
            disabled={!points.length}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}