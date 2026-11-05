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