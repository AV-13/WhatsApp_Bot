import express from 'express';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { sendText, getMediaUrl } from './services/whatsappClient.js';
import { downloadMedia } from './services/mediaService.js';
import { transcribeAudio } from './services/sttService.js';
import { detectLocale } from './services/i18n.js';
import { loadBotData } from './services/dataService.js';
import { detectIntent } from './services/nlp.js';
import { getResponseForIntent } from './services/responseService.js';
import { analyzeImage } from './services/imageService.js';
import { getPriceForZone } from './services/dataService.js';

export const router = express.Router();

export async function initializeBot() {
  await loadBotData();
  logger.info('Bot initialisé avec succès');
}

// GET /webhook — verification pour Meta (hub.challenge)
router.get('/', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (token === config.whatsapp.verifyToken && challenge) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// POST /webhook — messages entrants
router.post('/', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const messages = entry?.messages || [];

    for (const m of messages) {
      const from = m.from;
      let locale = 'fr';

      try {
        if (m.type === 'text') {
          // Traitement des messages texte
          const text = m.text?.body || '';
          locale = detectLocale(text);
          await processUserMessage(text, from, locale);
        }
        else if (m.type === 'audio' || m.type === 'voice') {
          // Traitement des messages audio
          const mediaId = m.audio?.id || m.voice?.id;
          if (mediaId) {
            const url = await getMediaUrl(mediaId);
            const buf = await downloadMedia(url);
            const transcript = await transcribeAudio(buf, locale);

            // Première partie: montrer la transcription à l'utilisateur
            await sendText(from, `🎤 *Transcription*: "${transcript}"`);

            // Deuxième partie: traiter la transcription comme un message texte
            await processUserMessage(transcript, from, locale, false);

            logger.info(`Sent text to ${from}`);
          } else {
            await sendText(from, 'Audio reçu, mais sans média utilisable.');
          }
        }
        else if (m.type === 'image') {
          const mediaId = m.image?.id;
          if (mediaId) {
            try {
              const url = await getMediaUrl(mediaId);
              const imageBuffer = await downloadMedia(url);

              logger.debug('Image téléchargée, début de l\'analyse avec TensorFlow');

              const imageAnalysis = await analyzeImage(imageBuffer);
              console.log("imageAnalysis", imageAnalysis);
              if (imageAnalysis.bodyParts.length > 0) {
                const bodyPart = imageAnalysis.mainBodyPart || imageAnalysis.bodyParts[0];
                const prix = getPriceForZone(bodyPart);
                const confidence = imageAnalysis.confidence.toFixed(2);

                logger.debug(`Zone identifiée: ${bodyPart}, confiance: ${confidence}%, prix: ${prix}€`);

                if (prix > 0) {
                  // Envoyer une réponse personnalisée avec les tarifs et le niveau de confiance
                  await sendText(
                      from,
                      `J'ai analysé votre image et identifié la zone *${bodyPart}* (confiance: ${confidence}%).\n\nPour cette zone, le tarif est de *${prix}€* par séance.\n\nSouhaitez-vous plus d'informations sur cette prestation ?`
                  );
                } else {
                  await sendText(
                      from,
                      `J'ai identifié la zone *${bodyPart}* sur votre image (confiance: ${confidence}%), mais je n'ai pas de tarif associé. Pouvez-vous préciser votre demande ?`
                  );
                }
              } else {
                await sendText(
                    from,
                    'Je n\'ai pas pu identifier de zone corporelle sur cette image. Pourriez-vous m\'envoyer une autre photo ou me décrire votre demande ?'
                );
              }
            } catch (e) {
              logger.error('Erreur lors de l\'analyse d\'image avec TensorFlow:', e);
              await sendText(
                  from,
                  'Désolé, je n\'ai pas pu analyser cette image. Notre système d\'analyse est en cours d\'optimisation. Pourriez-vous décrire votre demande par message ?'
              );
            }
          } else {
            await sendText(from, 'Image bien reçue 👍 (pas de média utilisable).');
          }
        }
        else {
          await sendText(from, 'Message reçu. Pour l\'instant, je gère surtout texte, images et audio.');
        }
      } catch (e:any) {
        logger.error('Failed handling message', e?.message || e);
        await sendText(from, 'Oups, une erreur est survenue. Réessaie plus tard 🛠️');
      }
    }

    res.sendStatus(200);
  } catch (e:any) {
    logger.error('Webhook error', e?.message || e);
    res.sendStatus(200); // Toujours 200 pour éviter les tempêtes de retentatives
  }
});

/**
 * Traite le message de l'utilisateur (texte ou transcription audio)
 * @param text Le texte à traiter
 * @param from Le numéro de l'expéditeur
 * @param locale La locale à utiliser
 * @param showTranscription Indique s'il faut afficher le message transcrit dans la réponse
 */
async function processUserMessage(text: string, from: string, locale: string, showTranscription = true) {
  // Analyse de l'intention
  const processedIntent = detectIntent(text, locale);

  // Génération de la réponse basée sur l'intent
  const response = getResponseForIntent(processedIntent);

  // Envoi de la réponse
  await sendText(from, response.template);

  // Log des quick replies si disponibles
  if (response.quickReplies && response.quickReplies.length > 0) {
    logger.info(`Quick replies disponibles: ${response.quickReplies.join(', ')}`);
  }
}
