// Totals of the same input inside one entry, so a line repeated twice is
// compared with the available stock once.
export function aggregateQuantities(lines = [], idKey = 'item_id', qtyKey = 'quantity') {
  const totals = new Map();
  lines.forEach((line) => {
    const id = line[idKey];
    const quantity = Number(line[qtyKey]) || 0;
    if (!id || !(quantity > 0)) return;
    totals.set(id, (totals.get(id) || 0) + quantity);
  });
  return totals;
}

// Inputs whose requested quantity exceeds the stock available for this entry.
export function findShortages(totals, availableFor, multiplier = 1) {
  const shortages = [];
  totals.forEach((quantity, itemId) => {
    const requested = quantity * multiplier;
    const available = Number(availableFor(itemId)) || 0;
    if (requested > available + 0.000001) {
      shortages.push({ item_id: itemId, requested, available });
    }
  });
  return shortages;
}