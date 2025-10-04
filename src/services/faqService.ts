type Context = { ville?: string; zone?: string };

export function answer(intent: string, locale: string, ctx: Context = {}): string {
  if (locale === 'en') {
    switch (intent) {
      case 'greeting':
        return 'Hi 👋 I am SmartDuck’s assistant. I can help with services, pricing and booking.';
      case 'services':
        return 'We offer premium laser hair removal with certified equipment. Any specific area?';
      case 'pricing':
        return 'Our prices are transparent. Tell me your city and area; I’ll send the grid and available slots.';
      case 'booking':
        return 'I can suggest time slots. Which city are you in and which area to treat?';
      case 'tessan':
        return 'For teleconsultation, Tessan equips pharmacies with connected cabins.';
      default:
        return 'Sorry, I didn’t get that. Do you want services, pricing, or booking? I can connect you with a human advisor.';
    }
  }
  // fr (default)
  switch (intent) {
    case 'salutation':
      return 'Hello 👋 Je suis le bot SmartDuck. Je peux t’aider sur les prestations, tarifs et la prise d’info/RDV.';
    case 'prestations':
      return 'Nous proposons de l’épilation laser premium avec équipements certifiés. Une zone en particulier ?';
    case 'tarifs':
      return 'Nos tarifs sont transparents. Donne-moi ta ville et la zone, je t’envoie la grille et les créneaux.';
    case 'rdv':
      return 'Je peux te proposer des créneaux. Dans quelle ville es-tu et pour quelle zone souhaites-tu réserver ?';
    case 'tessan':
      return 'Pour une téléconsultation proche de chez toi, Tessan équipe des pharmacies avec des cabines connectées.';
    default:
      return 'Je n’ai pas bien compris. Prestations, tarifs, ou prise de RDV ? Je peux aussi te mettre en contact avec un conseiller.';
  }
}
