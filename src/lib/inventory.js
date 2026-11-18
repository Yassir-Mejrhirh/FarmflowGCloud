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

// Le stock suit les événements dans l'ordre du temps : une facture ajoute la quantité et sa
// valeur d'achat, un mouvement entre ou sort à la valeur du prix moyen du moment, et un
// inventaire validé fixe la quantité réellement constatée, valorisée au prix de l'inventaire
// ou, à défaut, au prix moyen du moment. La quantité restante, le prix moyen pondéré (PMP) et
// la valeur du stock sortent de cette même chronologie, pour que toutes les pages affichent
// exactement les mêmes chiffres.
// Les ajustements écrits par les anciens inventaires sont ignorés : le constat les remplace.
const eventKey = (row) => `${String(row.date || '').slice(0, 10)}|${String(row.created_date || '')}`;

// Tous les événements de stock, dans l'ordre du temps, pour une chronologie unique.
function collectStockEvents({ invoices = [], movements = [], counts = [] }, storageId = '') {
  const inScope = (row) => !storageId || (row.storage_id || '') === storageId;
  const events = [];

  invoices.filter(inScope).forEach((invoice) => {
    (invoice.lines || []).forEach((line) => {
      if (!line.item_id) return;
      const quantity = Number(line.quantity) || 0;
      events.push({
        item_id: line.item_id,
        kind: 'in',
        quantity,
        value: quantity * (Number(line.unit_price) || 0),
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
        // Un mouvement sans coût (transfert, sortie de stock) est valorisé au prix moyen du moment.
        value: Number(movement.cost) > 0 ? Number(movement.cost) : null,
        key: eventKey(movement),
        rank: 1,
      });
    });

  counts.filter(inScope).forEach((count) => {
    (count.lines || []).forEach((line) => {
      if (!line.item_id) return;
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unit_price) || 0;
      events.push({
        item_id: line.item_id,
        kind: 'count',
        quantity,
        value: unitPrice > 0 ? quantity * unitPrice : null,
        key: eventKey(count),
        rank: 0,
      });
    });
  });

  return events
    .map((event) => ({ ...event, day: event.key.slice(0, 10) }))
    .sort((a, b) => a.key.localeCompare(b.key) || a.rank - b.rank);
}

// Applique un événement au stock de son intrant : la sortie part à la valeur du PMP du moment.
function applyStockEvent(totals, event) {
  const row = totals[event.item_id] || { quantity: 0, value: 0 };
  const pmp = row.quantity ? row.value / row.quantity : 0;
  const movedValue = event.value != null ? event.value : event.quantity * pmp;
  if (event.kind === 'count') {
    row.quantity = event.quantity;
    row.value = movedValue;
  } else if (event.kind === 'out') {
    row.quantity -= event.quantity;
    row.value -= movedValue;
  } else {
    row.quantity += event.quantity;
    row.value += movedValue;
  }
  totals[event.item_id] = row;
}

export function buildStockTotals({ invoices = [], movements = [], counts = [] }, storageId = '') {
  const totals = {};
  collectStockEvents({ invoices, movements, counts }, storageId).forEach((event) =>
    applyStockEvent(totals, event),
  );
  return totals;
}

// PMP à une date passée : la chronologie est rejouée jusqu'à cette date seulement, si bien
// qu'un achat ou un inventaire postérieur ne réécrit jamais le coût d'un rapport déjà écrit.
export function buildStockPmpIndex({ invoices = [], movements = [], counts = [] }) {
  const events = collectStockEvents({ invoices, movements, counts });
  const snapshots = new Map();
  return (itemId, date) => {
    const day = String(date || '').slice(0, 10);
    if (!snapshots.has(day)) {
      const totals = {};
      events.filter((event) => event.day <= day).forEach((event) => applyStockEvent(totals, event));
      snapshots.set(day, totals);
    }
    const row = snapshots.get(day)[itemId];
    return row && row.quantity ? row.value / row.quantity : 0;
  };
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
// With the stock of each depot, the one actually holding the input is preferred: a
// withdrawal never pushes a depot below zero while the stock sleeps in another one.
export function pickStorageFor(storages = [], invoices = [], itemId, onHand = null) {
  if (!storages.length || !itemId) return '';
  if (onHand) {
    const holding = storages
      .map((storage) => ({ id: storage.id, quantity: Number(onHand[storage.id]?.[itemId]?.quantity) || 0 }))
      .filter((row) => row.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);
    if (holding.length) return holding[0].id;
  }
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

// PMP du stock restant, tiré de la même chronologie que la quantité : achats, entrées,
// sorties et inventaires. C'est le prix que les pages Intrants et État des stocks affichent.
export function stockPmpOf(totals, itemId) {
  const row = totals[itemId];
  return row && row.quantity ? row.value / row.quantity : 0;
}

// Valeur du stock restant au PMP : le même montant dans toutes les pages.
export function stockValueOf(totals, itemId) {
  const row = totals[itemId];
  return row ? (Number(row.quantity) || 0) * stockPmpOf(totals, itemId) : 0;
}