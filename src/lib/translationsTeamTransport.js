// Transport des équipes dans la liste MO : bouton dédié à côté du taux équipe, qui
// propose d'affecter aux ouvriers sans transport le transport déjà paramétré pour
// leur équipe.
export const TEAM_TRANSPORT_TRANSLATIONS = {
  fr: {
    'wtr.teamBtn': 'Transport équipes',
    'wtr.teamTitle': 'Transport des équipes',
    'wtr.teamDesc':
      'Équipes dont certains ouvriers n’ont pas de transport. Confirmez pour leur affecter le transporteur et le tarif déjà paramétrés pour leur équipe.',
    'wtr.teams': '{n} équipe(s)',
    'wtr.members': '{n} sans transport sur {total}',
    'wtr.noConfig': 'Aucun transport paramétré pour cette équipe',
    'wtr.apply': 'Affecter le transport ({n})',
    'wtr.empty': 'Toutes les équipes ont un transport configuré.',
    'wtr.done': 'Transport affecté à {n} ouvrier(s).',
  },
  ar: {
    'wtr.teamBtn': 'نقل الفرق',
    'wtr.teamTitle': 'نقل الفرق',
    'wtr.teamDesc':
      'فرق بعض عمالها بدون نقل. أكّد لمنحهم الناقل والتسعيرة المحددة لفريقهم.',
    'wtr.teams': '{n} فريق',
    'wtr.members': '{n} بدون نقل من {total}',
    'wtr.noConfig': 'لا يوجد نقل محدد لهذا الفريق',
    'wtr.apply': 'منح النقل ({n})',
    'wtr.empty': 'كل الفرق لديها نقل محدد.',
    'wtr.done': 'تم منح النقل لـ {n} عامل.',
  },
};