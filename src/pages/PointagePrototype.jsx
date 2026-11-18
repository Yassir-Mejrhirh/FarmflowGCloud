import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic, Plus, Search, Users, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PrototypeNotice from '@/components/pointage-prototype/PrototypeNotice';
import SiteChips from '@/components/pointage-prototype/SiteChips';
import GeoSimulationCard from '@/components/pointage-prototype/GeoSimulationCard';
import PointageWorkerRow from '@/components/pointage-prototype/PointageWorkerRow';
import VoiceAssistantBar from '@/components/pointage-prototype/VoiceAssistantBar';
import AddWorkerSheet from '@/components/pointage-prototype/AddWorkerSheet';
import { DEMO_SITES, DEMO_WORKERS } from '@/lib/pointagePrototypeData';
import { normalizeText } from '@/lib/darijaVoice';

export default function PointagePrototype() {
  const [siteId, setSiteId] = useState(DEMO_SITES[0].id);
  const [geo, setGeo] = useState('idle');
  const [marks, setMarks] = useState({});
  const [extraWorkers, setExtraWorkers] = useState([]);
  const [search, setSearch] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [prefillName, setPrefillName] = useState('');
  const [finished, setFinished] = useState(false);

  const canPoint = geo === 'onsite';

  const siteWorkers = useMemo(
    () => [...DEMO_WORKERS, ...extraWorkers].filter((worker) => worker.siteId === siteId),
    [siteId, extraWorkers],
  );

  const visibleWorkers = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return siteWorkers;
    return siteWorkers.filter((worker) =>
      normalizeText(`${worker.name} ${worker.latin || ''} ${worker.worker_function || ''} ${worker.team || ''}`).includes(query),
    );
  }, [siteWorkers, search]);

  const presentCount = siteWorkers.filter((worker) => marks[worker.id] === 'present').length;
  const absentCount = siteWorkers.filter((worker) => marks[worker.id] === 'absent').length;
  const remaining = siteWorkers.length - presentCount - absentCount;

  const mark = (workerId, status) => {
    if (!canPoint) return;
    setMarks((current) => {
      const next = { ...current };
      if (next[workerId] === status) delete next[workerId];
      else next[workerId] = status;
      return next;
    });
  };

  const applyVoice = (action) => {
    if (!action || action.kind === 'unknown') return;
    if (action.kind === 'search') {
      setSearch(action.worker ? action.worker.name : '');
      return;
    }
    if (action.kind === 'add') {
      setPrefillName(action.worker?.name || '');
      setAddOpen(true);
      return;
    }
    if (!action.worker) return;
    mark(action.worker.id, action.kind);
  };

  const addWorker = (values) => {
    setExtraWorkers((current) => [
      ...current,
      { id: `demo-${Date.now()}`, siteId, latin: '', team: '', ...values },
    ]);
  };

  const reset = () => {
    setMarks({});
    setExtraWorkers([]);
    setSearch('');
    setGeo('idle');
    setFinished(false);
    setSiteId(DEMO_SITES[0].id);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        <header className="flex items-center gap-2">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Retour à FarmFlow"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={1.9} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">FarmFlow</p>
            <p className="font-display text-lg leading-tight">Pointage mobile</p>
          </div>
          <span className="shrink-0 rounded-full border border-clay/40 bg-clay/[0.08] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-clay">
            Démo
          </span>
        </header>

        <div className="mt-4 space-y-3">
          <PrototypeNotice />

          <section>
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Site (fictif)</p>
            <SiteChips
              sites={DEMO_SITES}
              value={siteId}
              onChange={(next) => {
                setSiteId(next);
                setSearch('');
              }}
            />
          </section>

          <GeoSimulationCard value={geo} onChange={setGeo} />

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Présents', value: presentCount, tone: 'text-primary' },
              { label: 'Absents', value: absentCount, tone: 'text-destructive' },
              { label: 'À pointer', value: remaining, tone: 'text-foreground' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border/80 bg-card px-2 py-2 text-center">
                <p className={`font-display text-xl leading-none ${stat.tone}`}>{stat.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un ouvrier"
                className="h-9 rounded-xl ps-8 text-[12.5px]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 rounded-xl px-2.5 text-[12px]"
              onClick={() => {
                setPrefillName('');
                setAddOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              Ouvrier
            </Button>
          </div>

          {!canPoint && (
            <p className="rounded-xl border border-dashed border-border bg-secondary/40 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
              Le pointage n’est pas autorisé : validez d’abord le contrôle du site ci-dessus.
            </p>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Ouvriers du site · {visibleWorkers.length}
              </p>
              <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                <Users className="h-3 w-3" strokeWidth={2} />
                {siteWorkers.length}
              </span>
            </div>
            {visibleWorkers.length === 0 ? (
              <p className="rounded-2xl border border-border/80 bg-card px-3 py-6 text-center text-[12px] text-muted-foreground">
                Aucun ouvrier fictif ne correspond à cette recherche.
              </p>
            ) : (
              visibleWorkers.map((worker) => (
                <PointageWorkerRow
                  key={worker.id}
                  worker={worker}
                  status={marks[worker.id]}
                  disabled={!canPoint}
                  onMark={mark}
                />
              ))
            )}
          </section>

          {finished ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.9} />
                <div>
                  <p className="text-[12.5px] font-semibold text-primary">Démonstration terminée</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                    Aucun pointage n’a été enregistré ni synchronisé avec FarmFlow. Les marques restent dans cet écran uniquement.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-2.5 h-9 w-full rounded-xl text-[12px]" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                Recommencer
              </Button>
            </div>
          ) : (
            <Button
              className="h-11 w-full rounded-2xl text-[13px]"
              disabled={!canPoint}
              onClick={() => setFinished(true)}
            >
              Simuler l’enregistrement du pointage
            </Button>
          )}

          <button
            type="button"
            onClick={reset}
            className="mx-auto flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={2} />
            Réinitialiser la démonstration
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setVoiceOpen(true)}
        disabled={!canPoint}
        aria-label="Commande vocale"
        className="fixed bottom-5 end-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform duration-200 hover:scale-105 disabled:opacity-40"
      >
        <Mic className="h-6 w-6" strokeWidth={1.8} />
      </button>

      <VoiceAssistantBar
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        workers={siteWorkers}
        onApply={applyVoice}
      />
      <AddWorkerSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        prefillName={prefillName}
        onAdd={addWorker}
      />
    </div>
  );
}