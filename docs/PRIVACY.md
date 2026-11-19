# Privacy Policy — AI for Gmail

*Last updated: 2026-11-19*

## English

AI for Gmail is a browser extension that helps you write emails using AI language models directly inside Gmail.

### What data is processed

- **Email content and instructions:** When you trigger a generation, the extension sends your instruction, the relevant email thread (for replies), or your draft (for improvements) to the AI provider you have chosen in the settings. This data is sent **only** at the moment you click "Generate", never automatically.
- **API key:** Your API key is stored in your browser's local storage (`chrome.storage.local`) and is sent only to the provider you selected. It is never synchronized across devices, never sent to any other server, and never logged.

### What data is NOT collected

- The extension has **no backend server**. There is no telemetry, no analytics, no crash reporting.
- No data is collected, stored, or sold by the extension developer.
- No data is shared with any third party other than the AI provider you explicitly choose and configure.

### Permissions

| Permission | Why |
|---|---|
| `storage` | Save your settings and API key locally in the browser. |
| `https://mail.google.com/*` | Inject the AI writing button and panel into Gmail. |
| Optional host permissions | Connect to the AI provider you selected (e.g., OpenAI, Anthropic). Requested only when you save settings. |

### Your control

You can remove your API key and all settings at any time from the extension's options page. Uninstalling the extension removes all stored data.

---

## Français

AI for Gmail est une extension de navigateur qui vous aide à rédiger des emails avec des modèles d'IA directement dans Gmail.

### Quelles données sont traitées

- **Contenu des emails et consignes :** Lorsque vous déclenchez une génération, l'extension envoie votre consigne, le fil de conversation (pour les réponses) ou votre brouillon (pour les améliorations) au fournisseur d'IA que vous avez choisi dans les paramètres. Ces données ne sont envoyées **qu'au moment** où vous cliquez sur « Générer », jamais automatiquement.
- **Clé API :** Votre clé API est stockée dans le stockage local du navigateur (`chrome.storage.local`) et n'est envoyée qu'au fournisseur sélectionné. Elle n'est jamais synchronisée entre appareils, jamais envoyée à un autre serveur, et jamais enregistrée dans des journaux.

### Quelles données ne sont PAS collectées

- L'extension n'a **aucun serveur**. Il n'y a ni télémétrie, ni analyse, ni rapport d'erreur.
- Aucune donnée n'est collectée, stockée ou vendue par le développeur de l'extension.
- Aucune donnée n'est partagée avec un tiers autre que le fournisseur d'IA que vous choisissez et configurez explicitement.

### Permissions

| Permission | Pourquoi |
|---|---|
| `storage` | Sauvegarder vos paramètres et votre clé API localement dans le navigateur. |
| `https://mail.google.com/*` | Injecter le bouton et le panneau d'écriture IA dans Gmail. |
| Permissions d'hôte optionnelles | Se connecter au fournisseur d'IA sélectionné (ex. OpenAI, Anthropic). Demandées uniquement lors de l'enregistrement des paramètres. |

### Votre contrôle

Vous pouvez supprimer votre clé API et tous vos paramètres à tout moment depuis la page d'options de l'extension. La désinstallation de l'extension supprime toutes les données stockées.
