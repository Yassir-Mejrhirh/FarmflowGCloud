import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { House, MapPin, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import FarmDialog from '@/components/farms/FarmDialog';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/data';
import { useI18n } from '@/lib/I18nContext';

const coords = (record) =>
  record.latitude != null && record.longitude != null
    ? `${Number(record.latitude).toFixed(5)}, ${Number(record.longitude).toFixed(5)}`
    : null;

export default function Farms() {
  const { t } = useI18n();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setFarms(await fetchList(base44.entities.Farm, {}, { sort: 'name' }));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('farms.eyebrow')}
        title={t('farms.title')}
        description={t('farms.description')}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('farms.new')}
          </Button>
        }
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : farms.length === 0 ? (
        <EmptyState
          icon={House}
          title={t('farms.emptyTitle')}
          description={t('farms.emptyDesc')}
          action={<Button onClick={() => setOpen(true)}>{t('farms.add')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {farms.map((farm) => (
            <button
              key={farm.id}
              type="button"
              onClick={() => {
                setEditing(farm);
                setOpen(true);
              }}
              className="rounded-2xl border border-border/70 bg-card p-5 text-start transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]"
            >
              <p className="truncate font-display text-lg leading-tight">{farm.name}</p>
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5 truncate tabular-nums" dir="ltr">
                  <MapPin className="h-3 w-3 shrink-0" /> {coords(farm) || t('farms.noGeo')}
                </p>
                {farm.notes && <p className="line-clamp-2">{farm.notes}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <FarmDialog open={open} onOpenChange={setOpen} farm={editing} onSaved={load} />
    </div>
  );
}