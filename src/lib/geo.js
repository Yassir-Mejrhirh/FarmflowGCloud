const toRad = (deg) => (deg * Math.PI) / 180;

/** Geodesic area of a lat/lng ring, in hectares. */
export const polygonAreaHa = (points = []) => {
  if (!points || points.length < 3) return 0;
  const R = 6378137;
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    total += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  const area = Math.abs((total * R * R) / 2);
  return area / 10000;
};

export const polygonCenter = (points = []) => {
  if (!points.length) return null;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
};

export const toLatLngs = (points = []) => points.map((p) => [p.lat, p.lng]);

export const haToSqM = (ha) => Math.round((Number(ha) || 0) * 10000);

export const DEFAULT_CENTER = [31.6295, -7.9811];