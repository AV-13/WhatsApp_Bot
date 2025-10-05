// src/services/imageService.ts
import { logger } from '../utils/logger.js';

// Interface pour les résultats d'analyse
export interface ImageAnalysisResult {
    bodyParts: string[];
    confidence: number;
    mainBodyPart: string | null;
}

// Mapping des segments BodyPix vers les zones du bot
const bodyPartMapping: Record<string, string> = {
    'left_face': 'visage',
    'right_face': 'visage',
    'left_upper_arm': 'bras complets',
    'right_upper_arm': 'bras complets',
    'left_lower_arm': 'avant-bras',
    'right_lower_arm': 'avant-bras',
    'left_upper_leg': 'jambes complètes',
    'right_upper_leg': 'jambes complètes',
    'left_lower_leg': 'demi-jambes',
    'right_lower_leg': 'demi-jambes',
    'torso_front': 'torse',
    'torso_back': 'dos'
};

// Convertit les parties du corps du modèle vers les zones définies dans data.json
function mapBodyPartToZone(bodyPart: string): string | null {
    logger.debug(`mapBodyPartToZone: tentative de mapping pour "${bodyPart}"`);
    const result = bodyPartMapping[bodyPart] || null;
    logger.debug(`mapBodyPartToZone: résultat = "${result}"`);
    return result;
}

/**
 * Version simplifiée qui simule l'analyse d'image sans TensorFlow
 * Cette solution évite les problèmes d'installation de dépendances natives
 */
export async function analyzeImage(imageBuffer: Buffer): Promise<ImageAnalysisResult> {
    try {
        // Vérification de l'entrée
        logger.info(`Analyse d'image: démarrage simulation avec buffer de taille: ${imageBuffer?.length || 'INVALIDE'} octets`);

        if (!imageBuffer || imageBuffer.length === 0) {
            logger.error('Buffer d\'image invalide ou vide');
            throw new Error('Buffer d\'image invalide');
        }

        // Vérification du mapping
        logger.debug(`Nombre de parties du corps disponibles: ${Object.keys(bodyPartMapping).length}`);

        // Détection simulée - on choisit une partie du corps au hasard
        const possibleBodyParts = Object.keys(bodyPartMapping);
        if (possibleBodyParts.length === 0) {
            logger.error('bodyPartMapping est vide, impossible de simuler une détection');
            throw new Error('Configuration de mapping invalide');
        }

        const randomIndex = Math.floor(Math.random() * possibleBodyParts.length);
        logger.debug(`Index aléatoire choisi: ${randomIndex} sur ${possibleBodyParts.length - 1}`);

        const detectedPart = possibleBodyParts[randomIndex];
        logger.debug(`Partie du corps détectée (simulation): "${detectedPart}"`);

        const mappedZone = mapBodyPartToZone(detectedPart);
        logger.info(`Analyse d'image: partie du corps détectée simulée: ${detectedPart} -> ${mappedZone}`);

        // Vérification du résultat du mapping
        if (!mappedZone) {
            logger.warn(`Aucune zone correspondante trouvée pour "${detectedPart}"`);
        }

        // Construction du résultat
        const result: ImageAnalysisResult = {
            bodyParts: mappedZone ? [mappedZone] : [],
            mainBodyPart: mappedZone,
            confidence: 0.85
        };

        logger.debug(`Résultat final: ${JSON.stringify(result)}`);
        return result;
    } catch (error: any) {
        logger.error(`Erreur lors de l'analyse d'image: ${error.message || error}`);
        logger.error(`Stack trace: ${error.stack || 'non disponible'}`);

        return {
            bodyParts: [],
            mainBodyPart: null,
            confidence: 0
        };
    }
}
