import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, ScaleControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SATELLITE_URL } from '@/components/blocks/BlockMap';
import { DEFAULT_CENTER, toLatLngs } from '@/lib/geo';
import { fmtNum } from '@/lib/format';

export const PLAN_COLORS = ['#2f6b46', '#b5651d', '#7d8f3f', '#9c4638', '#43688f', '#8a5f97', '#b08a1e', '#3b7d76'];

function FitToParcels({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(L.latLngBounds(points), { padding: [26, 26] });
  }, [map, points]);

  return null;
}

export default function PlanMap({ parcels }) {
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
    >
      <TileLayer url={SATELLITE_URL} attribution="Imagerie © Esri, Maxar, Earthstar Geographics" />

      {parcels.map((parcel, index) => {
        const color = PLAN_COLORS[index % PLAN_COLORS.length];
        return (
          <Polygon
            key={parcel.id}
            positions={toLatLngs(parcel.boundary)}
            pathOptions={{ color, weight: 2, opacity: 0.95, fillColor: color, fillOpacity: 0.22 }}
          >
            <Tooltip permanent direction="center" className="plan-label">
              <span>{parcel.name}</span>
              <small>{fmtNum(parcel.area, 2)} ha</small>
            </Tooltip>
          </Polygon>
        );
      })}

      <FitToParcels points={points} />
      <ScaleControl position="bottomleft" imperial={false} />
    </MapContainer>
  );
}