// A storage supplies the farms it is associated with. A storage with no association
// serves every farm, and older records carrying a single "farm" are read the same way.
export function storageFarms(storage) {
  const list = (storage?.farms || []).filter(Boolean);
  if (list.length) return list;
  return storage?.farm ? [storage.farm] : [];
}

export function storageAppliesToFarm(storage, farmName) {
  if (!farmName) return true;
  const farms = storageFarms(storage);
  return farms.length === 0 || farms.includes(farmName);
}

export function storagesForFarm(storages = [], farmName) {
  return (storages || []).filter((storage) => storageAppliesToFarm(storage, farmName));
}