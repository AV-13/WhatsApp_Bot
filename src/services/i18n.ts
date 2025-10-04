import { config } from '../config.js';

export function detectLocale(text?: string): string {
  if (!text) return config.i18n.defaultLocale;
  const frHints = /\b(bonjour|salut|merci|svp|tarif|rdv|rendez-vous)\b/i;
  return frHints.test(text) ? 'fr' : 'en';
}
