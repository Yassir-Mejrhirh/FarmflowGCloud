import { useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useI18n } from '@/lib/I18nContext';

// Excel and PDF export of the whole filtered report, not only the visible rows.
export default function ExportMenu({ onExcel, onPdf, disabled, hasData = true }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [busy, setBusy] = useState('');

  const run = async (kind) => {
    if (busy) return;
    if (!hasData) {
      toast({ title: t('exp.empty') });
      return;
    }
    setBusy(kind);
    try {
      await (kind === 'excel' ? onExcel() : onPdf());
      toast({ title: t('exp.done') });
    } catch (error) {
      toast({ title: t('exp.failed'), description: String(error?.message || error), variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-xl" disabled={disabled || !!busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? t('exp.busy') : t('exp.export')}
          <ChevronDown className="ms-1 h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => run('excel')} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-sage" />
          {t('exp.excel')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run('pdf')} className="gap-2">
          <FileText className="h-4 w-4 text-clay" />
          {t('exp.pdf')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}