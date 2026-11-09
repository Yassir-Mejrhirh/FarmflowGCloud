// Contenu du protocole de test de charge FarmFlow : données statiques, aucune
// écriture en base. La page ne fait que présenter et copier ce contenu.

export const rules = [
  {
    title: "Zéro écriture sur les données live",
    detail:
      "Par défaut, la preview et l'application live partagent les mêmes données. Le test ne peut se faire qu'après activation de Test Data dans Settings (plan Builder ou supérieur), puis « Turn on test data » dans la preview. Sans cette séparation, le test est annulé.",
  },
  {
    title: "La cible se prouve, elle ne se suppose pas",
    detail:
      "Avant chaque palier, créer un enregistrement de test, vérifier qu'il apparaît dans la cible du test et qu'il n'apparaît pas dans l'application live. La preuve est notée dans le compte rendu.",
  },
  {
    title: "Aucun secret dans les scripts",
    detail:
      "Le jeton d'accès est fourni par variable d'environnement au moment de l'exécution. Il ne doit figurer ni dans le script, ni dans un journal, ni dans une capture, ni dans le compte rendu.",
  },
  {
    title: "Un pilote, un observateur",
    detail:
      "Une seule personne lance et arrête la charge ; une seconde surveille les indicateurs et déclenche l'arrêt d'urgence sans discussion.",
  },
  {
    title: "Nettoyage limité au manifeste",
    detail:
      "Seuls les identifiants consignés dans le manifeste du test (préfixe LT-) sont supprimés. Aucune suppression par filtre large, aucune suppression en masse.",
  },
  {
    title: "Hors heures d'exploitation",
    detail:
      "Le test se déroule quand aucune saisie réelle n'est en cours, et les utilisateurs de l'application sont prévenus de la fenêtre.",
  },
];

export const roles = [
  { role: "Pilote", duty: "Configure la cible, lance les paliers, arrête la charge." },
  { role: "Observateur", duty: "Surveille latence, erreurs 429/5xx et cohérence ; peut arrêter seul." },
  { role: "Responsable données", duty: "Tient le manifeste, exécute le nettoyage et vérifie les comptes avant/après." },
  { role: "Validateur", duty: "Contrôle la cohérence après charge et signe le compte rendu." },
];

export const isolationSteps = [
  "Activer Test Data dans Settings (plan Builder ou supérieur).",
  "Ouvrir la preview et activer « Turn on test data ».",
  "Créer six comptes de test LT-01 à LT-06, rôle user, jamais le compte administrateur.",
  "Préfixer chaque enregistrement créé par le marqueur LT-AAAAMMJJ.",
  "Noter le nombre d'enregistrements de production sur deux entités témoins (DailyReport, StockMovement).",
  "Créer un enregistrement témoin, le retrouver dans la cible du test, confirmer son absence dans l'application live, puis le supprimer.",
  "Consigner la preuve : URL cible, date et heure, opérateur, comptes relevés.",
  "Prévenir les utilisateurs réels de la fenêtre de test.",
];

export const dataset = [
  { item: "Comptes de test", quantity: "6", note: "LT-01 à LT-06, rôle user, aucun droit admin." },
  { item: "FarmBlock", quantity: "3", note: "Parcelles fictives de 0,5 à 2 ha, frontières simples." },
  { item: "Machine", quantity: "2", note: "Un tracteur et un pulvérisateur." },
  { item: "Worker", quantity: "6", note: "Un ouvrier par utilisateur simulé." },
  { item: "InputItem", quantity: "4", note: "Carburant, lubrifiant et deux intrants." },
  {
    item: "InputInvoice + InventoryCount",
    quantity: "2 + 1",
    note: "Indispensable : sans facture ni inventaire, le prix moyen reste à 0 et les coûts affichés sont nuls.",
  },
  { item: "Storage", quantity: "1", note: "Magasin de test pour les mouvements." },
  { item: "Task", quantity: "4", note: "Une tâche par nature testée." },
];

