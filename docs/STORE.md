# Chrome Web Store Submission Notes

## Short description (≤132 characters)

**English:** Write emails with any AI (OpenAI, Claude, Gemini, Ollama…) directly in Gmail. No backend, your keys stay local.

**French:** Rédigez vos emails avec n'importe quelle IA (OpenAI, Claude, Gemini, Ollama…) dans Gmail. Sans serveur, clés locales.

## Long description

### English

AI for Gmail adds an "AI Write" button to every Gmail compose window. Click it to compose, reply, or improve emails using the AI provider of your choice.

**Key features:**
- Compose emails from instructions, reply to threads with context, or improve existing drafts
- Streaming output — see the response as it generates
- Choose your tone (neutral, formal, friendly, direct) and length (short, medium, long)
- Seven built-in providers: OpenAI, Anthropic (Claude), Google Gemini, Mistral, OpenRouter, Ollama (local), or any OpenAI-compatible endpoint
- Bilingual interface (English and French)

**Privacy-first design:**
- No backend server, no telemetry, no data collection
- Your API key stays in your browser's local storage
- Email content is sent only to the provider you choose, only when you click Generate

Open source under the MIT license.

### French

AI for Gmail ajoute un bouton « AI Write » dans chaque fenêtre de rédaction Gmail. Cliquez pour rédiger, répondre ou améliorer des emails avec le fournisseur d'IA de votre choix.

**Fonctionnalités principales :**
- Rédaction à partir de consignes, réponse contextuelle à un fil, amélioration d'un brouillon
- Réponse en streaming — voyez le texte apparaître au fur et à mesure
- Choix du ton (neutre, formel, amical, direct) et de la longueur (court, moyen, long)
- Sept fournisseurs intégrés : OpenAI, Anthropic (Claude), Google Gemini, Mistral, OpenRouter, Ollama (local), ou tout endpoint compatible OpenAI
- Interface bilingue (anglais et français)

**Respect de la vie privée :**
- Aucun serveur, aucune télémétrie, aucune collecte de données
- Votre clé API reste dans le stockage local du navigateur
- Le contenu des emails n'est envoyé qu'au fournisseur que vous choisissez, uniquement quand vous cliquez sur Générer

Open source sous licence MIT.

## Single purpose statement

This extension helps users write, reply to, and improve emails using AI language models directly within the Gmail interface.

## Permission justifications

| Permission | Justification |
|---|---|
| `storage` | Store the user's settings (chosen provider, model, tone, length) and API key locally in the browser. |
| `https://mail.google.com/*` (host) | Inject the AI writing button and generation panel into the Gmail compose interface. |
| Optional `https://*/*` and `http://*/*` | Connect to the AI provider endpoint the user selected in settings. Only the specific origin is requested at the time the user saves settings. |

## Data usage questionnaire

| Question | Answer |
|---|---|
| Does your extension collect personal data? | No. |
| Does it transmit data to servers? | Yes — email content and instructions are transmitted to the user-selected AI provider (e.g., OpenAI, Anthropic) solely to generate the email text. This happens only when the user clicks Generate. |
| Does the developer store data? | No. The extension has no backend server. |
| Is data sold to third parties? | No. |
| Is data used for purposes unrelated to the extension? | No. |
| Is data used for creditworthiness or lending? | No. |

## Screenshots to produce (1280×800)

1. **Gmail compose with AI button** — A new message window in Gmail showing the "AI Write" button in the toolbar
2. **Panel during generation** — The floating panel open with streaming text appearing in the output area
3. **Options page** — The settings page showing provider selection, model, API key, and tone/length defaults

## Pre-publication checklist (for the repository owner)

- [ ] Choose a final store name (see section 2 of PLAN.md)
- [ ] Register a Chrome Web Store developer account
- [ ] Replace placeholder icons in `src/assets/icons/` with final artwork
- [ ] Publish `docs/PRIVACY.md` at a public URL (e.g., GitHub Pages)
- [ ] Bump version to `1.0.0` in `src/manifest.json`
- [ ] Run `pwsh scripts/package.ps1` to generate the zip
- [ ] Take the three screenshots listed above
- [ ] Submit the zip and screenshots to the Chrome Web Store
