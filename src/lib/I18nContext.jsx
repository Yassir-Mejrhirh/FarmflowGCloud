import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS } from '@/lib/translations';
import { WAGE_TRANSLATIONS } from '@/lib/translationsWage';
import { TRACKING_TRANSLATIONS } from '@/lib/translationsTracking';
import { EXPORT_TRANSLATIONS } from '@/lib/translationsExport';
import { TRANSPORT_TRANSLATIONS } from '@/lib/translationsTransport';
import { WORKER_FILTER_TRANSLATIONS } from '@/lib/translationsWorkerFilters';
import { WORKER_IMPORT_TRANSLATIONS } from '@/lib/translationsWorkerImport';
import { REPORT_LINES_TRANSLATIONS } from '@/lib/translationsReportLines';
import { INPUT_PICKER_TRANSLATIONS } from '@/lib/translationsInputPicker';
import { STORAGE_TRANSLATIONS } from '@/lib/translationsStorage';
import { LABOUR_PERIOD_TRANSLATIONS } from '@/lib/translationsLabourPeriod';
import { ATTENDANCE_TRANSLATIONS } from '@/lib/translationsAttendance';
import { WORKER_FARMS_TRANSLATIONS } from '@/lib/translationsWorkerFarms';
import { ATTENDANCE_IMPORT_TRANSLATIONS } from '@/lib/translationsAttendanceImport';
import { RECONCILE_TRANSLATIONS } from '@/lib/translationsReconcile';
import { WORKER_PRINT_TRANSLATIONS } from '@/lib/translationsWorkerPrint';
import { setLocale } from '@/lib/format';

const DICTIONARIES = {
  fr: {
    ...TRANSLATIONS.fr,
    ...WAGE_TRANSLATIONS.fr,
    ...TRACKING_TRANSLATIONS.fr,
    ...EXPORT_TRANSLATIONS.fr,
    ...TRANSPORT_TRANSLATIONS.fr,
    ...WORKER_FILTER_TRANSLATIONS.fr,
    ...WORKER_IMPORT_TRANSLATIONS.fr,
    ...REPORT_LINES_TRANSLATIONS.fr,
    ...INPUT_PICKER_TRANSLATIONS.fr,
    ...STORAGE_TRANSLATIONS.fr,
    ...LABOUR_PERIOD_TRANSLATIONS.fr,
    ...ATTENDANCE_TRANSLATIONS.fr,
    ...WORKER_FARMS_TRANSLATIONS.fr,
    ...ATTENDANCE_IMPORT_TRANSLATIONS.fr,
    ...RECONCILE_TRANSLATIONS.fr,
    ...WORKER_PRINT_TRANSLATIONS.fr,
  },
  ar: {
    ...TRANSLATIONS.ar,
    ...WAGE_TRANSLATIONS.ar,
    ...TRACKING_TRANSLATIONS.ar,
    ...EXPORT_TRANSLATIONS.ar,
    ...TRANSPORT_TRANSLATIONS.ar,
    ...WORKER_FILTER_TRANSLATIONS.ar,
    ...WORKER_IMPORT_TRANSLATIONS.ar,
    ...REPORT_LINES_TRANSLATIONS.ar,
    ...INPUT_PICKER_TRANSLATIONS.ar,
    ...STORAGE_TRANSLATIONS.ar,
    ...LABOUR_PERIOD_TRANSLATIONS.ar,
    ...ATTENDANCE_TRANSLATIONS.ar,
    ...WORKER_FARMS_TRANSLATIONS.ar,
    ...ATTENDANCE_IMPORT_TRANSLATIONS.ar,
    ...RECONCILE_TRANSLATIONS.ar,
    ...WORKER_PRINT_TRANSLATIONS.ar,
  },
};

const I18nContext = createContext(null);
export const LANGUAGES = [
  { value: 'fr', label: 'FR' },
  { value: 'ar', label: 'ع' },
];

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('farmflow-lang') : null;
    return saved === 'ar' || saved === 'fr' ? saved : 'fr';
  });

  useEffect(() => {
    localStorage.setItem('farmflow-lang', lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    setLocale(lang === 'ar' ? 'ar-MA' : 'fr-FR');
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      let text = DICTIONARIES[lang]?.[key] ?? DICTIONARIES.fr[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([name, value]) => {
          text = text.split(`{${name}}`).join(String(value));
        });
      }
      return text;
    },
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);