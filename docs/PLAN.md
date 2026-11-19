# Plan de développement — AI for Gmail

Extension Chrome (Manifest V3) qui rédige des emails avec n'importe quel LLM, directement dans Gmail, publiée sur le Chrome Web Store.

Ce document est la source de vérité. La partie 4 est écrite pour être exécutée étape par étape par un LLM sans autre contexte que ce fichier et le dépôt.

---

## 1. Décisions prises

| Sujet | Décision |
|---|---|
| Accès au LLM | L'utilisateur fournit sa propre clé API. Aucun backend, aucun compte, aucune télémétrie. |
| Fournisseurs v1 | Préréglages : OpenAI, Anthropic, Google Gemini, Mistral, OpenRouter, Ollama (local), plus « Personnalisé » (tout endpoint compatible OpenAI, dont LM Studio). |
| Fonctions v1 | Rédiger depuis une consigne ; répondre selon le fil ; améliorer le brouillon ; ton, longueur, streaming, régénérer. |
| Langues de l'interface | Français et anglais, via `chrome.i18n`. Anglais par défaut. |
| Distribution | Dépôt public sous licence MIT, Chrome Web Store. |

## 2. Points d'ombre tranchés

Chaque point a une valeur retenue. L'exécutant applique la valeur retenue sans la rediscuter.

1. **Combien d'adaptateurs API ?** Deux seulement. Gemini, Mistral, OpenRouter, Ollama et LM Studio exposent tous un endpoint `/chat/completions` compatible OpenAI. Un adaptateur `openai` (paramétré par URL de base) et un adaptateur `anthropic`. Les préréglages sont une table de données.
2. **Outillage.** JavaScript natif, aucun bundler, aucune dépendance npm. Le dossier `src/` est l'extension, chargeable telle quelle. Tests avec `node --test` (Node 20 ou plus).
3. **Modules.** `src/lib/` et le service worker sont des modules ES. Les scripts de contenu ne peuvent pas être des modules : ce sont des scripts classiques listés dans l'ordre dans le manifest, qui partagent un objet `globalThis.AI4G`.
4. **Où se construit le prompt ?** Dans le service worker. Le script de contenu n'envoie que des données brutes (action, consigne, fil, brouillon). Toute la logique pure reste donc testable sous Node.
5. **Stockage.** Clés API dans `chrome.storage.local` (jamais synchronisées, jamais lues par le script de contenu). Préférences dans `chrome.storage.sync`.
6. **Permissions.** Seul `https://mail.google.com/*` est requis à l'installation. L'origine de chaque fournisseur est une permission optionnelle, demandée à l'enregistrement des options. Cela réduit l'avertissement d'installation et facilite la revue du store.
7. **Streaming.** Port `chrome.runtime.connect` entre script de contenu et service worker ; le worker lit le flux SSE et relaie les fragments. Fermer le port annule la requête.
8. **Sélecteurs Gmail.** Gmail n'a pas d'API DOM stable. Tous les sélecteurs vivent dans un seul fichier (`content/gmail-dom.js`). Ceux du plan sont des points de départ à vérifier dans un vrai Gmail à l'étape 6.
9. **Insertion dans le brouillon.** `document.execCommand("insertHTML")` après remise du focus, pour conserver l'annulation (Ctrl+Z) et prévenir Gmail du changement. Le texte du LLM est toujours échappé avant insertion.
10. **Position du panneau.** `position: fixed`, attaché à `document.body`, placé d'après la position du bouton. Les fenêtres de rédaction Gmail rognent ce qui dépasse.
11. **Langue de l'email généré.** Celle du fil pour une réponse, celle de la consigne sinon, celle du brouillon pour une amélioration (sauf traduction).
12. **Liste des modèles.** Champ libre avec suggestions, plus un bouton « Charger les modèles » qui interroge `GET {baseUrl}/models`. Les identifiants de modèles changent souvent : ne jamais bloquer une valeur absente des suggestions.
13. **Ollama.** Le serveur refuse par défaut les origines `chrome-extension://`. L'utilisateur doit lancer Ollama avec `OLLAMA_ORIGINS=chrome-extension://*`. À documenter dans les options et le README.

### Points restant à la charge du propriétaire du dépôt

