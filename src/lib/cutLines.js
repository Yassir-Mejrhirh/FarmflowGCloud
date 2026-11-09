// Cutting a parcel along lines drawn on the satellite image.
//
// A cut is a segment {a, b}: the line through its two handles divides the parcel.
// Handles are what the user drags, the line itself is treated as infinite so a
// short segment still cuts the whole parcel.

import { polygonAreaHa } from '@/lib/geo';

const PAD_RATIO = 0.12;

const side = (a, b, point) =>
  (b.lng - a.lng) * (point.lat - a.lat) - (b.lat - a.lat) * (point.lng - a.lng);

const planarArea = (points = []) => {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    total += current.lng * next.lat - next.lng * current.lat;
  }
  return Math.abs(total / 2);
};

// Sutherland–Hodgman clip against one side of an infinite line.
export function clipByLine(points = [], a, b, keepPositive) {
  if (!points || points.length < 3) return [];
  const inside = (point) => side(a, b, point) >= 0 === keepPositive;
  const clipped = [];
  points.forEach((current, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const currentIn = inside(current);
    const previousIn = inside(previous);
    if (currentIn !== previousIn) {
      const currentSide = side(a, b, current);
      const previousSide = side(a, b, previous);
      const delta = previousSide - currentSide;
      const ratio = delta === 0 ? 0 : previousSide / delta;
      clipped.push({
        lat: previous.lat + (current.lat - previous.lat) * ratio,
        lng: previous.lng + (current.lng - previous.lng) * ratio,
      });
    }
    if (currentIn) clipped.push({ lat: current.lat, lng: current.lng });
  });
  return clipped;
}

// Each cut peels one parcel off the rest, in the order the cuts are listed.
export function splitByCuts(boundary = [], cuts = []) {
  if (!boundary || boundary.length < 3) return [boundary || []];
  if (!cuts.length) return [boundary];

  const rings = [];
  let rest = boundary;
  cuts.forEach((cut) => {
    if (rest.length < 3) {
      rings.push([]);
      return;
    }
    rings.push(clipByLine(rest, cut.a, cut.b, true));
    rest = clipByLine(rest, cut.a, cut.b, false);
  });
  rings.push(rest);
  return rings;
}

// Sutherland–Hodgman clip against an axis-aligned half plane.
const clipAxis = (points, axis, bound, keepAbove) => {
  const inside = (point) => (keepAbove ? point[axis] >= bound : point[axis] <= bound);
  const clipped = [];
  points.forEach((current, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const currentIn = inside(current);
    const previousIn = inside(previous);
    if (currentIn !== previousIn) {
      const delta = current[axis] - previous[axis];
      const ratio = delta === 0 ? 0 : (bound - previous[axis]) / delta;
      clipped.push({
        lat: previous.lat + (current.lat - previous.lat) * ratio,
        lng: previous.lng + (current.lng - previous.lng) * ratio,
      });
    }
    if (currentIn) clipped.push({ lat: current.lat, lng: current.lng });
  });
  return clipped;
};

// Starting cuts: straight lines across the parcel's longer side, each one placed
// where the wished surface share of its parcel ends.
export function defaultCuts(boundary = [], weights = []) {
  if (!boundary || boundary.length < 3 || weights.length < 2) return [];

  const lats = boundary.map((point) => point.lat);
  const lngs = boundary.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const latSpan = maxLat - minLat;
  const lngSpan = (maxLng - minLng) * Math.cos((midLat * Math.PI) / 180);
  const axis = lngSpan >= latSpan ? 'lng' : 'lat';
  const min = axis === 'lng' ? minLng : minLat;
  const max = axis === 'lng' ? maxLng : maxLat;
  const pad = Math.max((axis === 'lng' ? maxLng - minLng : maxLat - minLat) * PAD_RATIO, 0.0002);
  const total = planarArea(boundary);
  if (!total) return [];

  const cuts = [];
  let cumulative = 0;
  weights.slice(0, -1).forEach((weight) => {
    cumulative += Number(weight) || 0;
    const target = total * cumulative;
    let low = min;
    let high = max;
    for (let step = 0; step < 46; step += 1) {
      const middle = (low + high) / 2;
      if (planarArea(clipAxis(boundary, axis, middle, false)) < target) low = middle;
      else high = middle;
    }
    const value = (low + high) / 2;
    cuts.push(
      axis === 'lng'
        ? { a: { lat: minLat - pad, lng: value }, b: { lat: maxLat + pad, lng: value } }
        : { a: { lat: value, lng: maxLng + pad }, b: { lat: value, lng: minLng - pad } },
    );
  });
  return cuts;
}

// Stored cuts are flat, so the schema stays one level deep.
export const cutToFlat = ({ a, b }) => ({
  a_lat: a.lat,
  a_lng: a.lng,
  b_lat: b.lat,
  b_lng: b.lng,
});

export const flatToCut = (cut = {}) => ({
  a: { lat: Number(cut.a_lat) || 0, lng: Number(cut.a_lng) || 0 },
  b: { lat: Number(cut.b_lat) || 0, lng: Number(cut.b_lng) || 0 },
});

export const pieceIsEmpty = (ring) => polygonAreaHa(ring) <= 0.0005;