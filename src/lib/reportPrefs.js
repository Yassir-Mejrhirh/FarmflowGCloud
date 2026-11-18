// Dernière date et dernière ferme saisies dans le rapport journalier, gardées
// dans le navigateur pour reprendre la saisie là où elle s'était arrêtée.
const KEY = 'farmflow.reportPrefs';

export function readReportPrefs() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
}

export function saveReportPrefs(prefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Le navigateur peut refuser le stockage : la saisie reste utilisable.
  }
}