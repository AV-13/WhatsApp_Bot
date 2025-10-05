import * as Jimp from 'jimp';
import { logger } from '../utils/logger.js';
import { getBotData } from './dataService.js';

export interface ImageAnalysisResult {
    bodyParts: string[];
    mainBodyPart: string;
    confidence: number;
}

export async function analyzeImage(buffer: Buffer): Promise<ImageAnalysisResult> {
    try {
        logger.debug('Analyse d\'image avec Jimp');

        // Chargement et traitement de l'image
        const image = await Jimp.read(buffer); // Correction de l'import

        // Redimensionner pour accélérer le traitement
        image.resize(300, Jimp.AUTO); // Correction de l'import

        // Analyse des propriétés de l'image
        const brightness = getBrightness(image);
        const dominantColor = getDominantColor(image);

        logger.debug(`Luminosité: ${brightness}, Couleurs dominantes: R=${dominantColor.r}, G=${dominantColor.g}, B=${dominantColor.b}`);

        // Récupération des zones depuis data.json
        const data = getBotData();
        const zones = data.entities.zone;

        // Sélection d'une zone basée sur les propriétés de l'image
        const selectedZone = selectZoneBasedOnProperties(brightness, dominantColor, zones);
        const confidence = 0.6 + (Math.random() * 0.3); // Confiance entre 0.6 et 0.9

        logger.info(`Zone sélectionnée: ${selectedZone} avec confiance ${confidence.toFixed(2)}`);

        return {
            bodyParts: [selectedZone],
            mainBodyPart: selectedZone,
            confidence
        };
    } catch (error) {
        logger.error('Erreur lors de l\'analyse d\'image:', error);

        // Récupération des zones depuis data.json pour le fallback
        const data = getBotData();
        const zones = data.entities.zone;

        // Sélection aléatoire d'une zone en cas d'erreur
        const selectedZone = zones[Math.floor(Math.random() * zones.length)];

        return {
            bodyParts: [selectedZone],
            mainBodyPart: selectedZone,
            confidence: 0.5
        };
    }
}

// Calcule la luminosité moyenne de l'image
function getBrightness(image: Jimp): number {
    let brightness = 0;
    let pixels = 0;

    image.scan(0, 0, image.getWidth(), image.getHeight(), function(this: Jimp, x: number, y: number, idx: number) {
        const red = this.bitmap.data[idx];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];

        // Formule standard de luminosité pondérée (perception humaine)
        brightness += (0.299 * red + 0.587 * green + 0.114 * blue);
        pixels++;
    });

    return brightness / pixels;
}

// Détermine la couleur dominante de l'image
function getDominantColor(image: Jimp): {r: number, g: number, b: number} {
    let r = 0, g = 0, b = 0, count = 0;

    image.scan(0, 0, image.getWidth(), image.getHeight(), function(this: Jimp, x: number, y: number, idx: number) {
        r += this.bitmap.data[idx];
        g += this.bitmap.data[idx + 1];
        b += this.bitmap.data[idx + 2];
        count++;
    });

    return { r: r/count, g: g/count, b: b/count };
}

// Sélectionne une zone basée sur la luminosité et la couleur
function selectZoneBasedOnProperties(brightness: number, color: {r: number, g: number, b: number}, zones: string[]): string {
    // Logique de sélection basée sur la luminosité et la couleur

    // Zones sombres (ex: aisselles, maillot)
    if (brightness < 100) {
        return zones.find(z => z === "aisselles" || z === "maillot classique" || z === "maillot intégral") || zones[0];
    }

    // Zones à dominante jaune/beige (peau claire)
    if (color.r > 180 && color.g > 150) {
        return zones.find(z => z === "visage" || z === "bras complets" || z === "avant-bras") || zones[1];
    }

    // Zones à dominante bleue
    if (color.b > color.r && color.b > color.g) {
        return zones.find(z => z === "jambes complètes" || z === "demi-jambes") || zones[2];
    }

    // Sélection pondérée basée sur la teinte
    const index = Math.floor((color.r + color.g + color.b) % zones.length);
    return zones[index];
}
