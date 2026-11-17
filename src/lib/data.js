export async function fetchList(entity, query = {}, options = {}) {
  const res = await entity.filter(query, { limit: 300, ...options });
  if (Array.isArray(res)) return res;
  return res?.items ?? [];
}

// Liste complète : les pages sont enchaînées tant qu'il reste des fiches, pour que
// les listes ne s'arrêtent pas à la première page quand elles dépassent la limite.
export async function fetchAll(entity, query = {}, options = {}) {
  const rows = [];
  let cursor = null;
  for (let page = 0; page < 40; page += 1) {
    const res = await entity.filter(query, { limit: 300, ...options, ...(cursor ? { cursor } : {}) });
    if (Array.isArray(res)) return [...rows, ...res];
    rows.push(...(res?.items ?? []));
    if (!res?.has_more || !res?.next_cursor) break;
    cursor = res.next_cursor;
  }
  return rows;
}

export function sumBy(records, key) {
  return (records || []).reduce((total, record) => total + (Number(record[key]) || 0), 0);
}

export function byId(records) {
  return (records || []).reduce((map, record) => {
    map[record.id] = record;
    return map;
  }, {});
}