export const scenarios = [
  {
    code: "S1",
    weight: "50 %",
    title: "Rapport journalier",
    goal: "L'écriture principale de l'application, qui touche plusieurs entités à la fois.",
    actions: [
      "Créer un rapport : 1 parcelle, 2 ouvriers, 1 machine (heures, carburant, lubrifiant), 2 intrants.",
      "Relire l'enregistrement créé.",
      "Modifier les notes du rapport.",
    ],
    expected: "Création en moins de 1,2 s, relecture identique, aucune ligne de main-d'œuvre perdue.",
  },
  {
    code: "S2",
    weight: "25 %",
    title: "Mouvements de stock",
    goal: "Vérifier que le stock encaisse des écritures simultanées sans se désynchroniser.",
    actions: ["Enregistrer une entrée puis une sortie sur le carburant.", "Relire la liste filtrée des mouvements.", "Contrôler le stock affiché."],
    expected: "Aucun stock négatif inattendu, quantités conservées, liste à jour.",
  },
  {
    code: "S3",
    weight: "15 %",
    title: "Entretien et réparation",
    goal: "Le chemin le plus lourd : une opération génère des sorties de stock et un coût machine.",
    actions: [
      "Créer un entretien avec 2 pièces prélevées et un coût de main-d'œuvre.",
      "Vérifier les mouvements de stock générés.",
      "Contrôler le coût d'entretien et le coût horaire machine.",
    ],
    expected: "Deux sorties créées, coût d'entretien visible, coût horaire recalculé sans doublon.",
  },
  {
    code: "S4",
    weight: "10 %",
    title: "Édition simultanée",
    goal: "Observer le comportement quand deux personnes touchent les mêmes données.",
    actions: [
      "Deux utilisateurs modifient en même temps deux rapports différents de la même parcelle.",
      "Deux utilisateurs modifient ensuite le même rapport.",
    ],
    expected: "Aucun blocage dur. Sur un même enregistrement, la dernière écriture l'emporte : c'est le comportement attendu, à documenter, pas une anomalie.",
  },
  {
    code: "S5",
    weight: "en fond",
    title: "Lectures pendant l'écriture",
    goal: "S'assurer que les écrans restent utilisables pendant la charge.",
    actions: ["Charger Parcelles, État du stock et État machines toutes les 10 secondes."],
    expected: "Pages stables, aucune page blanche, temps de chargement dans les seuils.",
  },
];

export const ramp = [
  { step: "Palier 0", users: "1", duration: "3 min", purpose: "Valider le scénario, le manifeste et un nettoyage à blanc." },
  { step: "Palier 1", users: "2", duration: "5 min", purpose: "Premier parallélisme réel, surveiller les 429." },
  { step: "Palier 2", users: "4", duration: "5 min", purpose: "Charge proche de l'usage quotidien." },
  { step: "Palier 3", users: "6", duration: "8 min", purpose: "Cible : 5 à 6 utilisateurs simultanés." },
  { step: "Palier 4", users: "6", duration: "15 min", purpose: "Maintien : détecter fuites et ralentissements progressifs." },
  { step: "Palier 5 (option)", users: "8", duration: "3 min", purpose: "Marge : identifier où le système décroche." },
];

export const indicators = [
  { indicator: "Erreurs serveur (5xx)", target: "0 %", stop: "plus de 1 % sur 60 s" },
  { indicator: "Réponses 429 (débit)", target: "0", stop: "plus de 5 % sur 60 s malgré une charge réduite" },
  { indicator: "Création — p95", target: "moins de 1 200 ms", stop: "plus de 3 000 ms pendant 3 min" },
  { indicator: "Lecture de liste — p95", target: "moins de 1 500 ms", stop: "plus de 4 000 ms pendant 3 min" },
  { indicator: "Débit d'écriture", target: "environ 1 écriture/s par utilisateur", stop: "chute de plus de 50 % sans baisse de charge" },
  { indicator: "Doublons et enregistrements orphelins", target: "0", stop: "tout doublon inexpliqué" },
  { indicator: "Écart de stock non justifié", target: "0", stop: "tout écart non documenté" },
];

export const platformLimits = [
  { endpoint: "list / filter / count", limit: "70 appels / 60 s" },
  { endpoint: "get (un enregistrement)", limit: "150 appels / 60 s" },
  { endpoint: "create", limit: "80 appels / 60 s" },
  { endpoint: "update", limit: "70 appels / 60 s" },
  { endpoint: "delete", limit: "70 appels / 30 s" },
  { endpoint: "bulkCreate / upsert / bulkUpdate", limit: "25 appels / 60 s" },
  { endpoint: "aggregate", limit: "15 appels / 60 s" },
];

