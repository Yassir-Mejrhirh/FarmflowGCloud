import { FileUp, X } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/I18nContext';

export default function FileDropzone({ file, onFile, onClear }) {
  const { t } = useI18n();
  const inputRef = useRef(null);

  const pick = (event) => {
    const picked = event.target.files?.[0];
    if (picked) onFile(picked);
    event.target.value = '';
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={pick} />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/40 px-4 py-3">
          <FileUp className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
          <p className="min-w-0 flex-1 truncate text-sm">{file.name}</p>
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            {t('imp.removeFile')}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-secondary/25 px-4 py-8 text-center transition-colors duration-200 hover:border-primary/40 hover:bg-accent"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-primary shadow-sm">
            <FileUp className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span className="text-sm font-medium">{t('imp.chooseFile')}</span>
          <span className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">{t('imp.dropHint')}</span>
        </button>
      )}
    </div>
  );
}