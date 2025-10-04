import express from 'express';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { sendText, getMediaUrl } from './services/whatsappClient.js';
import { downloadMedia } from './services/mediaService.js';
import { transcribeAudio } from './services/sttService.js';
import { detectLocale } from './services/i18n.js';
import { detectIntent } from './services/nlp.js';

export const router = express.Router();

// GET /webhook — verification for Meta (hub.challenge)
router.get('/', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (token === config.whatsapp.verifyToken && challenge) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// POST /webhook — incoming messages
router.post('/', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const messages = entry?.messages || [];
    for (const m of messages) {
      const from = m.from;
      let locale = 'fr';
      try {
        if (m.type === 'text') {
          const text = m.text?.body || '';
          locale = detectLocale(text);
          const intent = detectIntent(text, locale);
          await sendText(from, intent.locale === 'en' ? 'Hi 👋 how can I help you?' : 'Hello 👋 comment puis-je aider ?');
        } else if (m.type === 'audio' || m.type === 'voice') {
          const mediaId = m.audio?.id || m.voice?.id;
          if (mediaId) {
            const url = await getMediaUrl(mediaId);
            const buf = await downloadMedia(url);
            const transcript = await transcribeAudio(buf, locale);
            const intent = detectIntent(transcript, locale);
            await sendText(from, `Transcription: ${transcript}\n— ${intent.name}`);
          } else {
            await sendText(from, 'Audio reçu, mais sans média utilisable.');
          }
        } else if (m.type === 'image') {
          await sendText(from, 'Image bien reçue 👍 (pas d’analyse automatique).');
        } else {
          await sendText(from, 'Message reçu. Pour l’instant, je gère surtout texte, images et audio.');
        }
      } catch (e:any) {
        logger.error('Failed handling message', e?.message || e);
        await sendText(from, 'Oups, une erreur est survenue. Réessaie plus tard 🛠️');
      }
    }
    res.sendStatus(200);
  } catch (e:any) {
    logger.error('Webhook error', e?.message || e);
    res.sendStatus(200); // Always 200 to avoid retries storm; log the error
  }
});
