import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Users, Wallet } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import WorkerDialog from '@/components/workers/WorkerDialog';
import WorkerTable from '@/components/workers/WorkerTable';
import WageHistoryDialog from '@/components/workers/WageHistoryDialog';
import TeamRateDialog from '@/components/workers/TeamRateDialog';
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
  const [rateWorker, setRateWorker] = useState(null);
  const [teamRateOpen, setTeamRateOpen] = useState(false);
  const [wageRates, setWageRates] = useState([]);
  const [transportRates, setTransportRates] = useState([]);

  const load = async () => {
    const [workerRows, farmRows, functionRows, rateRows, transportRows] = await Promise.all([
      fetchList(base44.entities.Worker, {}, { sort: 'name' }),
      fetchList(base44.entities.Farm, {}, { sort: 'name' }),
      fetchList(base44.entities.WorkerFunction, {}, { sort: 'name' }),
      fetchList(base44.entities.WageRate, {}, { sort: '-effective_date' }),
      fetchList(base44.entities.TransportRate, {}, { sort: '-effective_date' }),
    ]);
    setWorkers(workerRows);
    setFarms(farmRows);
    setFunctions(functionRows);
    setWageRates(rateRows);
    setTransportRates(transportRows);
    setLoading(false);
  };

  const reloadRates = async () => {
    setWageRates(await fetchList(base44.entities.WageRate, {}, { sort: '-effective_date' }));
  };

  const reloadFunctions = async () => {
    setFunctions(await fetchList(base44.entities.WorkerFunction, {}, { sort: 'name' }));
  };

  useEffect(() => {
    load();
  }, []);

  const activeCount = workers.filter((worker) => worker.active !== false).length;
  const declaredCount = workers.filter((worker) => worker.declared).length;
  const teamNames = useMemo(() => [...new Set(workers.map((worker) => worker.team).filter(Boolean))], [workers]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('workers.eyebrow')}
        title={t('workers.title')}
        description={t('workers.description')}
        action={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => setTeamRateOpen(true)}>
              <Wallet className="mr-1.5 h-4 w-4" /> {t('wage.newRateBtn')}
            </Button>
            <Button
              className="rounded-xl"
              onClick={() => {
                setEditingWorker(null);
                setWorkerDialog(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> {t('workers.newWorker')}
            </Button>
          </>
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
        <WorkerTable
          workers={workers}
          rates={wageRates}
          onRates={setRateWorker}
          onEdit={(worker) => {
            setEditingWorker(worker);
            setWorkerDialog(true);
          }}
        />
      )}

      <WageHistoryDialog
        open={Boolean(rateWorker)}
        onOpenChange={(open) => !open && setRateWorker(null)}
        worker={rateWorker}
        rates={wageRates}
        onSaved={reloadRates}
      />

      <TeamRateDialog
        open={teamRateOpen}
        onOpenChange={setTeamRateOpen}
        workers={workers}
        rates={wageRates}
        onSaved={reloadRates}
      />

      <WorkerDialog
        open={workerDialog}
        onOpenChange={setWorkerDialog}
        worker={editingWorker}
        farms={farms}
        functions={functions}
        teams={teamNames}
        rates={wageRates}
        transportRates={transportRates}
        workers={workers}
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