Ces points ne bloquent pas le développement mais bloquent la publication (étape 12).

- **Nom sur le store.** Les règles de marque de Google tolèrent « X for Gmail » mais interdisent toute apparence d'affiliation et l'usage du logo Gmail. Prévoir un nom de repli.
- **Compte développeur Chrome Web Store** (frais d'inscription uniques, vérification d'identité).
- **Icône définitive** : celles de `src/assets/icons/` sont provisoires.
- **URL publique de la politique de confidentialité** (GitHub Pages sur `docs/PRIVACY.md` suffit).

## 3. Architecture cible

```
package.json                 "type": "module", script "test"
src/
  manifest.json
  _locales/en/messages.json
  _locales/fr/messages.json
  lib/
    providers.js             table des préréglages
    storage.js               lecture/écriture des réglages et des clés
    prompt.js                construction des messages envoyés au LLM
    sse.js                   découpage d'un flux SSE en événements
    llm.js                   adaptateurs openai et anthropic, streaming
    i18n-dom.js              traduction des pages options et popup
  background/service-worker.js
  content/
    gmail-dom.js             tous les sélecteurs et lectures du DOM Gmail
    panel.js                 panneau flottant
    main.js                  détection des fenêtres de rédaction, bouton
    styles.css
  options/options.html, options.js
  popup/popup.html, popup.js
  assets/icons/
tests/                       *.test.js (node:test)
scripts/package.ps1          produit dist/ai-for-gmail-<version>.zip
docs/PLAN.md, PRIVACY.md, STORE.md
```

### 3.1 Table des fournisseurs (`lib/providers.js`)

`export const PROVIDERS` : tableau d'objets `{ id, label, kind, baseUrl, needsKey, defaultModel, suggestions }`.

