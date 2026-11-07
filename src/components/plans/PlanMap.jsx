import { Fragment, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip, ScaleControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SATELLITE_URL } from '@/components/blocks/BlockMap';
import { DEFAULT_CENTER, toLatLngs } from '@/lib/geo';
import { fmtNum } from '@/lib/format';

export const PLAN_COLORS = ['#2f6b46', '#b5651d', '#7d8f3f', '#9c4638', '#43688f', '#8a5f97', '#b08a1e', '#3b7d76'];

const LABEL_ANCHOR = L.divIcon({ className: 'plan-label-anchor', iconSize: [1, 1] });

// The vertex nearest the north-west corner of the parcel, where its label sits.
function cornerVertex(boundary) {
  const vertices = (boundary || []).filter(
    (point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lng),
  );
  if (vertices.length < 3) return null;

  const maxLat = Math.max(...vertices.map((point) => point.lat));
  const minLng = Math.min(...vertices.map((point) => point.lng));

  let best = vertices[0];
  let bestScore = Infinity;
  vertices.forEach((point) => {
    const score = maxLat - point.lat + (point.lng - minLng);
    if (score < bestScore) {
      bestScore = score;
      best = point;
    }
  });

  return [best.lat, best.lng];
}

function FitToParcels({ points, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
    const offset = (zoom - 50) / 25;
    if (offset !== 0) map.setZoom(map.getZoom() + offset);
  }, [map, points, zoom]);

  return null;
}

export default function PlanMap({ parcels, zoom = 50 }) {
  const points = useMemo(() => parcels.flatMap((parcel) => toLatLngs(parcel.boundary)), [parcels]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={13}
      className="h-full w-full"
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      zoomSnap={0.25}
    >
      <TileLayer url={SATELLITE_URL} attribution="Imagerie © Esri, Maxar, Earthstar Geographics" />

      {parcels.map((parcel, index) => {
        const color = PLAN_COLORS[index % PLAN_COLORS.length];
        const corner = cornerVertex(parcel.boundary);

        return (
          <Fragment key={parcel.id}>
            <Polygon
              positions={toLatLngs(parcel.boundary)}
              pathOptions={{ color, weight: 2, opacity: 0.95, fillColor: color, fillOpacity: 0.22 }}
            />
            {corner && (
              <Marker position={corner} icon={LABEL_ANCHOR} interactive={false}>
                <Tooltip permanent direction="right" offset={[6, 0]} opacity={1} className="plan-label">
                  <span>{parcel.name}</span>
                  <small>{fmtNum(parcel.area, 2)} ha</small>
                </Tooltip>
              </Marker>
            )}
          </Fragment>
        );
      })}

      <FitToParcels points={points} zoom={zoom} />
      <ScaleControl position="bottomleft" imperial={false} />
    </MapContainer>
  );
}