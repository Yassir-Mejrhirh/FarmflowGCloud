import { base44 } from '@/api/base44Client';
import { TRANSLATIONS } from '@/lib/translations';

export const countValue = (count) =>
  (count.lines || []).reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
    0,
  );

const legacyNotes = (count) =>
  ['fr', 'ar'].map((lang) =>
    TRANSLATIONS[lang]['stockCount.movementNote'].replace('{date}', count.date || ''),
  );

// Le constat ajuste le stock : ses mouvements d'ajustement sont retirés avant tout recalcul.
export async function removeCountMovements(count) {
  const linked = await base44.entities.StockMovement.filter({ count_id: count.id });
  if (linked.length) {
    await base44.entities.StockMovement.deleteMany({ count_id: count.id });
    return;
  }
  if (!count.date) return;
  await base44.entities.StockMovement.deleteMany({
    date: count.date,
    storage_id: count.storage_id || '',
    notes: { $in: legacyNotes(count) },
  });
}

export async function deleteInventoryCount(count) {
  await removeCountMovements(count);
  await base44.entities.InventoryCount.delete(count.id);
}