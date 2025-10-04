import frIntents from '../../data/intents.fr.json' assert { type: 'json' };
import enIntents from '../../data/intents.en.json' assert { type: 'json' };
import { IntentResult } from '../utils/types.js';

function matchIntent(text: string, intents: any[]): IntentResult {
  const lowered = text.toLowerCase();
  for (const it of intents) {
    if (it.patterns && it.patterns.some((p: string) => lowered.includes(p.toLowerCase()))) {
      return { name: it.name, confidence: 0.9, locale: 'fr' };
    }
  }
  return { name: 'inconnu', confidence: 0.2, locale: 'fr' };
}

export function detectIntent(text: string, locale: string): IntentResult {
  if (locale === 'en') {
    return matchIntent(text, (enIntents as any).intents).locale === 'fr'
      ? { name: 'unknown', confidence: 0.2, locale: 'en' }
      : matchIntent(text, (enIntents as any).intents);
  }
  return matchIntent(text, (frIntents as any).intents);
}
