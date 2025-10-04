import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export async function transcribeAudio(buf: Buffer, locale = 'fr'): Promise<string> {
  if (config.stt.provider === 'none') {
    logger.info('STT disabled. Returning placeholder.');
    return '[Transcription désactivée : configure STT_PROVIDER et STT_API_KEY]';
  }
  if (config.stt.provider === 'whisper') {
    if (!config.stt.apiKey) {
      logger.warn('WHISPER selected but STT_API_KEY missing.');
      return '[Impossible de transcrire : clé API manquante]';
    }
    // Minimal example using OpenAI Whisper v1/audio/transcriptions
    // Note: Keep payload small and handle rate limits in production.
    const form = new FormData();
    const file = new Blob([buf], { type: 'audio/ogg' });
    form.append('file', file, 'audio.ogg');
    form.append('model', 'whisper-1');
    form.append('language', locale.startsWith('fr') ? 'fr' : 'en');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.stt.apiKey}` },
      body: form
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error('Whisper STT failed', res.status, text);
      return '[Erreur transcription]';
    }
    const j = await res.json();
    return j.text || '';
  }
  return '[STT provider inconnu]';
}
