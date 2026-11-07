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

// Le stock suit les événements dans l'ordre du temps : une facture ajoute, un mouvement
// entre ou sort, et un inventaire validé fixe la quantité réellement constatée à sa date.
// Les ajustements écrits par les anciens inventaires sont ignorés : le constat les remplace.
const eventKey = (row) => `${String(row.date || '').slice(0, 10)}|${String(row.created_date || '')}`;

export function buildStockTotals({ invoices = [], movements = [], counts = [] }, storageId = '') {
  const inScope = (row) => !storageId || (row.storage_id || '') === storageId;
  const events = [];

  invoices.filter(inScope).forEach((invoice) => {
    (invoice.lines || []).forEach((line) => {
      if (!line.item_id) return;
      events.push({
        item_id: line.item_id,
        kind: 'in',
        quantity: Number(line.quantity) || 0,
        key: eventKey(invoice),
        rank: 1,
      });
    });
  });

  movements
    .filter((movement) => !movement.count_id && inScope(movement))
    .forEach((movement) => {
      if (!movement.item_id) return;
      events.push({
        item_id: movement.item_id,
        kind: movement.kind === 'out' ? 'out' : 'in',
        quantity: Number(movement.quantity) || 0,
        key: eventKey(movement),
        rank: 1,
      });
    });

  counts.filter(inScope).forEach((count) => {
    (count.lines || []).forEach((line) => {
      if (!line.item_id) return;
      events.push({
        item_id: line.item_id,
        kind: 'count',
        quantity: Number(line.quantity) || 0,
        key: eventKey(count),
        rank: 0,
      });
    });
  });

  events.sort((a, b) => a.key.localeCompare(b.key) || a.rank - b.rank);

  const totals = {};
  events.forEach((event) => {
    const row = totals[event.item_id] || { quantity: 0 };
    if (event.kind === 'count') row.quantity = event.quantity;
    else row.quantity += (event.kind === 'out' ? -1 : 1) * event.quantity;
    totals[event.item_id] = row;
  });
  return totals;
}

// Quantité disponible par intrant, inventaires compris.
export function buildOnHand(invoices = [], movements = [], counts = []) {
  return buildStockTotals({ invoices, movements, counts });
}

// Même calcul, restreint aux mouvements et inventaires d'un dépôt.
export function buildStorageOnHand(invoices = [], movements = [], counts = []) {
  const ids = new Set(
    [...invoices, ...movements, ...counts].map((row) => row.storage_id).filter(Boolean),
  );
  const totals = {};
  ids.forEach((id) => {
    totals[id] = buildStockTotals({ invoices, movements, counts }, id);
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