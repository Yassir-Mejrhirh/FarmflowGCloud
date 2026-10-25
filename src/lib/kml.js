import { BLOCK_STATUS_COLORS } from '@/components/blocks/BlockMap';
import { polygonAreaHa } from '@/lib/geo';

// KML colors are aabbggrr; our palette is #rrggbb.
const kmlColor = (hex, alpha = 'ff') => {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return `${alpha}88bf6f`;
  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);
  return `${alpha}${b}${g}${r}`;
};

const escapeXml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const hasBoundary = (block) => block.boundary && block.boundary.length > 2;

export const buildBlockKml = (blocks) => {
  const mapped = (blocks || []).filter(hasBoundary);

  const styles = Object.entries(BLOCK_STATUS_COLORS)
    .map(([status, hex]) => `    <Style id="style-${status}">
      <LineStyle><color>${kmlColor(hex)}</color><width>2</width></LineStyle>
      <PolyStyle><color>${kmlColor(hex, '55')}</color></PolyStyle>
    </Style>`)
    .join('\n');

  const placemarks = mapped
    .map((block) => {
      const coordinates = block.boundary
        .map((point) => `${point.lng},${point.lat},0`)
        .join(' ');
      const description = [
        `Area: ${Number(block.area_ha) || 0} ha`,
        block.code ? `Code: ${block.code}` : null,
        block.soil_type ? `Soil: ${block.soil_type}` : null,
        block.notes || null,
      ].filter(Boolean).join('\n');
      return `    <Placemark>
      <name>${escapeXml(block.name)}</name>
      <description>${escapeXml(description)}</description>
      <styleUrl>#style-${block.status || 'active'}</styleUrl>
      <Polygon>
        <tessellate>1</tessellate>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordinates}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Terra farm blocks</name>
${styles}
${placemarks}
  </Document>
</kml>`;
};

export const downloadBlockKml = (blocks, filename = 'terra-blocks.kml') => {
  const blob = new Blob([buildBlockKml(blocks)], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const blockKmlFilename = (block) => (
  `terra-${(block.code || block.name || 'block').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.kml`
);

/** Parses a KML file's text into block-shaped records: [{ name, boundary, area_ha }]. */
export const parseKmlBlocks = (text) => {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('This file is not a valid KML document.');
  }

  const blocks = [];
  Array.from(doc.getElementsByTagName('Placemark')).forEach((placemark, index) => {
    const polygon = placemark.getElementsByTagName('Polygon')[0];
    if (!polygon) return;
    const ring = polygon.getElementsByTagName('outerBoundaryIs')[0] || polygon;
    const coordText = ring.getElementsByTagName('coordinates')[0]?.textContent || '';
    const boundary = coordText
      .trim()
      .split(/\s+/)
      .map((tuple) => {
        const [lng, lat] = tuple.split(',').map(Number);
        return { lat, lng };
      })
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    if (boundary.length > 1
      && boundary[0].lat === boundary[boundary.length - 1].lat
      && boundary[0].lng === boundary[boundary.length - 1].lng) {
      boundary.pop();
    }
    if (boundary.length < 3) return;
    const name = placemark.getElementsByTagName('name')[0]?.textContent?.trim() || `Imported block ${index + 1}`;
    blocks.push({ name, boundary, area_ha: Number(polygonAreaHa(boundary).toFixed(3)) });
  });
  return blocks;
};