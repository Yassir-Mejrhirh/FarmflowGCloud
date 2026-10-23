export async function fetchList(entity, query = {}, options = {}) {
  const res = await entity.filter(query, { limit: 300, ...options });
  if (Array.isArray(res)) return res;
  return res?.items ?? [];
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