import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let botData: any = null;

export async function loadBotData() {
    try {
        const dataPath = path.resolve(__dirname, '../../src/data.json');
        const rawData = await fs.readFile(dataPath, 'utf8');
        botData = JSON.parse(rawData);
        logger.info('Données du bot chargées avec succès');
        return botData;
    } catch (error) {
        logger.error('Erreur lors du chargement des données du bot:', error);
        throw error;
    }
}

export function getBotData() {
    if (!botData) {
        throw new Error('Les données du bot n\'ont pas été chargées');
    }
    return botData;
}

export function getVariable(name: string): string {
    if (!botData) return '';
    return botData.variables_defaults[name] || '';
}

export function getPriceForZone(zone: string): number {
    if (!botData) return 0;
    const zoneData = botData.kb.tarifs.monozone.find(
        (item: any) => item.zone.toLowerCase() === zone.toLowerCase()
    );
    return zoneData ? zoneData.prix : 0;
}
