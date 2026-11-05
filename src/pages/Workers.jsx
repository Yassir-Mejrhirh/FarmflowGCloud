import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import WorkerDialog from '@/components/workers/WorkerDialog';
import WorkerCard from '@/components/workers/WorkerCard';
import { fetchList } from '@/lib/data';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function Workers() {
  const { t } = useI18n();
  const [workers, setWorkers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workerDialog, setWorkerDialog] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  const load = async () => {
    const [workerRows, farmRows, functionRows] = await Promise.all([
      fetchList(base44.entities.Worker, {}, { sort: 'name' }),
      fetchList(base44.entities.Farm, {}, { sort: 'name' }),
      fetchList(base44.entities.WorkerFunction, {}, { sort: 'name' }),
    ]);
    setWorkers(workerRows);
    setFarms(farmRows);
    setFunctions(functionRows);
    setLoading(false);
  };

  const reloadFunctions = async () => {
    setFunctions(await fetchList(base44.entities.WorkerFunction, {}, { sort: 'name' }));
  };

  useEffect(() => {
    load();
  }, []);

  const activeCount = workers.filter((worker) => worker.active !== false).length;
  const declaredCount = workers.filter((worker) => worker.declared).length;
  const teams = useMemo(() => {
    const map = new Map();
    workers.forEach((worker) => {
      const key = worker.team || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(worker);
    });
    return [...map.entries()]
      .sort(([a], [b]) => (a || '\uffff').localeCompare(b || '\uffff'))
      .map(([team, rows]) => ({ team, rows }));
  }, [workers]);

  const teamNames = useMemo(() => [...new Set(workers.map((worker) => worker.team).filter(Boolean))], [workers]);
  const grouped = teamNames.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('workers.eyebrow')}
        title={t('workers.title')}
        description={t('workers.description')}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditingWorker(null);
              setWorkerDialog(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('workers.newWorker')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label={t('workers.activeCrew')} value={activeCount} />
        <MiniStat label={t('workers.declaredCount')} value={declaredCount} />
        <MiniStat label={t('workers.teamsCount')} value={teamNames.length} />
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : workers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('workers.emptyTitle')}
          description={t('workers.emptyDesc')}
          action={<Button onClick={() => setWorkerDialog(true)}>{t('workers.add')}</Button>}
        />
      ) : (
        <div className="space-y-6">
          {teams.map((group) => (
            <div key={group.team || 'none'} className="space-y-2">
              {grouped && (
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {group.team || t('workers.noTeam')} · {group.rows.length}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.rows.map((worker) => (
                  <WorkerCard
                    key={worker.id}
                    worker={worker}
                    onEdit={() => {
                      setEditingWorker(worker);
                      setWorkerDialog(true);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <WorkerDialog
        open={workerDialog}
        onOpenChange={setWorkerDialog}
        worker={editingWorker}
        farms={farms}
        functions={functions}
        teams={teamNames}
        onFunctionsChanged={reloadFunctions}
        onSaved={load}
      />
    </div>
  );
}

function MiniStat({ label, value, tone = 'sand' }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={cn('font-display text-lg leading-tight tabular-nums', tone === 'clay' && 'text-clay')}>{value}</p>
    </div>
  );
}