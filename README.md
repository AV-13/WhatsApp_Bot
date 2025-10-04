# SmartDuck WhatsApp Bot (Meta Cloud API) — Node/TypeScript

Bot WhatsApp minimal pour SmartDuck (épilation laser). Compatible **WhatsApp Cloud API** (Meta).

## Fonctionnalités (MVP)
- Réponses FAQ (prestations, tarifs, prise d’info/RDV, handover humain).
- Support **texte** ; **audio** (transcription optionnelle avec STT) ; **images** (accusé simple).
- i18n basique (FR, EN).

## Prérequis
- Node.js >= 18.17
- Un compte **Meta for Developers** et l'onglet **WhatsApp** configuré (numéro de test dispo).
- Un URL public pour le webhook (ex. **ngrok**).

## Setup
1. **Cloner** ce repo et installer :
   ```bash
   npm i
   cp .env.example .env
   # remplace les valeurs Meta : WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
   ```
2. **Lancer en dev** :
   ```bash
   npm run dev
   ```
3. **Exposer le webhook** :
   ```bash
   npx ngrok http 3000
   ```
4. **Configurer Meta (Cloud API)** :
   - URL de callback : `https://<ton-ngrok>/webhook`
   - Verify token : valeur de `WHATSAPP_VERIFY_TOKEN` dans `.env`
   - Souscriptions : `messages` (et `message_template_status_update` si besoin)

## Test rapide
- Depuis l'onglet WhatsApp **API Setup**, envoie un message depuis le **numéro de test** à ton propre WhatsApp.
- Le bot répondra par un message de bienvenue si tout est OK.

## Commandes
- `npm run dev`  — watch + reload (tsx)
- `npm run build` — compile TypeScript -> dist
- `npm start` — démarre depuis `dist`
- `npm test` — tests Jest

## Structure
```
src/
  index.ts
  webhook.ts
  config.ts
  services/
    whatsappClient.ts
    mediaService.ts
    sttService.ts
    nlp.ts
    faqService.ts
    i18n.ts
  utils/
    types.ts
    logger.ts
data/
  intents.fr.json
  intents.en.json
tests/
  webhook.int.test.ts
  nlp.unit.test.ts
```

## Notes STT (audio)
- Par défaut `STT_PROVIDER=none` => on répond qu'on a reçu le vocal, sans transcription.
- Pour activer Whisper (OpenAI), mets `STT_PROVIDER=whisper` + `STT_API_KEY` (voir `src/services/sttService.ts`).

## Sécurité
- Ne **committe** jamais `.env`.
- Les URLs médias sont temporaires → télécharge immédiatement puis traite.
- Gère les erreurs proprement (timeouts, token expiré, payloads inconnus).

## Déploiement
- Render / Railway / Fly.io (process Node long-running) ou Docker.
- Assure-toi d'exposer `/webhook` en HTTPS et d'autoriser l'IP sortante pour Meta si nécessaire.
