import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, Plus, Warehouse } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import StorageDialog from '@/components/storages/StorageDialog';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/data';
import { storageFarms } from '@/lib/storageScope';
import { useI18n } from '@/lib/I18nContext';

const coords = (record) =>
  record.latitude != null && record.longitude != null
    ? `${Number(record.latitude).toFixed(5)}, ${Number(record.longitude).toFixed(5)}`
    : null;

export default function Storages() {
  const { t } = useI18n();
  const [storages, setStorages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setStorages(await fetchList(base44.entities.Storage, {}, { sort: 'name' }));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('storages.eyebrow')}
        title={t('storages.title')}
        description={t('storages.description')}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('storages.new')}
          </Button>
        }
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : storages.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title={t('storages.emptyTitle')}
          description={t('storages.emptyDesc')}
          action={<Button onClick={() => setOpen(true)}>{t('storages.add')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {storages.map((storage) => (
            <button
              key={storage.id}
              type="button"
              onClick={() => {
                setEditing(storage);
                setOpen(true);
              }}
              className="rounded-2xl border border-border/70 bg-card p-5 text-start transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="truncate font-display text-lg leading-tight">{storage.name}</p>
                <StatusPill tone="sand">{t(`sk.${storage.kind}`)}</StatusPill>
              </div>
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p className="truncate">{storageFarms(storage).join(' · ') || t('storages.noFarm')}</p>
                {storage.location && <p className="truncate">{storage.location}</p>}
                <p className="flex items-center gap-1.5 truncate tabular-nums" dir="ltr">
                  <MapPin className="h-3 w-3 shrink-0" /> {coords(storage) || t('storages.noGeo')}
                </p>
                {storage.capacity_note && <p className="truncate">{storage.capacity_note}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <StorageDialog open={open} onOpenChange={setOpen} storage={editing} onSaved={load} />
    </div>
  );
}