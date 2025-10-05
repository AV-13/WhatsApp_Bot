// src/services/audioService.ts
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import util from 'util';
import { logger } from '../utils/logger.js';
import ffmpegPath from 'ffmpeg-static';

const execPromise = util.promisify(exec);

export async function transcribeAudio(buffer: Buffer): Promise<string> {
    try {
        logger.debug('Début de la transcription audio');
        logger.debug(`Taille du buffer audio reçu: ${buffer.length} octets`);

        // Débug des variables d'environnement
        logger.debug(`STT_PROVIDER: ${process.env.STT_PROVIDER}`);
        logger.debug(`STT_API_KEY: ${process.env.STT_API_KEY ? 'Défini' : 'Non défini'}`);
        logger.debug(`SPEECH_API_URL: ${process.env.SPEECH_API_URL}`);

        // Création du dossier temporaire
        const tempDir = path.join(process.cwd(), 'temp');
        logger.debug(`Vérification du dossier temporaire: ${tempDir}`);
        if (!fs.existsSync(tempDir)) {
            logger.debug('Dossier temporaire inexistant, création...');
            fs.mkdirSync(tempDir);
            logger.debug('Dossier temporaire créé avec succès');
        }

        // Génération des chemins de fichiers
        const audioPath = path.join(tempDir, `audio-${Date.now()}.ogg`);
        const wavPath = path.join(tempDir, `audio-${Date.now()}.wav`);
        logger.debug(`Fichier audio original: ${audioPath}`);
        logger.debug(`Fichier WAV de sortie: ${wavPath}`);

        // Sauvegarde du fichier audio
        logger.debug('Sauvegarde du buffer en fichier audio...');
        fs.writeFileSync(audioPath, buffer);
        logger.debug('Fichier audio sauvegardé avec succès');

        // Conversion avec ffmpeg
        logger.debug('Début de la conversion avec ffmpeg');
        try {
            const ffmpegCommand = `"${ffmpegPath}" -i "${audioPath}" -ar 16000 -ac 1 "${wavPath}"`;
            logger.debug(`Commande ffmpeg: ${ffmpegCommand}`);

            const { stdout, stderr } = await execPromise(ffmpegCommand);
            if (stderr) {
                logger.debug(`Messages ffmpeg stderr: ${stderr}`);
            }
            logger.debug('Conversion audio réussie');
        } catch (e) {
            logger.error('Erreur lors de la conversion ffmpeg:', e);
            return "Erreur de conversion audio. Vérifiez que ffmpeg est installé correctement.";
        }

        // Vérification que le fichier WAV existe
        if (!fs.existsSync(wavPath)) {
            logger.error('Le fichier WAV n\'a pas été créé correctement');
            return "Erreur: le fichier audio converti n'a pas été trouvé";
        }

        // Statistiques du fichier
        const stats = fs.statSync(wavPath);
        logger.debug(`Fichier WAV généré - Taille: ${stats.size} octets`);

        // Préparation de la requête API
        logger.debug('Préparation de la requête API');
        const apiUrl = process.env.SPEECH_API_URL || 'https://api.deepgram.com/v1/listen?language=fr';
        const provider = process.env.STT_PROVIDER || 'fallback_unknown';

        logger.debug(`Utilisation du fournisseur STT: ${provider}`);

        // Configuration des en-têtes pour Deepgram
        const headers: Record<string, string> = {
            'Authorization': `Token ${process.env.STT_API_KEY || ''}`,
            'Content-Type': 'audio/wav'
        };

        logger.debug('Envoi à l\'API STT');
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: fs.createReadStream(wavPath),
            headers: headers
        });

        logger.debug(`Statut de réponse: ${response.status}`);
        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Erreur API: ${response.status} - ${errorText}`);
            return `Erreur du service de transcription (${response.status})`;
        }

        // Traitement de la réponse
        logger.debug('Analyse de la réponse JSON');
        const result = await response.json();
        logger.debug(`Réponse API reçue: ${JSON.stringify(result)}`);

        // Nettoyage des fichiers
        logger.debug('Nettoyage des fichiers temporaires');
        try {
            fs.unlinkSync(audioPath);
            fs.unlinkSync(wavPath);
            logger.debug('Fichiers temporaires supprimés avec succès');
        } catch (e) {
            logger.warn('Erreur lors de la suppression des fichiers temporaires', e);
        }

        // Extraction du texte transcrit selon le format Deepgram
        let transcript = '';
        if (provider.toLowerCase() === 'deepgram') {
            // Format spécifique à Deepgram
            transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
            logger.debug(`Extraction du transcript avec format Deepgram: "${transcript}"`);
        } else {
            // Format générique pour d'autres fournisseurs
            transcript = result.transcript || result.results?.[0]?.alternatives?.[0]?.transcript || '';
            logger.debug(`Extraction du transcript avec format générique: "${transcript}"`);
        }

        logger.debug(`Transcription finale: "${transcript}"`);
        return transcript;
    } catch (error) {
        logger.error('Erreur globale dans la transcription audio:', error);
        return 'Erreur lors de la transcription audio';
    }
}
