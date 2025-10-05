// import frIntents from '../../data/intents.fr.json' assert { type: 'json' };
// import enIntents from '../../data/intents.en.json' assert { type: 'json' };
// import { IntentResult } from '../utils/types.js';
//
// function matchIntent(text: string, intents: any[]): IntentResult {
//   const lowered = text.toLowerCase();
//   for (const it of intents) {
//     if (it.patterns && it.patterns.some((p: string) => lowered.includes(p.toLowerCase()))) {
//       return { name: it.name, confidence: 0.9, locale: 'fr' };
//     }
//   }
//   return { name: 'inconnu', confidence: 0.2, locale: 'fr' };
// }
//
// export function detectIntent(text: string, locale: string): IntentResult {
//   if (locale === 'en') {
//     return matchIntent(text, (enIntents as any).intents).locale === 'fr'
//       ? { name: 'unknown', confidence: 0.2, locale: 'en' }
//       : matchIntent(text, (enIntents as any).intents);
//   }
//   return matchIntent(text, (frIntents as any).intents);
// }

// src/services/nlpService.ts
import { IntentResult } from '../utils/types.js';
import { getBotData } from './dataService.js';
import { logger } from '../utils/logger.js';

export interface DetectedEntity {
  type: string;
  value: string;
}

export interface ProcessedIntent extends IntentResult {
  entities: DetectedEntity[];
  matchedPattern?: string;
}

// Normalise le texte (minuscules, sans accents)
function normalizeText(text: string): string {
  return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
}

// Vérifie si le texte correspond à un pattern (regex)
function matchesPattern(text: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(text);
  } catch (e) {
    logger.error(`Erreur de regex pour pattern "${pattern}":`, e);
    return false;
  }
}

// Extrait les entités du texte (zones, villes, etc.)
function extractEntities(text: string): DetectedEntity[] {
  const data = getBotData();
  const entities: DetectedEntity[] = [];

  // Pour chaque type d'entité dans le JSON
  for (const [entityType, values] of Object.entries(data.entities)) {
    for (const value of values as string[]) {
      const normalizedValue = normalizeText(value);
      if (normalizeText(text).includes(normalizedValue)) {
        entities.push({ type: entityType, value });
      }
    }
  }

  return entities;
}

// Détecte l'intention principale du message
export function detectIntent(text: string, locale: string): ProcessedIntent {
  const data = getBotData();
  const normalizedText = normalizeText(text);
  const entities = extractEntities(text);

  // Parcourir les intents dans l'ordre de priorité défini
  for (const intentId of data.routing.order) {
    const intent = data.intents.find((i: any) => i.id === intentId);
    if (!intent) continue;

    // Vérifier si un pattern correspond
    for (const pattern of intent.patterns || []) {
      if (matchesPattern(normalizedText, pattern)) {
        return {
          name: intent.id,
          confidence: 0.9,
          locale: locale,
          entities,
          matchedPattern: pattern
        };
      }
    }
  }

  // Aucune correspondance trouvée
  return {
    name: 'fallback_unknown',
    confidence: 0.2,
    locale: locale,
    entities
  };
}
