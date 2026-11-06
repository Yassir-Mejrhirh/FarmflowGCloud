// Quantities and purchase value per input, derived from the invoice lines.
export function buildInputTotals(invoices = []) {
  const totals = {};
  invoices.forEach((invoice) => {
    (invoice.lines || []).forEach((line) => {
      if (!line.item_id) return;
      const quantity = Number(line.quantity) || 0;
      const cost = quantity * (Number(line.unit_price) || 0);
      const row = totals[line.item_id] || { quantity: 0, cost: 0 };
      row.quantity += quantity;
      row.cost += cost;
      totals[line.item_id] = row;
    });
  });
  return totals;
}

// Quantity and value per input, as recorded in validated inventory counts.
export function buildCountTotals(counts = []) {
  const totals = {};
  counts.forEach((count) => {
    (count.lines || []).forEach((line) => {
      if (!line.item_id) return;
      const quantity = Number(line.quantity) || 0;
      const row = totals[line.item_id] || { quantity: 0, cost: 0 };
      row.quantity += quantity;
      row.cost += quantity * (Number(line.unit_price) || 0);
      totals[line.item_id] = row;
    });
  });
  return totals;
}

// Adds inventory-count valuations to the purchase totals, for the weighted average price.
export function mergeTotals(base = {}, extra = {}) {
  const merged = {};
  Object.entries(base).forEach(([itemId, row]) => {
    merged[itemId] = { ...row };
  });
  Object.entries(extra).forEach(([itemId, row]) => {
    const existing = merged[itemId] || { quantity: 0, cost: 0 };
    merged[itemId] = { quantity: existing.quantity + row.quantity, cost: existing.cost + row.cost };
  });
  return merged;
}

// On-hand quantity per input: purchases from invoices, plus stock-in movements, minus stock-out movements.
export function buildOnHand(invoices = [], movements = []) {
  const totals = buildInputTotals(invoices);
  const onHand = {};
  Object.entries(totals).forEach(([itemId, row]) => {
    onHand[itemId] = { ...row };
  });
  movements.forEach((movement) => {
    if (!movement.item_id) return;
    const sign = movement.kind === 'out' ? -1 : 1;
    const row = onHand[movement.item_id] || { quantity: 0, cost: 0 };
    row.quantity += sign * (Number(movement.quantity) || 0);
    onHand[movement.item_id] = row;
  });
  return onHand;
}

// On-hand quantity per input, broken down by storage: invoices and movements of that storage.
export function buildStorageOnHand(invoices = [], movements = []) {
  const totals = {};
  const add = (storageId, itemId, quantity) => {
    if (!storageId || !itemId || !quantity) return;
    const byStorage = totals[storageId] || {};
    byStorage[itemId] = (byStorage[itemId] || 0) + quantity;
    totals[storageId] = byStorage;
  };
  invoices.forEach((invoice) => {
    (invoice.lines || []).forEach((line) => {
      add(invoice.storage_id, line.item_id, Number(line.quantity) || 0);
    });
  });
  movements.forEach((movement) => {
    const sign = movement.kind === 'out' ? -1 : 1;
    add(movement.storage_id, movement.item_id, sign * (Number(movement.quantity) || 0));
  });
  return totals;
}

// Storage of a farm that holds the most of this input, so stock-outs leave the right depot.
export function pickStorageFor(storages = [], invoices = [], itemId) {
  if (!storages.length || !itemId) return '';
  const purchased = {};
  invoices.forEach((invoice) => {
    if (!invoice.storage_id || !storages.some((storage) => storage.id === invoice.storage_id)) return;
    (invoice.lines || []).forEach((line) => {
      if (line.item_id !== itemId) return;
      purchased[invoice.storage_id] = (purchased[invoice.storage_id] || 0) + (Number(line.quantity) || 0);
    });
  });
  const best = Object.entries(purchased).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : storages[0].id;
}

// Weighted average purchase price (prix moyen pondéré).
export function avgCostOf(totals, itemId) {
  const row = totals[itemId];
  return row && row.quantity ? row.cost / row.quantity : 0;
}