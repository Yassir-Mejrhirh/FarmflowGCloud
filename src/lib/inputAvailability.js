import { buildStockTotals } from '@/lib/inventory';

const byName = (a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });

// Quantité de chaque intrant dans un ou plusieurs dépôts, sans mélanger les autres lieux.
export function stockInStorages({ invoices = [], movements = [], counts = [] } = {}, storageIds = []) {
  const totals = {};
  (storageIds || []).filter(Boolean).forEach((storageId) => {
    const rows = buildStockTotals({ invoices, movements, counts }, storageId);
    Object.entries(rows).forEach(([itemId, row]) => {
      totals[itemId] = { quantity: (totals[itemId]?.quantity || 0) + (Number(row.quantity) || 0) };
    });
  });
  return totals;
}

// Seuls les intrants réellement disponibles sont proposés.
export function positiveItems(items = [], totals = {}) {
  return (items || []).filter((item) => (Number(totals[item.id]?.quantity) || 0) > 0);
}

// Regroupement par catégorie, catégories et articles en ordre alphabétique.
export function groupByCategory(items = [], noCategoryLabel = '') {
  const groups = new Map();
  (items || []).forEach((item) => {
    const key = String(item?.category || '').trim();
    if (!groups.has(key)) groups.set(key, { key, label: key || noCategoryLabel, items: [] });
    groups.get(key).items.push(item);
  });

  return [...groups.values()]
    .map((group) => ({ ...group, items: [...group.items].sort(byName) }))
    .sort((a, b) => {
      if (!a.key) return 1;
      if (!b.key) return -1;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
}