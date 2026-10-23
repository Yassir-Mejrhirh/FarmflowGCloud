import { MapContainer, TileLayer, Polygon, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { toLatLngs, DEFAULT_CENTER } from '@/lib/geo';
import { fmtNum } from '@/lib/format';

export const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const COLORS = {
  active: '#6fbf8e',
  preparing: '#e5c07b',
  harvest: '#e08a5b',
  fallow: '#b9bdb0',
};

export default function BlockMap({ blocks, selectedId, onSelect }) {
  const shapes = (blocks || []).filter((block) => block.boundary && block.boundary.length > 2);

  return (
    <div className="h-[320px] w-full overflow-hidden rounded-xl sm:h-[430px]">
      <MapContainer center={DEFAULT_CENTER} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url={SATELLITE_URL} attribution="Imagery © Esri, Maxar, Earthstar Geographics" />
        {shapes.map((block) => {
          const active = block.id === selectedId;
          return (
            <Polygon
              key={block.id}
              positions={toLatLngs(block.boundary)}
              pathOptions={{
                color: COLORS[block.status] || COLORS.active,
                weight: active ? 3 : 2,
                fillOpacity: active ? 0.35 : 0.15,
              }}
              eventHandlers={{ click: () => onSelect?.(block.id) }}
            >
              <Tooltip sticky>
                {block.name} · {fmtNum(block.area_ha, 2)} ha
              </Tooltip>
            </Polygon>
          );
        })}
        {!shapes.length && <MapCenterHint />}
      </MapContainer>
    </div>
  );
}

function MapCenterHint() {
  return null;
}

export { COLORS as BLOCK_STATUS_COLORS };