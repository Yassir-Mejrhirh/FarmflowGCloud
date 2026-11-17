import { Upload } from 'lucide-react';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function FileStep({ reading, error, fileName, onFile }) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <label
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center transition-colors duration-200 hover:border-primary/40 hover:bg-accent/40',
          reading && 'pointer-events-none opacity-60',
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
          <Upload className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <span className="font-display text-lg tracking-tight">
          {reading ? t('rimp.reading') : t('rimp.chooseFile')}
        </span>
        <span className="text-xs text-muted-foreground">{fileName || '.xlsx'}</span>
        <input
          type="file"
          accept=".xlsx"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = '';
          }}
        />
      </label>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}