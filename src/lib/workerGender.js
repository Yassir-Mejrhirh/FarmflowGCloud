// Sexe déduit du prénom d'une personne MO : deux listes de prénoms usuels — français
// et marocains, en lettres latines et en arabe — puis une règle de repli sur la
// terminaison. Un prénom contradictoire ou inconnu reste neutre : mieux vaut aucune
// couleur qu'une couleur fausse.

const MALE = new Set([
  // Marocains, lettres latines
  'mohamed', 'mohammed', 'mohammad', 'muhammed', 'hamid', 'ahmed', 'ahmad', 'mustapha',
  'mostapha', 'youssef', 'youcef', 'yusuf', 'abdelilah', 'abdellah', 'abdella', 'abdellatif',
  'abderrahim', 'abderrahmane', 'abderrahman', 'abdeslam', 'abdelkader', 'abdelkarim',
  'abdelkrim', 'abdelaziz', 'abdelhak', 'abdelmajid', 'abdelali', 'abdelghani', 'abdelhamid',
  'abdelouahed', 'abdelsamad', 'abderrazak', 'abderrezak', 'aboubakr', 'adil', 'adel', 'amine',
  'anas', 'anass', 'anouar', 'ayoub', 'aziz', 'badr', 'bilal', 'brahim', 'driss', 'mehdi',
  'elmehdi', 'fouad', 'hachem', 'hachim', 'hamza', 'hassan', 'hicham', 'hilal', 'houcine',
  'houcin', 'idriss', 'ilyas', 'ilias', 'imad', 'ismail', 'jamal', 'kamal', 'karim', 'khalid',
  'khalil', 'lahoucine', 'lahcen', 'larbi', 'laarbi', 'mahjoub', 'majid', 'malek', 'marouane',
  'mbarek', 'miloud', 'moha', 'mokhtar', 'moulay', 'mounir', 'moussa', 'nabil', 'noureddine',
  'nourddine', 'omar', 'ossama', 'oussama', 'othmane', 'othman', 'rachid', 'reda', 'redouane',
  'said', 'salah', 'salahdine', 'samir', 'sami', 'sifeddine', 'sofiane', 'soufiane', 'soufyan',
  'tarek', 'tarik', 'taha', 'yahya', 'yassine', 'yassin', 'yassir', 'yasser', 'younes', 'younis',
  'zakaria', 'zakariya', 'zineddine', 'issa', 'aissa', 'hmida', 'bouchta', 'kacem', 'kasem',
  'abdellah', 'mourad', 'mouad', 'moad', 'naoufal', 'nawfal', 'noufal', 'amine', 'aymane',
  'aiman', 'ayman', 'ilyass', 'marwan', 'mouhsine', 'muhsin', 'yassine', 'zakaria', 'zouhair',
  'zouhir', 'hassane', 'hassan', 'bakr', 'hassan', 'mehdi', 'yahia', 'abdellah', 'jilali',
  'jallal', 'jalal', 'azddine', 'ezzine', 'hassan', 'lhassan', 'hassan', 'mouhammed', 'brahim',
  'salah', 'abdelhakim', 'hakim', 'hicham', 'anouar', 'idrissi', 'amine', 'youness',
  'yuness', 'abdelatif', 'abdelattif', 'abdelftah', 'abdelmoula', 'abderzak', 'mbarak',
  'lhssan', 'lhassan', 'hassan', 'abdeslam', 'abderahmane', 'said', 'mohamed', 'youssef',
  'soufian', 'mahdi', 'nourdine', 'abdelkabir', 'abdesadek', 'abdessalam', 'abrrahim',
  'elhoussine', 'abdelmoumen', 'abdelouahab', 'mouhcine', 'rachid', 'yassir', 'zouhir',
  // Français
  'jean', 'pierre', 'paul', 'michel', 'andre', 'jacques', 'rene', 'marcel', 'francois', 'julien',
  'thomas', 'nicolas', 'alexandre', 'sebastien', 'vincent', 'olivier', 'laurent', 'christophe',
  'guillaume', 'maxime', 'antoine', 'hugo', 'lucas', 'theo', 'gabriel', 'louis', 'arthur',
  'jules', 'leo', 'nathan', 'enzo', 'mathis', 'baptiste', 'clement', 'remi', 'benjamin',
  'damien', 'fabien', 'gregory', 'jerome', 'cedric', 'david', 'daniel', 'eric', 'patrick',
  'philippe', 'bernard', 'gerard', 'henri', 'robert', 'roger', 'serge', 'sylvain', 'thierry',
  'xavier', 'yves', 'alain', 'bruno', 'didier', 'emmanuel', 'herve', 'lionel', 'ludovic',
  'matthieu', 'pascal', 'raymond', 'regis', 'stephane', 'teddy', 'valentin', 'wilfried',
  'yannick', 'adrien', 'axel', 'corentin', 'bastien', 'franck', 'loic', 'mickael', 'romain',
  'sylvain', 'fabrice', 'gilles', 'gisles', 'lucien', 'marc', 'mathieu', 'norbert', 'patrice',
  'raphael', 'samuel', 'simon', 'victor', 'william', 'yohan', 'abdel', 'adama', 'koffi',
  // Prénoms arabes en arabe
  'محمد', 'أحمد', 'يوسف', 'حسن', 'الحسين', 'الحسن', 'عمر', 'علي', 'رشيد', 'سعيد', 'خالد',
  'إبراهيم', 'مصطفى', 'عبدالله', 'عبد', 'الله', 'الرحيم', 'السلام', 'القادر', 'العزيز',
  'الحكيم', 'المجيد', 'الغني', 'حمزة', 'مهدي', 'أيوب', 'أنس', 'ياسين', 'يونس', 'زكرياء',
  'كريم', 'سمير', 'جمال', 'كمال', 'نور', 'الدين', 'عز', 'رضى', 'ياسر', 'سفيان', 'منير',
  'طارق', 'بدر', 'أنور', 'عزيز', 'لحسن', 'امبارك', 'مولاي', 'إسماعيل', 'هشام', 'نبيل',
  'فؤاد', 'بلال', 'إلياس', 'عثمان', 'مروان', 'أمين', 'جلال', 'عادل', 'حميد', 'عبدالرحيم',
]);