export const stopConditions = [
  "Toute écriture qui atteint les données de production : arrêt immédiat, sans exception.",
  "Plus de 1 % de réponses 5xx pendant une minute.",
  "p95 supérieur à 3 secondes pendant trois minutes.",
  "Réponses 429 répétées malgré la réduction de la charge.",
  "Perte ou duplication d'enregistrement inexpliquée au contrôle de cohérence.",
  "Signalement d'anomalie par un utilisateur réel de l'application.",
];

export const consistencyChecks = [
  "Compter les rapports créés dans le manifeste et les retrouver tous, une seule fois.",
  "Vérifier qu'aucun rapport ne pointe vers une parcelle inexistante.",
  "Contrôler le stock de deux articles : entrées moins sorties égale stock affiché.",
  "Contrôler l'état machine : heures égales à la somme des rapports, coût égal à entretien plus carburant.",
  "Chercher les rapports identiques (même jour, même parcelle, même tâche) issus d'une requête rejouée.",
  "Confirmer que les enregistrements supprimés pendant le test ne réapparaissent pas.",
];

export const cleanupSteps = [
  "Reprendre le manifeste produit pendant le test (identifiants exportés par le script).",
  "Supprimer par lots d'au plus 500 identifiants, entité par entité, du plus dépendant au plus structurant : mouvements, rapports, entretiens, tâches, puis parcelles, machines, ouvriers, articles.",
  "Comparer les compteurs avec ceux relevés avant le test : l'écart doit être nul.",
  "Supprimer les comptes de test dans App Users.",
  "Supprimer les comptes rendus, scripts et manifestes : ils ne contiennent aucune donnée personnelle.",
];

export const limitations = [
  "Le test porte sur 5 à 6 utilisateurs et de petits volumes : il prouve la stabilité à cette échelle, pas la tenue à grande échelle.",
  "La charge passe par l'API de l'application, pas par un navigateur : le rendu des cartes, des planches et des impressions n'est pas mesuré.",
  "Les limites de débit sont par point d'accès, par application et par appelant : lancé depuis une seule machine, le test peut atteindre ces plafonds avant une vraie panne.",
  "Les données de test ne pèsent pas le poids réel : pas d'historique long, pas de géométries complexes.",
  "Le résultat vaut pour la version testée : à refaire après une évolution majeure.",
  "Ne sont pas testés : envoi d'emails, appels d'IA, import de fichiers volumineux.",
];

export const reportTemplate = `# Compte rendu — test de charge FarmFlow

- Date et fenêtre :
- Version testée (checkpoint) :
- Cible (URL, environnement) :
- Preuve d'isolation :
- Pilote / observateur :
- Outil et scénario :

## Paliers exécutés
| Palier | Utilisateurs | Durée | Erreurs 5xx | 429 | p95 création | p95 liste |
|---|---|---|---|---|---|---|
| 0 | 1 | 3 min | | | | |

## Incidents
- Heure, palier, symptôme, action prise :

## Cohérence
- Enregistrements attendus / retrouvés :
- Écarts de stock :
- Doublons :

## Nettoyage
- Identifiants supprimés :
- Compteurs avant / après :

## Conclusion
- Stable jusqu'à :
- Point de rupture observé :
- Recommandations :
- Réserves :`;

