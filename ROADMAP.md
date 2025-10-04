# SmartDuck WhatsApp Bot – Starter Plan & Checklist

## 0) Objectif MVP (2–3 jours)

* **Répondre aux FAQ** (prestations, tarifs, prise d’info/RDV, contact humain).
* **Formats** : texte ✅, images (accusé simple), **audio** → transcription → traitement comme texte.
* **Langue** : démarrer **FR**; prévoir structure simple pour **EN**.
* **Handover humain** : si intention inconnue / confiance faible → message + transfert (ex. email/CRM).

---

## 1) Choisir le canal WhatsApp (test rapide)

**Par défaut (recommandé)** : **WhatsApp Cloud API (Meta)** avec **numéro de test**.

* Avantages : officiel, docs claires, passe bien en prod ensuite.
* Étapes : créer app → activer WhatsApp → récupérer **PHONE_NUMBER_ID**, **TOKEN**, **VERIFY_TOKEN** → configurer **Webhook**.

**Alternative prototypage** : **Twilio WhatsApp Sandbox**.

* Avantages : mise en route en quelques minutes; très bien pour un POC.

> Tu peux commencer avec l’un puis passer à l’autre : l’architecture ci-dessous est agnostique.

---

## 2) Architecture (Node.js/Express)

```
apps/
  bot-server/
    src/
      index.ts               # bootstrap Express
      config.ts              # lecture .env, constantes
      webhook.ts             # routes GET/POST /webhook
      services/
        whatsappClient.ts    # envoi de messages via Provider (Meta/Twilio)
        mediaService.ts      # téléchargement des médias (audio, image)
        sttService.ts        # transcription audio (Whisper API, Google STT, etc.)
        nlp.ts               # routing d’intentions: règles + keywords (+ embeddings plus tard)
        faqService.ts        # réponses canoniques SmartDuck
        i18n.ts              # détection FR/EN + templates
        logger.ts            # logs structurés
      utils/
        validators.ts        # validation payloads
        types.ts             # types communs (Message, Intent, etc.)
    data/
      intents.fr.json
      intents.en.json
    tests/
      webhook.int.test.ts
      nlp.unit.test.ts
      faq.unit.test.ts
    .env.example
    package.json
    jest.config.ts
```

---

## 3) Variables d’environnement (.env)

```
# WhatsApp Cloud API (Meta)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_API_BASE=https://graph.facebook.com/v21.0

# (Option) Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # sandbox par défaut

# App
PORT=3000
APP_URL=https://<ton-ngrok-ou-domaine>

# STT (choisir un provider)
STT_PROVIDER=whisper   # ou google|assembly
STT_API_KEY=

# i18n
DEFAULT_LOCALE=fr
SUPPORTED_LOCALES=fr,en
```

---

## 4) Endpoints & Webhook

* **GET `/webhook`** : vérification (renvoyer `hub.challenge` côté Meta ; réponse 200 côté Twilio).
* **POST `/webhook`** : réception des messages.
* **GET `/_health`** : statut simple (OK + version).

**Flux POST /webhook (pseudocode)**

```
for each incoming message:
  normalize -> {from, type, text?, mediaId?}
  if type == audio:
    url = mediaService.getUrl(mediaId)
    audioFile = mediaService.download(url)
    transcript = sttService.transcribe(audioFile, locale)
    text = transcript
  intent = nlp.detectIntent(text, locale)
  reply = faqService.answer(intent, context)
  whatsappClient.sendText(from, reply)
  if intent == unknown -> propose handover humain
```

---

## 5) Modèle d’intentions (exemple `data/intents.fr.json`)

