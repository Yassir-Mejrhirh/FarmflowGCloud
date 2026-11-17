import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import DuplicateGroupCard from '@/components/workers/DuplicateGroupCard';
import { findSimilarGroups, mergeWorkerGroup, suggestedKeeper } from '@/lib/workerDuplicates';
import { useI18n } from '@/lib/I18nContext';

// Vérification des doublons de la liste MO : les noms proches sont présentés par
// groupe, la fiche à conserver est choisie puis confirmée. Rien n'est modifié tant
// que la fusion n'est pas validée.
export default function DuplicateReviewDialog({ open, onOpenChange, workers, onMerged }) {
  const { t } = useI18n();
  const [choice, setChoice] = useState({});
  const [ignored, setIgnored] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const groups = useMemo(() => (open ? findSimilarGroups(workers) : []), [open, workers]);

  useEffect(() => {
    if (!open) return;
    setChoice({});
    setIgnored(new Set());
    setResult(null);
  }, [open]);

  const keepFor = (group) => choice[group.key] || suggestedKeeper(group.workers);

  const selected = groups.filter((group) => !ignored.has(group.key));

  const toggleIgnore = (key) =>
    setIgnored((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const submit = async (event) => {
    event.preventDefault();
    if (result) {
      onOpenChange(false);
      return;
    }
    if (!selected.length) return;

    setSaving(true);
    let merged = 0;
    let failed = 0;
    try {
      for (const group of selected) {
        const keep = group.workers.find((worker) => worker.id === keepFor(group)) || group.workers[0];
        const remove = group.workers.filter((worker) => worker.id !== keep.id);
        try {
          const outcome = await mergeWorkerGroup({ keep, remove });
          merged += outcome.merged;
        } catch {
          failed += 1;
        }
      }
      setResult({ merged, failed });
      onMerged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dup.title')}
      description={t('dup.desc')}
      onSubmit={submit}
      saving={saving}
      submitLabel={result ? t('dup.close') : t('dup.mergeN', { n: selected.length })}
      submitDisabled={!result && !selected.length}
      wide
    >
      {result ? (
        <section className="space-y-2">
          <p className="flex items-center gap-1.5 text-[13px] font-medium">
            <Check className="h-4 w-4 text-primary" strokeWidth={2.2} />
            {t('dup.resultTitle')}
          </p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {t('dup.result', { n: result.merged })}
          </p>
          {result.failed > 0 && (
            <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-clay">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t('dup.failed', { n: result.failed })}
            </p>
          )}
        </section>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dup.empty')}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t('dup.found', { n: groups.length })}
          </p>
          {groups.map((group) => (
            <DuplicateGroupCard
              key={group.key}
              group={group}
              keepId={keepFor(group)}
              ignored={ignored.has(group.key)}
              onKeep={(key, workerId) => setChoice((current) => ({ ...current, [key]: workerId }))}
              onToggleIgnore={toggleIgnore}
            />
          ))}
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t('dup.hint')}</p>
        </div>
      )}
    </FormDialog>
  );
}