export const k6Script = `import http from 'k6/http';
import { check, sleep } from 'k6';

// Aucun secret ici : tout vient de l'environnement au moment de l'exécution.
const BASE = __ENV.APP_URL;      // https://amphibian-farm-flow-pro.base44.app
const APP = __ENV.APP_ID;
const TOKEN = __ENV.API_TOKEN;   // jeton d'accès personnel, créé dans la page API
const MARK = __ENV.MARKER;       // ex. LT-20261110

const BLOCK = __ENV.BLOCK_ID;
const MACHINE = __ENV.MACHINE_ID;
const WORKER = __ENV.WORKER_ID;
const FUEL = __ENV.FUEL_ID;
const LUBE = __ENV.LUBE_ID;

const url = (path) => BASE + '/api/apps/' + APP + path;
const headers = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer ' + TOKEN,
};

export const options = {
  scenarios: {
    ecritures: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '3m', target: 1 },   // palier 0
        { duration: '2m', target: 2 },   // palier 1
        { duration: '3m', target: 4 },   // palier 2
        { duration: '8m', target: 6 },   // palier 3
        { duration: '15m', target: 6 },  // palier 4 : maintien
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:create}': ['p(95)<1200'],
    'http_req_duration{name:list}': ['p(95)<1500'],
  },
};

export default function () {
  const today = new Date().toISOString().slice(0, 10);

  const body = {
    date: today,
    block_id: BLOCK,
    operation: 'spraying',
    description: MARK + ' VU' + __VU,
    labour: [{ worker_id: WORKER, days: 1 }],
    machinery: [{
      machine_id: MACHINE,
      hours: 1,
      fuel_item_id: FUEL,
      fuel_quantity: 2,
      lubricant_item_id: LUBE,
      lubricant_quantity: 0.2,
    }],
    inputs: [],
  };

  const created = http.post(url('/entities/DailyReport'), JSON.stringify(body), {
    headers,
    tags: { name: 'create' },
  });
  check(created, { 'creation 2xx': (r) => r.status >= 200 && r.status < 300 });
  if (created.status >= 400) { sleep(2); return; }

  const id = created.json('id');
  // Seule trace conservée : l'identifiant, pour le manifeste de nettoyage.
  console.log('LT-ID DailyReport ' + id);

  const read = http.get(url('/entities/DailyReport/' + id), { headers, tags: { name: 'read' } });
  check(read, { 'lecture 2xx': (r) => r.status === 200 });

  const updated = http.put(url('/entities/DailyReport/' + id), JSON.stringify({ notes: MARK }), {
    headers,
    tags: { name: 'update' },
  });
  check(updated, { 'mise a jour 2xx': (r) => r.status === 200 });

  const list = http.get(url('/entities/DailyReport/v2/list'), { headers, tags: { name: 'list' } });
  check(list, { 'liste 2xx': (r) => r.status === 200 });

  sleep(2);
}`;

export const k6RunCommand =
  'APP_URL=... APP_ID=... API_TOKEN=... MARKER=LT-20261110 \\\n' +
  'BLOCK_ID=... MACHINE_ID=... WORKER_ID=... FUEL_ID=... LUBE_ID=... \\\n' +
  'k6 run --out json=resultats.json scenario.js 2>&1 | tee run.log';

export const manifestCommand = "grep 'LT-ID' run.log | awk '{print $3, $4}' > manifeste.csv";

export function protocolMarkdown() {
  const list = (items) => items.map((line) => `- ${line}`).join('\n');
  return `# Protocole de test de charge — FarmFlow

## 1. Règles non négociables
${rules.map((rule) => `- **${rule.title}** : ${rule.detail}`).join('\n')}

## 2. Rôles
${roles.map((row) => `- **${row.role}** : ${row.duty}`).join('\n')}

## 3. Préparation de l'environnement isolé
${list(isolationSteps)}

## 4. Jeu de données de test
${dataset.map((row) => `- ${row.item} — ${row.quantity} : ${row.note}`).join('\n')}

## 5. Scénarios
${scenarios
  .map(
    (scenario) =>
      `### ${scenario.code} — ${scenario.title} (${scenario.weight})\n${scenario.goal}\n${list(scenario.actions)}\nAttendu : ${scenario.expected}`,
  )
  .join('\n\n')}

## 6. Montée en charge
${ramp.map((row) => `- ${row.step} : ${row.users} utilisateur(s), ${row.duration} — ${row.purpose}`).join('\n')}

## 7. Indicateurs et seuils
${indicators.map((row) => `- ${row.indicator} : cible ${row.target}, arrêt si ${row.stop}`).join('\n')}

Limites de débit de la plateforme, par point d'accès et par appelant :
${platformLimits.map((row) => `- ${row.endpoint} : ${row.limit}`).join('\n')}

## 8. Arrêt d'urgence
${list(stopConditions)}

## 9. Contrôle de cohérence après charge
${list(consistencyChecks)}

## 10. Nettoyage
${list(cleanupSteps)}

## 11. Compte rendu
${reportTemplate}

## 12. Limites du test
${list(limitations)}

## Annexe — scénario k6
\`\`\`js
${k6Script}
\`\`\`

Exécution :
\`\`\`
${k6RunCommand}
\`\`\`

Manifeste de nettoyage :
\`\`\`
${manifestCommand}
\`\`\`
`;
}