| id | kind | baseUrl | needsKey | defaultModel |
|---|---|---|---|---|
| `openai` | `openai` | `https://api.openai.com/v1` | oui | `gpt-4o-mini` |
| `anthropic` | `anthropic` | `https://api.anthropic.com/v1` | oui | `claude-sonnet-5-5` |
| `gemini` | `openai` | `https://generativelanguage.googleapis.com/v1beta/openai` | oui | `gemini-2.5-flash` |
| `mistral` | `openai` | `https://api.mistral.ai/v1` | oui | `mistral-small-latest` |
| `openrouter` | `openai` | `https://openrouter.ai/api/v1` | oui | `openai/gpt-4o-mini` |
| `ollama` | `openai` | `http://localhost:11434/v1` | non | `llama3.2` |
| `custom` | `openai` | (saisi par l'utilisateur) | non | (vide) |

Fonctions exportées : `getProvider(id)`, `resolveBaseUrl(provider, settings)` (renvoie `settings.customBaseUrl` sans barre finale pour `custom`), `originPattern(baseUrl)` (renvoie par exemple `https://api.openai.com/*`).

### 3.2 Stockage (`lib/storage.js`)

`chrome.storage.sync`, clé `settings` :

```json
{
  "provider": "openai",
  "models": { "openai": "gpt-4o-mini" },
  "customBaseUrl": "",
  "tone": "neutral",
  "length": "medium"
}
```

`chrome.storage.local`, clé `apiKeys` : `{ "openai": "sk-..." }`.

Fonctions : `getSettings()` (fusionne avec `DEFAULT_SETTINGS`), `saveSettings(partial)`, `getApiKey(providerId)`, `setApiKey(providerId, key)`.

### 3.3 Requête de génération

Objet `request` envoyé par le script de contenu :

```json
{
  "action": "compose | reply | improve",
  "instruction": "texte libre, peut être vide pour reply et improve",
  "improveMode": "fix | rephrase | shorten | expand | translate",
  "targetLang": "nom de langue, seulement pour translate",
  "tone": "neutral | formal | friendly | direct",
  "length": "short | medium | long",
  "thread": { "subject": "…", "messages": [{ "from": "Nom <email>", "text": "…" }] },
  "draft": "texte à améliorer (sélection si présente, sinon brouillon entier)",
  "uiLang": "fr"
}
```

`thread` est tronqué côté contenu : 6 derniers messages, 4000 caractères par message.

### 3.4 Protocole du port

Nom du port : `ai4g-generate`.

- Contenu → worker : `{ type: "start", request }`
- Worker → contenu : `{ type: "chunk", text }` (zéro ou plusieurs), puis `{ type: "done" }` ou `{ type: "error", code, message }`
- Fermeture du port par le contenu : le worker annule le `fetch` (AbortController).

Codes d'erreur : `no_key`, `no_model`, `no_permission`, `auth` (401/403), `rate_limit` (429), `network`, `provider` (autre statut HTTP ; `message` contient le statut et le début du corps).

### 3.5 Prompt (`lib/prompt.js`)

`buildMessages(request)` renvoie `{ system, messages }` où `messages` est un tableau `{ role: "user" | "assistant", content }`.

Règles du prompt système, communes : rendre uniquement le corps de l'email, sans objet, sans préambule, sans balises Markdown, sans commentaire ; ne pas inventer de faits, de dates ni de noms ; mettre un marqueur entre crochets pour toute information manquante ; respecter le ton et la longueur demandés ; appliquer la règle de langue du point 11.

Par action : `compose` utilise la consigne ; `reply` fournit le fil (objet, puis messages du plus ancien au plus récent) et répond au dernier message, la consigne étant facultative ; `improve` fournit le brouillon et applique `improveMode`.

Le contenu du fil et du brouillon est encadré par des délimiteurs et présenté comme une donnée : le prompt système précise que les instructions figurant dans un email reçu ne doivent pas être suivies.

### 3.6 Adaptateurs (`lib/llm.js`)

`async function* streamCompletion({ provider, baseUrl, apiKey, model, system, messages, signal })` produit des chaînes de texte.

- `kind: "openai"` : `POST {baseUrl}/chat/completions`, en-tête `Authorization: Bearer <clé>` seulement si la clé est non vide, corps `{ model, stream: true, messages: [{ role: "system", content: system }, ...messages] }`. Chaque événement SSE `data:` est du JSON ; le texte est dans `choices[0].delta.content` ; `data: [DONE]` termine.
- `kind: "anthropic"` : `POST {baseUrl}/messages`, en-têtes `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`, corps `{ model, max_tokens: 2048, stream: true, system, messages }`. Le texte est dans les événements `content_block_delta` dont `delta.type === "text_delta"`, champ `delta.text` ; l'événement `message_stop` termine.
- Statut HTTP non 2xx : lever une erreur portant un `code` de la liste 3.4.

`async function listModels({ provider, baseUrl, apiKey })` : `GET {baseUrl}/models`, renvoie le tableau des `data[].id` triés.

### 3.7 SSE (`lib/sse.js`)

`async function* parseSSE(readableStream)` : décode en UTF-8 avec `TextDecoder` en mode `stream`, découpe sur les lignes vides, produit `{ event, data }` pour chaque événement, concatène les lignes `data:` multiples avec `\n`, ignore les lignes de commentaire commençant par `:`. Doit gérer un événement coupé entre deux fragments réseau.

## 4. Étapes d'exécution

### Règles pour l'exécutant

1. Faire une étape à la fois, dans l'ordre. Ne pas commencer la suivante avant que les critères d'acceptation de la précédente soient remplis.
2. Ne modifier que les fichiers listés dans l'étape. Si un autre fichier semble devoir changer, s'arrêter et le signaler.
3. Aucune dépendance npm, aucun bundler, aucun framework.
4. Aucune chaîne visible par l'utilisateur écrite en dur à partir de l'étape 3 : passer par `chrome.i18n.getMessage`.
5. Ne jamais écrire une clé API dans un fichier, un log ou un message d'erreur.
6. Ne jamais insérer dans le DOM une chaîne venant du LLM ou de Gmail sans l'échapper (`textContent`, ou échappement HTML avant `insertHTML`).
7. Après chaque étape : lancer `npm test`, puis créer un commit dont le message est celui indiqué. Ne pas pousser.
8. Les étapes marquées **[manuel]** contiennent une vérification dans Chrome que seul un humain peut faire : lister ce qui doit être vérifié et s'arrêter.
9. En cas d'écart entre ce plan et la réalité (API qui répond autrement, sélecteur absent), ne pas improviser : s'arrêter, décrire l'écart.

### État de départ

Un squelette existe dans `src/` : manifest, service worker sans streaming avec trois fournisseurs en dur, script de contenu monolithique, popup, options, icônes provisoires. Les étapes ci-dessous le remplacent progressivement.

---

### Étape 1 — Outillage de test et table des fournisseurs

Fichiers : `package.json` (créer), `src/lib/providers.js` (créer), `tests/providers.test.js` (créer).

- `package.json` : `{ "name": "ai-for-gmail", "private": true, "type": "module", "scripts": { "test": "node --test tests/" } }`.
- `providers.js` : selon 3.1.
- Tests : chaque `id` est unique ; `getProvider("inconnu")` renvoie `undefined` ; `resolveBaseUrl` retire la barre finale d'une URL personnalisée ; `originPattern("http://localhost:11434/v1")` renvoie `http://localhost:11434/*`.

Acceptation : `npm test` passe.
Commit : `Add provider presets and test tooling`

### Étape 2 — Découpage SSE

Fichiers : `src/lib/sse.js`, `tests/sse.test.js`.

Selon 3.7. Dans les tests, fabriquer un `ReadableStream` à partir d'un tableau de `Uint8Array`.

Tests : un événement simple ; deux événements dans un fragment ; un événement coupé au milieu d'une ligne entre deux fragments ; un caractère UTF-8 multi-octets coupé entre deux fragments ; lignes `data:` multiples ; ligne de commentaire ignorée ; champ `event:` restitué.

Acceptation : `npm test` passe.
Commit : `Add SSE stream parser`

### Étape 3 — Internationalisation

Fichiers : `src/_locales/en/messages.json`, `src/_locales/fr/messages.json`, `src/lib/i18n-dom.js`, `src/manifest.json`, `tests/locales.test.js`.

- Manifest : ajouter `"default_locale": "en"` ; `name` devient `__MSG_extName__`, `description` devient `__MSG_extDescription__`.
- `i18n-dom.js` : `export function localizePage(root = document)` remplace le `textContent` de chaque élément portant `data-i18n="clé"` et l'attribut `placeholder` de chaque élément portant `data-i18n-placeholder="clé"`.
- Créer dès maintenant toutes les clés nécessaires aux étapes 7 à 10 : libellés du bouton et du panneau, trois actions, cinq modes d'amélioration, quatre tons, trois longueurs, boutons générer, arrêter, régénérer, insérer, copier, un message par code d'erreur de 3.4, libellés des options et du popup, aide Ollama.
- Test : les deux fichiers ont exactement le même ensemble de clés, et chaque entrée a un champ `message` non vide.

Acceptation : `npm test` passe ; l'extension se charge toujours.
Commit : `Add English and French locales`

### Étape 4 — Stockage et construction du prompt

Fichiers : `src/lib/storage.js`, `src/lib/prompt.js`, `tests/prompt.test.js`.

- `storage.js` selon 3.2.
- `prompt.js` selon 3.3 et 3.5. Fonction pure, aucun appel à `chrome`.

Tests de `buildMessages` : `compose` contient la consigne ; `reply` contient l'objet et les messages dans l'ordre, et fonctionne avec une consigne vide ; `improve` avec `translate` contient `targetLang` ; ton et longueur apparaissent dans `system` ; le dernier message a le rôle `user` ; une requête dont `action` est inconnue lève une erreur.

Acceptation : `npm test` passe.
Commit : `Add settings storage and prompt builder`

### Étape 5 — Adaptateurs LLM et service worker en streaming

Fichiers : `src/lib/llm.js`, `src/background/service-worker.js` (réécrire), `src/manifest.json`, `tests/llm.test.js`.

- `llm.js` selon 3.6, en s'appuyant sur `parseSSE`.
- Tests : remplacer `globalThis.fetch` par une fausse fonction qui renvoie un `Response` construit sur un flux SSE enregistré. Vérifier pour chaque `kind` : texte reconstitué, URL appelée, en-têtes envoyés, absence d'en-tête `Authorization` si la clé est vide, code d'erreur pour 401, 429 et 500.
- Service worker : écouter `chrome.runtime.onConnect` pour le port `ai4g-generate`, selon 3.4. À la réception de `start` : lire réglages et clé ; vérifier dans l'ordre modèle (`no_model`), clé si `needsKey` (`no_key`), permission d'hôte par `chrome.permissions.contains` (`no_permission`) ; appeler `buildMessages` puis `streamCompletion` ; relayer chaque fragment. `port.onDisconnect` appelle `abort()`. Une erreur d'annulation ne produit aucun message. Supprimer l'ancien gestionnaire `GENERATE_EMAIL`.
- Manifest : `host_permissions` ne garde que `https://mail.google.com/*` ; `optional_host_permissions` reste `["https://*/*", "http://*/*"]` ; `permissions` devient `["storage"]`.

Acceptation : `npm test` passe ; le manifest se charge sans erreur.
Commit : `Stream completions through provider adapters`

### Étape 6 — Accès au DOM Gmail **[manuel]**

Fichiers : `src/content/gmail-dom.js` (créer), `src/manifest.json` (ordre des scripts de contenu : `gmail-dom.js`, `panel.js`, `main.js`).

Tout est attaché à `globalThis.AI4G.gmail`. Sélecteurs de départ, regroupés dans une constante `SELECTORS` en tête de fichier :

| Élément | Sélecteur de départ |
|---|---|
| Corps du brouillon | `div[contenteditable="true"][role="textbox"]` |
| Barre d'outils d'envoi | `.btC` (dans le même formulaire ou dialogue que le corps) |
| Message d'un fil ouvert | `.a3s.aiL` |
| Expéditeur d'un message | `.gD` (attributs `name` et `email`) |
| Objet du fil | `h2.hP` |

Fonctions : `findComposeToolbars()`, `getComposeBody(toolbar)`, `getThread()` (objet 3.3 tronqué, ou `null` hors d'un fil), `getDraftText(body)` (texte sans la citation `.gmail_quote` ni la signature `.gmail_signature`), `saveSelection(body)` et `restoreSelection(saved)`, `insertText(body, text, mode)` avec `mode` valant `replaceSelection`, `replaceDraft` ou `prepend` : remettre le focus, positionner la sélection, échapper le texte, convertir les retours à la ligne en `<br>`, appeler `document.execCommand("insertHTML")`.

Vérification manuelle dans Gmail, à lister puis s'arrêter : chaque sélecteur trouve bien son élément pour un nouveau message, une réponse en ligne et une fenêtre détachée ; `getThread()` renvoie les bons expéditeurs ; l'insertion est annulable avec Ctrl+Z ; la citation et la signature sont préservées.

Commit : `Isolate Gmail DOM access`

### Étape 7 — Panneau flottant

Fichiers : `src/content/panel.js` (créer), `src/content/styles.css` (réécrire).

`AI4G.panel.open({ anchor, body })` crée un panneau `position: fixed` dans `document.body`, placé au-dessus de `anchor`, replacé au défilement et au redimensionnement, fermé par Échap, par le bouton de fermeture ou par un clic extérieur. Un seul panneau ouvert à la fois.

Contenu : onglets Rédiger, Répondre, Améliorer (Répondre désactivé si `getThread()` est `null` ; Améliorer désactivé si le brouillon est vide ; onglet initial : Améliorer s'il y a une sélection, sinon Répondre dans un fil, sinon Rédiger) ; zone de consigne ; sélecteur de mode et champ de langue cible pour Améliorer ; sélecteurs de ton et de longueur initialisés depuis les réglages ; bouton Générer (Ctrl+Entrée) qui devient Arrêter pendant la génération ; zone de résultat remplie par `textContent` au fil des fragments ; après `done` : Insérer, Régénérer, Copier ; en cas d'erreur : message traduit selon le code, avec un lien vers les options pour `no_key`, `no_model` et `no_permission`.

Le panneau ouvre le port à chaque génération et le ferme sur Arrêter ou à la fermeture. Mode d'insertion : `replaceSelection` pour Améliorer avec sélection, `replaceDraft` pour Améliorer sans sélection, `prepend` pour Répondre et Rédiger. La sélection est sauvegardée à l'ouverture du panneau.

Styles : préfixe `ai4g-` sur toutes les classes, aucune règle sur un sélecteur Gmail, prise en charge du thème sombre par `prefers-color-scheme`, focus clavier visible.

Acceptation : aucun `innerHTML` recevant une donnée variable.
Commit : `Add floating generation panel`

### Étape 8 — Injection du bouton **[manuel]**

Fichiers : `src/content/main.js` (réécrire).

Un `MutationObserver` sur `document.body`, limité à un passage par image (`requestAnimationFrame`), appelle `findComposeToolbars()` et ajoute un bouton à chaque barre qui n'en a pas (marqueur `data-ai4g`). Le clic ouvre ou ferme le panneau pour cette fenêtre.

Vérification manuelle : le bouton apparaît pour un nouveau message, une réponse et une fenêtre détachée ; jamais en double ; les trois actions fonctionnent de bout en bout avec un fournisseur réel ; Arrêter interrompt bien la génération ; Gmail reste fluide.

Commit : `Inject AI button into compose windows`

### Étape 9 — Page d'options

Fichiers : `src/options/options.html`, `src/options/options.js` (script de type module).

Liste des fournisseurs générée depuis `PROVIDERS`. Par fournisseur : modèle (champ libre avec `datalist` des suggestions), clé API (masquée, bouton afficher), URL de base pour `custom`, encart d'aide `OLLAMA_ORIGINS` pour `ollama`. Ton et longueur par défaut.

Enregistrer : valider l'URL personnalisée ; demander la permission d'hôte par `chrome.permissions.request` directement dans le gestionnaire de clic, avant tout `await` ; enregistrer réglages et clé ; afficher la confirmation ou le refus.

Bouton « Tester la connexion » : génération courte par le port, affiche le succès ou l'erreur traduite. Bouton « Charger les modèles » : appelle `listModels` et remplit la `datalist`.

Acceptation : changer de fournisseur conserve la clé et le modèle de chacun ; aucune clé n'apparaît dans `chrome.storage.sync`.
Commit : `Rebuild options page around provider presets`

### Étape 10 — Popup

Fichiers : `src/popup/popup.html`, `src/popup/popup.js`.

Affiche le fournisseur et le modèle actifs, l'état (prêt, clé manquante, permission manquante), un bouton vers les options. Tout le texte passe par `localizePage`.

Commit : `Localize popup and show provider status`

### Étape 11 — Confidentialité, documentation, empaquetage

Fichiers : `docs/PRIVACY.md`, `README.md`, `scripts/package.ps1`, `.gitignore` (ajouter `dist/`).

- `PRIVACY.md`, en anglais et en français : l'extension n'a pas de serveur ; le contenu des emails et les consignes sont envoyés uniquement au fournisseur choisi par l'utilisateur, uniquement lors d'une génération qu'il déclenche ; les clés restent dans le stockage local du navigateur ; aucune collecte, aucune télémétrie, aucune revente.
- `README.md` : installation, configuration par fournisseur, note Ollama, lancement des tests.
- `package.ps1` (PowerShell 7) : lit la version dans `src/manifest.json` et produit `dist/ai-for-gmail-<version>.zip` dont la racine contient `manifest.json`.

Acceptation : le zip décompressé se charge dans Chrome.
Commit : `Add privacy policy, docs and packaging script`

### Étape 12 — Dossier de publication **[manuel]**

Fichier : `docs/STORE.md`.

Rédiger, en anglais et en français : description courte (132 caractères au plus) et longue ; énoncé de l'objectif unique de l'extension ; justification de chaque permission (`storage`, accès à `mail.google.com`, permissions d'hôte optionnelles) ; réponses au formulaire d'usage des données (contenu des emails traité et transmis au fournisseur choisi par l'utilisateur, rien de collecté par l'éditeur) ; liste des captures à produire (1280×800 : bouton dans Gmail, panneau en génération, page d'options).

Reste au propriétaire : points de la section 2, captures d'écran, passage de la version à `1.0.0`, envoi du zip, soumission à la revue.

Commit : `Add Chrome Web Store submission notes`

## 5. Après la v1

Raccourci clavier, modèles de consigne enregistrés, signature et style personnels, prise en compte des pièces jointes, portage Firefox et Edge.
