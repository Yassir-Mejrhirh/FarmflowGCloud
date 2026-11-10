import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS } from '@/lib/translations';
import { WAGE_TRANSLATIONS } from '@/lib/translationsWage';
import { setLocale } from '@/lib/format';

const DICTIONARIES = {
  fr: { ...TRANSLATIONS.fr, ...WAGE_TRANSLATIONS.fr },
  ar: { ...TRANSLATIONS.ar, ...WAGE_TRANSLATIONS.ar },
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