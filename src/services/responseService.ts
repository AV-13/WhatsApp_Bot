// src/services/responseService.ts
import { getBotData, getVariable, getPriceForZone } from './dataService.js';
import { ProcessedIntent } from './nlpService.js';
import { logger } from '../utils/logger.js';

interface ResponseOptions {
    template: string;
    variables?: Record<string, string | number>;
    quickReplies?: string[];
}

export function getResponseForIntent(intent: ProcessedIntent): ResponseOptions {
    const data = getBotData();
    const intentData = data.intents.find((i: any) => i.id === intent.name);

    if (!intentData) {
        // Fallback si l'intent n'est pas trouvé
        return {
            template: "Je n'ai pas compris votre demande. Pouvez-vous reformuler ?",
            quickReplies: ["Tarifs", "Prestations", "RDV"]
        };
    }

    // Récupérer le template de réponse
    const template = intentData.response.template_fr;
    const quickReplies = intentData.response.quick_replies || [];

    // Préparer les variables pour le template
    const variables: Record<string, string | number> = {};

    // Variables par défaut
    for (const [key, value] of Object.entries(data.variables_defaults)) {
        variables[key] = value;
    }

    // Variables spécifiques selon l'intent
    if (intent.name === "pricing_zone") {
        // Trouver la zone mentionnée
        const zoneEntity = intent.entities.find(e => e.type === "zone");
        if (zoneEntity) {
            const prix = getPriceForZone(zoneEntity.value);
            variables.zone = zoneEntity.value;
            variables.prix_zone = prix;
        }
    } else if (intent.name === "opening_hours") {
        // Trouver la ville mentionnée
        const villeEntity = intent.entities.find(e => e.type === "ville");
        if (villeEntity) {
            const ville = villeEntity.value;
            const horaires = data.kb.horaires[ville];
            variables.ville_ou_global = ville;
            variables.horaires_ville = `Lun-Ven: ${horaires.lun_ven}, Sam: ${horaires.sam}`;
        } else {
            variables.ville_ou_global = "tous nos centres";
            variables.horaires_ville = "Lun-Ven: 9:30-19:30, Sam: 10:00-18:00 (horaires généraux)";
        }
    }

    // Remplacer les variables dans le template
    let processedTemplate = template;
    for (const [key, value] of Object.entries(variables)) {
        processedTemplate = processedTemplate.replace(
            new RegExp(`{${key}}`, 'g'),
            String(value)
        );
    }

    return {
        template: processedTemplate,
        quickReplies
    };
}
