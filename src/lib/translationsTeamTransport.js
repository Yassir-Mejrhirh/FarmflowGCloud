// Transport des équipes dans la liste MO : bouton dédié à côté du taux équipe, qui
// signale les équipes dont le transport n'est pas uniforme et propose le transporteur
// majoritaire pour les membres divergents ou sans transport.
export const TEAM_TRANSPORT_TRANSLATIONS = {
  fr: {
    'wtr.teamBtn': 'Transport équipes',
    'wtr.teamTitle': 'Transport des équipes',
    'wtr.teamDesc':
      'Tous les ouvriers d’une équipe doivent avoir le même transporteur. Les équipes ci-dessous présentent des ouvriers sans transport ou portés par un transporteur différent ; le transport retenu est celui de la majorité de l’équipe.',
    'wtr.teams': '{n} équipe(s)',
    'wtr.reasonMissing': '{n} sans transport',
    'wtr.reasonDivergent': '{n} transporteur différent',
    'wtr.affected': 'À corriger : {names}',
    'wtr.noConfig': 'Aucun transport paramétré pour cette équipe',
    'wtr.manualBtn': 'Attribuer un transport',
    'wtr.transporter': 'Transporteur',
    'wtr.mode': 'Mode',
    'wtr.rate': 'Tarif / jour',
    'wtr.manualHint': 'Transport appliqué aux {n} ouvrier(s) de cette équipe, enregistré à la date du jour.',
    'wtr.proposed': 'Transport retenu',
    'wtr.apply': 'Uniformiser le transport ({n})',
    'wtr.empty': 'Toutes les équipes ont le même transporteur et un transport configuré.',
    'wtr.doneTitle': 'Transport uniformisé',
    'wtr.done': '{n} ouvrier(s) mis à jour',
    'wtr.doneTeams': 'Équipes : {teams}',
  },
  ar: {
    'wtr.teamBtn': 'نقل الفرق',
    'wtr.teamTitle': 'نقل الفرق',
    'wtr.teamDesc':
      'يجب أن يكون لكل عمال الفريق نفس الناقل. الفرق التالية بها عمال بدون نقل أو بناقل مختلف ؛ يُعتمد نقل أغلبية الفريق.',
    'wtr.teams': '{n} فريق',
    'wtr.reasonMissing': '{n} بدون نقل',
    'wtr.reasonDivergent': '{n} بناقل مختلف',
    'wtr.affected': 'للتصحيح : {names}',
    'wtr.noConfig': 'لا يوجد نقل محدد لهذا الفريق',
    'wtr.manualBtn': 'إسناد نقل',
    'wtr.transporter': 'الناقل',
    'wtr.mode': 'الطريقة',
    'wtr.rate': 'السعر / يوم',
    'wtr.manualHint': 'يُطبَّق النقل على {n} عامل من هذا الفريق ويُسجَّل بتاريخ اليوم.',
    'wtr.proposed': 'النقل المعتمد',
    'wtr.apply': 'توحيد النقل ({n})',
    'wtr.empty': 'كل الفرق لديها نفس الناقل ونقل محدد.',
    'wtr.doneTitle': 'تم توحيد النقل',
    'wtr.done': '{n} عامل تم تحديثه',
    'wtr.doneTeams': 'الفرق : {teams}',
  },
};