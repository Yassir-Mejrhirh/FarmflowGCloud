import { Fragment, useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { SATELLITE_URL } from '@/components/blocks/BlockMap';
import { DEFAULT_CENTER, toLatLngs } from '@/lib/geo';
import { fmtNum } from '@/lib/format';

export const PIECE_COLORS = ['#6fbf8e', '#e5c07b', '#e08a5b', '#9bb7d4', '#c39bd3', '#88c9c9'];

const handleIcon = (color) =>
  L.divIcon({
    className: 'cut-handle',
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 2px 5px rgba(0,0,0,.45)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

function MapFocus({ boundary, focusKey }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 260);
    return () => clearTimeout(timer);
  }, [map, focusKey]);

  useEffect(() => {
    if (boundary.length < 3) return;
    map.fitBounds(L.latLngBounds(toLatLngs(boundary)), { padding: [22, 22] });
  }, [boundary, focusKey, map]);

  return null;
}

export default function CutLineMap({ boundary = [], cuts = [], pieces = [], labels = [], areas = [], onMoveCut, heightClass = 'h-[300px] sm:h-[340px]' }) {
  const center = boundary.length
    ? [boundary[0].lat, boundary[0].lng]
    : DEFAULT_CENTER;
  const focusKey = boundary.length;

  return (
    <div className={`${heightClass} w-full overflow-hidden rounded-xl border border-border`}>
      <MapContainer center={center} zoom={16} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url={SATELLITE_URL} attribution="Imagery © Esri, Maxar, Earthstar Geographics" />
        <MapFocus boundary={boundary} focusKey={focusKey} />

        {pieces.map((ring, index) => {
          if (!ring || ring.length < 3) return null;
          const color = PIECE_COLORS[index % PIECE_COLORS.length];
          return (
            <Polygon
              key={`piece-${index}`}
              positions={toLatLngs(ring)}
              pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.28 }}
            >
              <Tooltip sticky>
                {labels[index] || `#${index + 1}`}
                {areas[index] !== undefined ? ` · ${fmtNum(Number(areas[index]) || 0, 2)} ha` : ''}
              </Tooltip>
            </Polygon>
          );
        })}

        {cuts.map((cut, index) => {
          const color = PIECE_COLORS[(index + 1) % PIECE_COLORS.length];
          const line = [[cut.a.lat, cut.a.lng], [cut.b.lat, cut.b.lng]];
          return (
            <Fragment key={`cut-${index}`}>
              <Polyline positions={line} pathOptions={{ color: '#101614', weight: 4, opacity: 0.5 }} />
              <Polyline positions={line} pathOptions={{ color: '#ffffff', weight: 2, dashArray: '7 5' }} />
              {['a', 'b'].map((end) => (
                <Marker
                  key={`cut-${index}-${end}`}
                  position={[cut[end].lat, cut[end].lng]}
                  icon={handleIcon(color)}
                  draggable={!!onMoveCut}
                  eventHandlers={{
                    dragend: (event) => {
                      const position = event.target.getLatLng();
                      onMoveCut?.(index, end, {
                        lat: Number(position.lat.toFixed(6)),
                        lng: Number(position.lng.toFixed(6)),
                      });
                    },
                  }}
                />
              ))}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}