import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import ffmpegPath from 'ffmpeg-static';
import FormData from 'form-data';
import fetch from 'node-fetch';

const execPromise = util.promisify(exec);

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
    // Utilisation de form-data pour Node.js
    const form = new FormData();
    form.append('file', buf, {
      filename: 'audio.ogg',
      contentType: 'audio/ogg'
    });
    form.append('model', 'whisper-1');
    form.append('language', locale.startsWith('fr') ? 'fr' : 'en');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.stt.apiKey}`,
        ...form.getHeaders()
      },
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

  // Fix pour éviter l'erreur "toLowerCase is not a function"
  const provider = typeof config.stt.provider === 'string' ? config.stt.provider.toLowerCase() : '';

  if (provider === 'deepgram') {
    // Implémentation Deepgram
    try {
      logger.debug('Utilisation de Deepgram pour la transcription');

      // Création du dossier temporaire
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      // Chemins des fichiers
      const audioPath = path.join(tempDir, `audio-${Date.now()}.ogg`);
      const wavPath = path.join(tempDir, `audio-${Date.now()}.wav`);

      // Sauvegarde du fichier audio
      fs.writeFileSync(audioPath, buf);

      // Conversion avec ffmpeg
      try {
        await execPromise(`"${ffmpegPath}" -i "${audioPath}" -ar 16000 -ac 1 "${wavPath}"`);
      } catch (e) {
        logger.error('Erreur lors de la conversion ffmpeg:', e);
        return "Erreur de conversion audio.";
      }

      // Lire le fichier comme un Buffer au lieu d'un stream
      const audioBuffer = fs.readFileSync(wavPath);

      // Envoi à l'API Deepgram
      const apiUrl = process.env.SPEECH_API_URL || 'https://api.deepgram.com/v1/listen?language=fr';
      const headers = {
        'Authorization': `Token ${config.stt.apiKey || ''}`,
        'Content-Type': 'audio/wav'
      };

      // Utilisation du buffer directement pour corriger l'erreur de compatibilité
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: audioBuffer,
        headers: headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Erreur API: ${response.status} - ${errorText}`);
        return `Erreur du service de transcription (${response.status})`;
      }

      // Traitement de la réponse
      const result = await response.json();

      // Nettoyage des fichiers
      try {
        fs.unlinkSync(audioPath);
        fs.unlinkSync(wavPath);
      } catch (e) {
        logger.warn('Erreur lors de la suppression des fichiers temporaires', e);
      }

      // Extraction de la transcription au format Deepgram
      const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
      return transcript;

    } catch (error) {
      logger.error('Erreur globale dans la transcription audio:', error);
      return 'Erreur lors de la transcription audio';
    }
  }

  return '[STT provider inconnu]';
}
