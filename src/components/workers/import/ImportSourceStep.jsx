import { useRef } from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IMPORT_FIELDS } from '@/lib/workerImport';
import { useI18n } from '@/lib/I18nContext';

export default function ImportSourceStep({
  fileName, headers, mapping, onChangeMapping, onFile, reading, error,
}) {
  const { t } = useI18n();
  const inputRef = useRef(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-7 text-center">
        <FileSpreadsheet className="h-6 w-6 text-primary" />
        <p className="text-sm font-medium">{t('wimport.dropTitle')}</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{t('wimport.dropHint')}</p>
        {fileName && <p className="mt-1 max-w-full truncate text-xs font-medium text-primary">{fileName}</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 rounded-lg"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
        >
          {reading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
          {reading ? t('wimport.reading') : t('wimport.choose')}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = '';
          }}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {headers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{t('wimport.mapTitle')}</p>
            <p className="text-[11px] text-muted-foreground">{t('wimport.mapHint')}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {IMPORT_FIELDS.map((field) => {
              const column = mapping[field.key];
              return (
                <div
                  key={field.key}
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {t(field.labelKey)}
                    {field.required && ' *'}
                  </span>
                  <Select
                    value={column === undefined ? 'none' : String(column)}
                    onValueChange={(value) =>
                      onChangeMapping(field.key, value === 'none' ? undefined : Number(value))
                    }
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue placeholder={t('wimport.ignore')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('wimport.ignore')}</SelectItem>
                      {headers.map((header, index) => (
                        <SelectItem key={`${field.key}-${index}`} value={String(index)}>
                          {header || t('wimport.col', { value: index + 1 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}