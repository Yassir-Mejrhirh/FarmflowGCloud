import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { downloadBytes } from '@/lib/xlsxWriter';
import { exportExcel, exportFileName } from '@/lib/reportExport';
import {
  DEFAULT_PRINT_FIELDS,
  WORKER_PRINT_FIELDS,
  buildWorkerCsv,
  buildWorkerPrintData,
  printWorkerList,
} from '@/lib/workerPrint';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Impression et export de la liste des ouvriers : le nom est toujours inclus, les
// autres colonnes sont cochées par l'utilisateur avant de lancer l'impression ou
// le téléchargement du fichier.
export default function WorkerPrintDialog({ open, onOpenChange, workers = [], rates = [] }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [fields, setFields] = useState(DEFAULT_PRINT_FIELDS);
  const [busy, setBusy] = useState('');

  const data = useMemo(
    () => buildWorkerPrintData({ workers, rates, fields, t }),
    [workers, rates, fields, t],
  );

  const subtitle = t('wprint.generated', {
    date: new Date().toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  });
  const fileName = t('wprint.fileName');

  const toggle = (id) =>
    setFields((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));

  const run = async (kind) => {
    if (busy || !workers.length) return;
    setBusy(kind);
    try {
      if (kind === 'print') {
        const opened = printWorkerList({
          title: t('wprint.listTitle'),
          subtitle,
          columns: data.columns,
          rows: data.rows,
          lang,
        });
        if (!opened) toast({ title: t('wprint.blocked'), variant: 'destructive' });
      } else if (kind === 'excel') {
        exportExcel({ base: fileName, columns: data.columns, rows: data.rows });
        toast({ title: t('wprint.done') });
      } else {
        const csv = buildWorkerCsv(data.columns, data.rows, lang);
        downloadBytes(exportFileName(fileName, 'csv'), csv, 'text/csv;charset=utf-8');
        toast({ title: t('wprint.done') });
      }
    } catch (error) {
      toast({ title: t('wprint.failed'), description: String(error?.message || error), variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-xl font-normal tracking-tight">{t('wprint.title')}</DialogTitle>
          <DialogDescription className="text-sm">{t('wprint.desc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-5">
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/50 px-3 py-2">
            <Checkbox checked disabled className="opacity-100" />
            <span className="text-[12px] font-medium">{t('wprint.nameAlways')}</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {WORKER_PRINT_FIELDS.map((field) => (
              <label
                key={field.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition-colors',
                  fields.includes(field.id)
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border/70 hover:bg-accent/40',
                )}
              >
                <Checkbox checked={fields.includes(field.id)} onCheckedChange={() => toggle(field.id)} />
                <span className="text-[12.5px]">{t(field.labelKey)}</span>
              </label>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">{t('wprint.count', { n: data.rows.length })}</p>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-6 py-4">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => run('csv')}
            disabled={!!busy || !workers.length}
          >
            {busy === 'csv' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            {t('wprint.csv')}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => run('excel')}
            disabled={!!busy || !workers.length}
          >
            {busy === 'excel' ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            )}
            {t('wprint.excel')}
          </Button>
          <Button className="rounded-xl" onClick={() => run('print')} disabled={!!busy || !workers.length}>
            {busy === 'print' ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-1.5 h-4 w-4" />
            )}
            {t('wprint.print')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}