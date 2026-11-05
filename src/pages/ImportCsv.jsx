import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Database, FileSpreadsheet, Lock, Loader2, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TablePicker from '@/components/import/TablePicker';
import FileDropzone from '@/components/import/FileDropzone';
import ColumnMapper from '@/components/import/ColumnMapper';
import RowPreview from '@/components/import/RowPreview';
import ImportResult from '@/components/import/ImportResult';
import { getActiveCompanyId } from '@/lib/companyScope';
import { autoMap, isTooBig, parseCsv, validateRows } from '@/lib/csvImport';
import { useI18n } from '@/lib/I18nContext';

export default function ImportCsv() {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState(null);
  const [companyId, setCompanyId] = useState('');
  const [entity, setEntity] = useState('');
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [serverErrors, setServerErrors] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions
      .invoke('importCsvRecords', { action: 'catalog' })
      .then((response) => {
        const data = response.data || {};
        setCatalog(data);
        const active = getActiveCompanyId();
        const fallback =
          data.allowedCompanyId ||
          data.companies?.find((company) => company.id === active)?.id ||
          data.companies?.[0]?.id ||
          '';
        setCompanyId(fallback);
      })
      .catch(() => setError(t('imp.catalogFailed')))
      .finally(() => setLoading(false));
  }, []);

  const companies = catalog?.companies || [];
  const tables = catalog?.tables || [];
  const locked = Boolean(catalog?.allowedCompanyId);
  const table = tables.find((item) => item.entity === entity) || null;
  const company = companies.find((item) => item.id === companyId) || null;

  useEffect(() => {
    if (!table || !parsed) {
      setMapping({});
      return;
    }
    setMapping(autoMap(table.fields, parsed.headers));
  }, [entity, parsed]);

  const validation = useMemo(() => {
    if (!table || !parsed) return null;
    return validateRows(parsed.rows, table.fields, mapping);
  }, [table, parsed, mapping]);

  const mappedColumns = table
    ? table.fields.filter((field) => mapping[field.name] !== '' && mapping[field.name] !== undefined).length
    : 0;

  const handleFile = async (picked) => {
    setError('');
    setServerErrors([]);
    setResult(null);
    if (isTooBig(picked)) {
      setError(t('imp.tooBig'));
      return;
    }
    const text = await picked.text();
    const data = parseCsv(text);
    if (!data.headers.length || !data.rows.length) {
      setError(t('imp.noRows'));
      return;
    }
    setFile(picked);
    setParsed(data);
  };

  const clearFile = () => {
    setFile(null);
    setParsed(null);
    setMapping({});
    setServerErrors([]);
  };

  const errorText = (message) => {
    if (message === 'required') return t('imp.errRequired');
    if (message === 'number') return t('imp.errNumber');
    if (message === 'date') return t('imp.errDate');
    if (message === 'option') return t('imp.errOption');
    if (message === 'reference') return t('imp.errRef');
    return message;
  };

  const handleImport = async () => {
    setError('');
    setServerErrors([]);
    setBusy(true);
    try {
      const response = await base44.functions.invoke('importCsvRecords', {
        action: 'import',
        company_id: companyId,
        entity,
        rows: validation?.records || [],
      });
      setResult({ created: response.data?.created || 0, route: table?.route });
      clearFile();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors?.length) {
        setServerErrors(data.errors);
        setError(t('imp.invalidRows', { n: data.errors.length }));
      } else {
        setError(data?.error || err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError('');
    setServerErrors([]);
    clearFile();
  };

  const delimiterLabel = parsed?.delimiter === '\t' ? 'tabulation' : parsed?.delimiter;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader eyebrow={t('imp.eyebrow')} title={t('imp.title')} description={t('imp.description')} />

      {result && <ImportResult result={result} onReset={reset} />}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span>{error}</span>
        </div>
      )}

      <section className="rounded-2xl border border-border/70 bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-primary">
            <Database className="h-3.5 w-3.5" strokeWidth={1.9} />
          </span>
          <h2 className="font-display text-lg tracking-tight">{t('imp.destination')}</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('imp.company')}</p>
            {locked || companies.length <= 1 ? (
              <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 text-sm">
                <span className="truncate">{company?.name || t('company.none')}</span>
                {locked && <Lock className="ms-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </div>
            ) : (
              <Select value={companyId || undefined} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('company.none')} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {locked && <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{t('imp.lockedHint')}</p>}
          </div>

          <TablePicker tables={tables} value={entity} onChange={setEntity} />
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-primary">
            <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.9} />
          </span>
          <h2 className="font-display text-lg tracking-tight">{t('imp.file')}</h2>
        </div>

        <FileDropzone file={file} onFile={handleFile} onClear={clearFile} />

        {parsed && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {t('imp.rowsFound', { n: parsed.rows.length, c: parsed.headers.length, d: delimiterLabel })}
          </p>
        )}
      </section>

      {parsed && table && (
        <section className="rounded-2xl border border-border/70 bg-card p-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-primary">
              <Upload className="h-3.5 w-3.5" strokeWidth={1.9} />
            </span>
            <h2 className="font-display text-lg tracking-tight">{t('imp.mapping')}</h2>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{t('imp.mappingHint')}</p>

          <ColumnMapper
            fields={table.fields}
            headers={parsed.headers}
            mapping={mapping}
            onChange={(field, column) => setMapping((current) => ({ ...current, [field]: column }))}
          />
        </section>
      )}

      {parsed && table && (
        <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg tracking-tight">{t('imp.preview')}</h2>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                {t('imp.validRows', { n: validation?.records.length || 0 })}
              </span>
              {(validation?.errors.length || 0) > 0 && (
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">
                  {t('imp.invalidRows', { n: validation.errors.length })}
                </span>
              )}
            </div>
          </div>

          <RowPreview fields={table.fields} rows={parsed.rows} mapping={mapping} />

          {(validation?.errors.length || 0) > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-secondary/20 px-4 py-3 text-xs">
              {validation.errors.slice(0, 8).map((item, index) => (
                <li key={index} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{t('imp.errorRow', { n: item.row })}</span>
                  {' · '}
                  {item.field} — {errorText(item.message)}
                </li>
              ))}
            </ul>
          )}

          {serverErrors.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive">
              {serverErrors.slice(0, 8).map((item, index) => (
                <li key={index}>
                  {t('imp.errorRow', { n: item.row })} · {item.field} — {errorText(item.message)}
                </li>
              ))}
            </ul>
          )}

          {!mappedColumns && <p className="text-xs text-muted-foreground">{t('imp.needMapping')}</p>}

          <Button
            onClick={handleImport}
            disabled={busy || mappedColumns === 0 || (validation?.records.length || 0) === 0}
            className="w-full sm:w-auto"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('imp.importing')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {t('imp.import', { n: validation?.records.length || 0 })}
              </>
            )}
          </Button>
        </section>
      )}

      {!parsed && <p className="text-xs text-muted-foreground">{t('imp.needTable')}</p>}
    </div>
  );
}