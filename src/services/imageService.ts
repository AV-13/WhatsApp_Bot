// src/services/imageService.ts
import * as tf from '@tensorflow/tfjs-node';
import * as bodyPix from '@tensorflow-models/body-pix';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { createCanvas, Image } from 'canvas';

// Type pour les résultats d'analyse
interface ImageAnalysisResult {
    bodyParts: string[];      // Liste des parties du corps détectées
    mainBodyPart: string;     // Partie principale (plus grande surface)
    confidence: number;       // Niveau de confiance [0-100]
}

// Mapping des segments BodyPix vers zones d'épilation
const SEGMENT_TO_ZONE_MAP: Record<string, string> = {
    'left_face': 'visage',
    'right_face': 'visage',
    'left_upper_arm_front': 'bras',
    'right_upper_arm_front': 'bras',
    'left_upper_arm_back': 'bras',
    'right_upper_arm_back': 'bras',
    'left_lower_arm_front': 'avant-bras',
    'right_lower_arm_front': 'avant-bras',
    'left_lower_arm_back': 'avant-bras',
    'right_lower_arm_back': 'avant-bras',
    'left_upper_leg_front': 'jambes complètes',
    'right_upper_leg_front': 'jambes complètes',
    'left_upper_leg_back': 'jambes complètes',
    'right_upper_leg_back': 'jambes complètes',
    'left_lower_leg_front': 'demi-jambes',
    'right_lower_leg_front': 'demi-jambes',
    'left_lower_leg_back': 'demi-jambes',
    'right_lower_leg_back': 'demi-jambes',
    'torso_front': 'dos',
    'torso_back': 'dos',
    'left_foot': 'pieds',
    'right_foot': 'pieds'
};

// Cache du modèle pour éviter de le recharger
let bodyPixModel: bodyPix.BodyPix | null = null;

/**
 * Charge le modèle BodyPix (lazy loading)
 */
async function loadModel(): Promise<bodyPix.BodyPix> {
    if (!bodyPixModel) {
        logger.info('Chargement du modèle BodyPix...');

        try {
            bodyPixModel = await bodyPix.load({
                architecture: config.bodyPix.architecture as any,
                multiplier: config.bodyPix.multiplier,
                stride: config.bodyPix.stride,
                quantBytes: config.bodyPix.quantBytes
            });

            logger.info('Modèle BodyPix chargé avec succès');
        } catch (error) {
            logger.error('Erreur lors du chargement du modèle BodyPix:', error);
            throw error;
        }
    }

    return bodyPixModel;
}

/**
 * Convertit un buffer d'image en tensor utilisable par TensorFlow
 */
async function bufferToTensor(buffer: Buffer): Promise<tf.Tensor3D> {
    try {
        const image = new Image();

        // Création d'une promesse pour attendre que l'image soit chargée
        const imageLoaded = new Promise((resolve, reject) => {
            image.onload = () => resolve(image);
            image.onerror = (e) => reject(e);
        });

        // Chargement de l'image depuis le buffer
        image.src = buffer;
        await imageLoaded;

        // Création d'un canvas et dessin de l'image
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        // Conversion vers tensor
        const imageTensor = tf.browser.fromPixels(canvas);
        return imageTensor;
    } catch (error) {
        logger.error('Erreur lors de la conversion du buffer en tensor:', error);
        throw error;
    }
}

/**
 * Analyse les segments détectés pour identifier les zones corporelles
 */
function analyzeSegmentation(segmentation: bodyPix.SemanticPartSegmentation): ImageAnalysisResult {
    // Comptage des pixels par segment
    const segmentCounts: Record<string, number> = {};
    const allPartNames = Object.keys(bodyPix.PART_CHANNELS);

    // Initialisation du compteur
    allPartNames.forEach(part => {
        segmentCounts[part] = 0;
    });

    // Comptage des pixels par segment
    const { height, width, data } = segmentation;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            const partId = data[index];

            if (partId !== -1) {
                const partName = allPartNames[partId];
                segmentCounts[partName]++;
            }
        }
    }

    // Filtrer pour ne garder que les segments avec des pixels
    const detectedSegments = Object.entries(segmentCounts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]); // Tri par nombre de pixels

    // Convertir les segments en zones d'épilation
    const bodyParts: string[] = [];
    let totalPixels = 0;

    detectedSegments.forEach(([segment, count]) => {
        console.log("segment", segment, count);
        const zone = SEGMENT_TO_ZONE_MAP[segment];
        if (zone && !bodyParts.includes(zone)) {
            bodyParts.push(zone);
            totalPixels += count;
        }
    });

    // Calcul de la zone principale et du niveau de confiance
    let mainBodyPart = bodyParts.length > 0 ? bodyParts[0] : '';
    const confidence = detectedSegments.length > 0
        ? (detectedSegments[0][1] / totalPixels) * 100
        : 0;

    return {
        bodyParts,
        mainBodyPart,
        confidence
    };
}

/**
 * Fonction principale d'analyse d'image
 */
export async function analyzeImage(imageBuffer: Buffer): Promise<ImageAnalysisResult> {
    try {
        logger.info('Début analyse image avec TensorFlow');

        // Chargement du modèle
        const model = await loadModel();

        // Conversion de l'image en tensor
        const tensor = await bufferToTensor(imageBuffer);

        // Segmentation de l'image
        logger.debug('Début segmentation BodyPix');
        const segmentation = await model.segmentPersonParts(tensor, {
            flipHorizontal: false,
            internalResolution: 'medium',
            segmentationThreshold: 0.7,
            scoreThreshold: 0.2
        });
        logger.debug('Segmentation terminée');

        // Analyse des résultats
        const result = analyzeSegmentation(segmentation);

        // Libération de la mémoire
        tensor.dispose();

        logger.info(`Analyse image terminée, zones détectées: ${result.bodyParts.join(', ')}`);
        return result;

    } catch (error) {
        logger.error('Erreur lors de l\'analyse d\'image:', error);
        throw error;
    }
}
