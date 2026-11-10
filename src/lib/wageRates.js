const num = (value) => Number(value) || 0;

// Dated rates grouped by worker, oldest first, so the rate in force on a date is
// found by walking the list until the dates pass it.
export function buildRateIndex(rates = []) {
  const index = new Map();
  [...rates]
    .filter((rate) => rate?.worker_id && rate.effective_date)
    .sort((a, b) => String(a.effective_date).localeCompare(String(b.effective_date)))
    .forEach((rate) => {
      const list = index.get(rate.worker_id) || [];
      list.push(rate);
      index.set(rate.worker_id, list);
    });
  return index;
}

// The most recent rate whose effective date is not after the given date.
export function rateOn(index, workerId, date) {
  const list = index?.get(workerId) || [];
  let found = null;
  list.forEach((rate) => {
    if (!date || String(rate.effective_date) <= String(date)) found = rate;
  });
  return found;
}

// Rate applied on a date: the dated rate, or the worker's base rate when none exists yet.
export function rateFor(worker, index, date) {
  const dated = rateOn(index, worker?.id, date);
  return dated ? num(dated.daily_rate) : num(worker?.daily_rate);
}

// The rate stored on the report line wins, so a report keeps the cost it was written with.
export function labourRate(line, worker, index, date) {
  const stored = line?.daily_rate;
  if (stored !== undefined && stored !== null && stored !== '') return num(stored);
  return rateFor(worker, index, date);
}