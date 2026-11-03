const SIGNATURE_EOCD = 0x06054b50;
const SIGNATURE_CENTRAL = 0x02014b50;
const SIGNATURE_LOCAL = 0x04034b50;

const findEndOfCentralDirectory = (view) => {
  const min = Math.max(0, view.byteLength - 66000);
  for (let offset = view.byteLength - 22; offset >= min; offset -= 1) {
    if (view.getUint32(offset, true) === SIGNATURE_EOCD) return offset;
  }
  return -1;
};

/** Reads the first .kml document inside a KMZ (zipped KML) archive. */
export const readKmzText = async (buffer) => {
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8');
  const eocd = findEndOfCentralDirectory(view);
  if (eocd < 0) throw new Error('Le fichier KMZ est invalide.');

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = [];

  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(offset, true) !== SIGNATURE_CENTRAL) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));
    entries.push({ name, method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  const entry = entries.find((item) => /\.kml$/i.test(item.name));
  if (!entry) throw new Error("L'archive KMZ ne contient aucun fichier KML.");

  const local = entry.localOffset;
  if (view.getUint32(local, true) !== SIGNATURE_LOCAL) throw new Error("L'archive KMZ est endommagée.");
  const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
  const data = new Uint8Array(buffer, start, entry.compressedSize);

  if (entry.method === 0) return decoder.decode(data);
  if (entry.method !== 8) throw new Error('Ce format de compression KMZ n\'est pas pris en charge.');

  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
};