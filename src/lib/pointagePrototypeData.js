// Données de démonstration du prototype de pointage mobile.
// Aucune de ces valeurs ne provient de FarmFlow : sites et ouvriers sont fictifs.

export const DEMO_SITES = [
  { id: 'site-mnabha', name: 'Ferme Mnabha — Forage 3', code: 'MN-3', area: 'Doukkala' },
  { id: 'site-bouaziz', name: 'Ferme Ouled Bouaziz', code: 'OB-1', area: 'Chaouia' },
  { id: 'site-bennour', name: 'Ferme Sidi Bennour', code: 'SB-2', area: 'Doukkala' },
];

export const DEMO_WORKERS = [
  { id: 'w-1', siteId: 'site-mnabha', name: 'محمد أيت علي', latin: 'Mohamed Ait Ali', worker_function: 'Irrigueur', team: 'Équipe A' },
  { id: 'w-2', siteId: 'site-mnabha', name: 'فاطمة الزهراء بناني', latin: 'Fatima Zahra Bennani', worker_function: 'Récolte', team: 'Équipe A' },
  { id: 'w-3', siteId: 'site-mnabha', name: 'رشيد الودغيري', latin: 'Rachid Ouldghiri', worker_function: 'Tractoriste', team: 'Équipe B' },
  { id: 'w-4', siteId: 'site-mnabha', name: 'خديجة العلمي', latin: 'Khadija Alami', worker_function: 'Récolte', team: 'Équipe B' },
  { id: 'w-5', siteId: 'site-mnabha', name: 'يوسف بلمهدي', latin: 'Youssef Belmehdi', worker_function: 'Manutention', team: 'Équipe C' },
  { id: 'w-6', siteId: 'site-mnabha', name: 'حسناء السباعي', latin: 'Hasnaa Sebai', worker_function: 'Récolte', team: 'Équipe C' },
  { id: 'w-7', siteId: 'site-mnabha', name: 'عبد الله شكري', latin: 'Abdellah Choukri', worker_function: 'Irrigation', team: '' },
  { id: 'w-8', siteId: 'site-mnabha', name: 'سعاد بنعيسى', latin: 'Souad Benissa', worker_function: 'Récolte', team: 'Équipe A' },

  { id: 'w-9', siteId: 'site-bouaziz', name: 'مصطفى الحمدي', latin: 'Mustapha Hamdi', worker_function: 'Tractoriste', team: 'Équipe A' },
  { id: 'w-10', siteId: 'site-bouaziz', name: 'نعيمة بوكرين', latin: 'Naima Boukrine', worker_function: 'Récolte', team: 'Équipe A' },
  { id: 'w-11', siteId: 'site-bouaziz', name: 'كريم الإدريسي', latin: 'Karim Idrissi', worker_function: 'Irrigation', team: 'Équipe B' },
  { id: 'w-12', siteId: 'site-bouaziz', name: 'زينب الرامي', latin: 'Zineb Rami', worker_function: 'Manutention', team: 'Équipe B' },
  { id: 'w-13', siteId: 'site-bouaziz', name: 'عمر الفاسي', latin: 'Omar Fassi', worker_function: 'Récolte', team: '' },

  { id: 'w-14', siteId: 'site-bennour', name: 'إبراهيم الناصري', latin: 'Ibrahim Nassiri', worker_function: 'Tractoriste', team: 'Équipe A' },
  { id: 'w-15', siteId: 'site-bennour', name: 'مريم بوعزة', latin: 'Meriem Bouazza', worker_function: 'Récolte', team: 'Équipe A' },
  { id: 'w-16', siteId: 'site-bennour', name: 'طارق بلحاج', latin: 'Tarik Belhaj', worker_function: 'Irrigation', team: 'Équipe B' },
  { id: 'w-17', siteId: 'site-bennour', name: 'ليلى الشرقاوي', latin: 'Leila Charkaoui', worker_function: 'Manutention', team: 'Équipe B' },
];

export const DEMO_FUNCTIONS = ['Récolte', 'Irrigation', 'Irrigueur', 'Tractoriste', 'Manutention'];

export const VOICE_EXAMPLES = [
  'محمد حاضر',
  'رشيد غايب',
  'قلب على فاطمة',
  'زيد عامل جديد',
];