```json
{
  "intents": [
    {
      "name": "salutation",
      "patterns": ["bonjour", "salut", "hello", "bonsoir"],
      "response": "Hello 👋 Je suis le bot SmartDuck. Je peux t’aider sur les prestations, tarifs et la prise d’info/RDV. Que souhaites-tu savoir ?"
    },
    {
      "name": "prestations",
      "patterns": ["prestations", "épilation", "laser", "zones"],
      "response": "Nous proposons de l’épilation laser premium avec équipements certifiés. Souhaites-tu des infos sur une zone en particulier ?"
    },
    {
      "name": "tarifs",
      "patterns": ["tarif", "prix", "combien"],
      "response": "Nos tarifs sont transparents. Donne-moi la zone qui t’intéresse et ta ville, je t’envoie la grille correspondante et les créneaux disponibles."
    },
    {
      "name": "rdv",
      "patterns": ["rdv", "rendez-vous", "disponibilités", "réserver"],
      "response": "Je peux te proposer des créneaux. Dans quelle ville es-tu et pour quelle zone souhaites-tu réserver ?"
    },
    {
      "name": "tessan",
      "patterns": ["téléconsultation", "médecin", "tessan"],
      "response": "Pour une téléconsultation proche de chez toi, Tessan équipe des pharmacies avec des cabines connectées. Je peux te partager le lien d’orientation si besoin."
    },
    {
      "name": "inconnu",
      "patterns": [],
      "response": "Je n’ai pas bien compris. Souhaites-tu parler des prestations, des tarifs ou prendre un RDV ? Je peux aussi te mettre en contact avec un conseiller humain."
    }
  ]
}
```

---

## 6) Gabarits de réponses (i18n)

* **FR** : fichiers de templates (strings avec placeholders : `{ville}`, `{zone}`, `{lien_tarifs}`, `{lien_resa}`).
* **EN** : même clé → traduction ultérieure.

---

## 7) Audio → Transcription (STT)

1. Récupérer `media_id` du message audio.
2. Appeler l’endpoint média (Meta/Twilio) → **URL temporaire**.
3. Télécharger le fichier (m4a/ogg).
4. Envoyer au provider STT (Whisper, Google, etc.).
5. Nettoyer la transcription (ponctuation, langue) → router comme texte.

> Important : gérer les erreurs (URL expirée, formats, dépassements taille).

---

## 8) Plan de tests

**Unit (Jest)**

* `nlp.detectIntent` : correspondances patterns, fallback inconnu.
* `faqService.answer` : rend les bons templates pour chaque intent.
* `mediaService` : stub de download (retourne Buffer factice).

**Integration**

* POST `/webhook` avec payloads fixtures (texte, image, audio) → assert appels `whatsappClient`.

**Manuel**

* Envoyer “bonjour”, “tarifs”, vocal → vérifier réponses, logs, erreurs.

---

## 9) Roadmap exécution

**Jour 1 (matin)**

* Créer app Meta (ou activer Twilio Sandbox), récupérer tokens, configurer **GET /webhook**.
* Déployer vite (ngrok/Render/Vercel Functions) pour valider le webhook.

**Jour 1 (après-midi)**

* Implémenter **POST /webhook** (texte) + `nlp.detectIntent` + `faqService` + envoi réponse.
* Écrire 10–15 intents FR.

**Jour 2**

* Gérer **audio → transcription** (provider STT choisi).
* i18n minimal (clé/val FR, placeholders).
* Handover humain (message + log/email webhook CRM).
* Tests Jest (unit + intégration) + check-lists manuelles.

---

## 10) Snippets utiles

**Vérif webhook (Meta)**

```ts
app.get("/webhook", (req, res) => {
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});
```

**Envoi texte (Meta Graph)**

```ts
async function sendText(to: string, body: string) {
  const url = `${process.env.WHATSAPP_API_BASE}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}
```

---

## 11) Déploiement rapide

* **Local + ngrok** pour valider le webhook.
* **Render / Railway / Fly.io** : Node long-running facile.
* **Vercel** : endpoints serverless possibles (attention au téléchargement média → préférer un worker si gros).

---

## 12) Backlog (après MVP)

* Détection d’intent par embeddings (meilleure robustesse).
* Base de connaissances (FAQ éditables depuis un mini backoffice Angular).
* Persistance conversationnelle (mémoire courte par numéro).
* Analytics (dash, taux de résolution, first response time).
* Paiement/lien de réservation direct si disponible.