const FEMALE = new Set([
  // Marocaines, lettres latines
  'fatima', 'fatimzahra', 'fatima', 'khadija', 'khadidja', 'aicha', 'aich', 'amina', 'amira',
  'zineb', 'zainab', 'zaynab', 'zeinab', 'zoubida', 'latifa', 'saadia', 'malika', 'rachida',
  'naima', 'hafida', 'bouchra', 'samira', 'karima', 'hanane', 'hanan', 'nabila', 'souad',
  'wafaa', 'wafa', 'imane', 'iman', 'ghizlane', 'ghizlan', 'chaimae', 'chaima', 'shaima',
  'salma', 'hind', 'ihsane', 'ihsan', 'sanae', 'sana', 'sanaa', 'loubna', 'lubna', 'asmae',
  'asma', 'asmaa', 'meryem', 'meriem', 'meryam', 'mariam', 'maryam', 'ahlam', 'jamila',
  'zahra', 'habiba', 'rkia', 'rquia', 'keltoum', 'kalthoum', 'kalloum', 'mina', 'touria',
  'najat', 'fouzia', 'naoual', 'nawal', 'houda', 'safaa', 'safa', 'oumaima', 'oumayma',
  'hajar', 'ikram', 'yasmine', 'yasmina', 'sara', 'sarah', 'nada', 'rim', 'rym', 'amal',
  'siham', 'seham', 'soukaina', 'nassima', 'farida', 'bahia', 'kenza', 'nazha', 'zohra',
  'zouhra', 'najia', 'raja', 'rajaa', 'sabah', 'salima', 'hakima', 'halima', 'hlima',
  'mbarka', 'mabrouka', 'rahma', 'huria', 'hourria', 'hassania', 'joumana', 'kawtar',
  'kaoutar', 'madiha', 'majda', 'malak', 'mouna', 'moumina', 'nadia', 'nadira', 'najla',
  'nesrine', 'nihad', 'nora', 'noura', 'rabia', 'radia', 'safia', 'sahra', 'saida', 'samia',
  'saoussen', 'soumaya', 'sumaya', 'warda', 'yamina', 'youmna', 'zahia', 'zoulikha', 'atika',
  'aziza', 'chadia', 'dalal', 'dounia', 'douae', 'dana', 'fadwa', 'farah', 'fatiha', 'ghita',
  'hafsa', 'hasna', 'hawa', 'ilham', 'inass', 'khaoula', 'lamia', 'lina', 'linda', 'magda',
  'marwa', 'mounia', 'nahid', 'nazik', 'ouissal', 'razane', 'sabrina', 'saliha', 'samah',
  'sonia', 'soumia', 'tahani', 'zahira', 'zaina', 'khansa', 'hannae', 'ikrame', 'ibtissam',
  'ibtisam', 'hanifa', 'raouya', 'rachida', 'soraya', 'naouar', 'nour', 'jamila', 'moufida',
  // Françaises
  'marie', 'claire', 'sophie', 'julie', 'camille', 'emilie', 'nathalie', 'celine', 'isabelle',
  'anne', 'helene', 'chloe', 'lea', 'laura', 'manon', 'oceane', 'aurelie', 'valerie',
  'sandrine', 'corinne', 'veronique', 'brigitte', 'monique', 'josiane', 'christine',
  'valentine', 'elodie', 'caroline', 'charlotte', 'clara', 'juliette', 'justine', 'margaux',
  'marion', 'melanie', 'morgane', 'pauline', 'romane', 'solene', 'virginie', 'audrey',
  'delphine', 'estelle', 'fanny', 'gaelle', 'laetitia', 'lise', 'lucie', 'mathilde', 'maud',
  'noemie', 'sabine', 'severine', 'stephanie', 'sylvie', 'vanessa', 'amelie', 'axelle',
  'berenice', 'clemence', 'constance', 'diane', 'eleonore', 'eloise', 'ines', 'jeanne',
  'judith', 'laure', 'lila', 'lola', 'louise', 'lydia', 'madeleine', 'margot', 'mia', 'nina',
  'rose', 'salome', 'tatiana', 'therese', 'victoire', 'zoe', 'awa', 'fatou', 'aissatou',
  // Prénoms arabes en arabe
  'فاطمة', 'خديجة', 'عائشة', 'أمينة', 'زينب', 'زبيدة', 'لطيفة', 'سعيدة', 'مليكة', 'رشيدة',
  'نعيمة', 'حفيظة', 'بشرى', 'سميرة', 'كريمة', 'حنان', 'نبيلة', 'سعاد', 'وفاء', 'إيمان',
  'غزلان', 'شيماء', 'سلمى', 'هند', 'إحسان', 'سناء', 'لبنى', 'أسماء', 'مريم', 'أحلام',
  'جميلة', 'زهرة', 'حبيبة', 'رقية', 'كلثوم', 'مينة', 'ثريا', 'نجاة', 'فوزية', 'نوال',
  'هدى', 'صفاء', 'أميمة', 'هاجر', 'إكرام', 'ياسمين', 'سارة', 'ندى', 'ريم', 'آمال',
  'سهام', 'سكينة', 'نسيمة', 'فريدة', 'بهية', 'كنزة', 'نزهة', 'ناجية', 'رجاء', 'صباح',
  'سليمة', 'حكيمة', 'حليمة', 'مبروكة', 'رحمة', 'حورية', 'حسنية', 'جوهرة', 'كوثر', 'مديحة',
  'ماجدة', 'ملاك', 'منى', 'مؤمنة', 'نادية', 'نادرة', 'نجلاء', 'نسرين', 'نهاد', 'نورة',
  'ربيعة', 'راضية', 'صافية', 'سمية', 'وردة', 'يامنة', 'يومنة', 'زاهية', 'زليخة', 'دنيا',
  'دعاء', 'فدوى', 'فرح', 'فتيحة', 'غيثة', 'حفصة', 'حسناء', 'حواء', 'إلهام', 'خولة',
  'لمياء', 'لينا', 'مروة', 'رزان', 'صابرين', 'صليحة', 'سماح', 'سونيا', 'تهاني',
]);

// Un prénom coupé en mots : « Fatima Zahra », « Mohamed Amine », « عبد الرحيم ».
export const nameTokens = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\u0600-\u06ff]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1);

// « male », « female », ou une chaîne vide quand rien n'est certain. Le premier mot
// est le prénom ; le suivant n'est lu que pour les prénoms composés (« Abdel Rahmane »).
export function detectGender(value) {
  const tokens = nameTokens(value);
  if (!tokens.length) return '';

  const [first, second] = tokens;
  if (MALE.has(first)) return 'male';
  if (FEMALE.has(first)) return 'female';

  // Repli : un prénom qui finit par « a » est presque toujours féminin.
  if (first.length > 3 && first.endsWith('a')) return 'female';

  if (second && MALE.has(second)) return 'male';
  if (second && FEMALE.has(second)) return 'female';
  return '';
}