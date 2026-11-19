# AI for Gmail

Extension Chrome open source qui permet de rédiger des emails avec n'importe quel LLM, directement dans l'interface de Gmail.

## Fonctionnalités

- Bouton **AI Write** dans la barre d'outils de chaque fenêtre de rédaction Gmail
- Prise en compte du fil de discussion ouvert pour rédiger une réponse pertinente
- Choix du fournisseur : OpenAI, Anthropic (Claude), ou tout endpoint compatible OpenAI (Ollama, LM Studio, Mistral, OpenRouter…)
- La clé API reste dans le stockage de l'extension ; les requêtes partent directement du navigateur vers le fournisseur choisi, sans serveur intermédiaire

## Installation (mode développeur)

1. Cloner le dépôt
2. Ouvrir `chrome://extensions` et activer le **Mode développeur**
3. Cliquer sur **Charger l'extension non empaquetée** et sélectionner le dossier `src/`
4. Ouvrir les options de l'extension, choisir le fournisseur, le modèle et saisir la clé API

## Structure

```
src/
  manifest.json        Manifest V3
  background/          Service worker : appels aux API LLM
  content/             Script injecté dans Gmail (bouton + panneau)
  popup/               Popup de l'icône d'extension
  options/             Page de configuration
  assets/icons/        Icônes
```

## Feuille de route

- Publication sur le Chrome Web Store
- Réponses en streaming
- Choix du ton et de la longueur
- Internationalisation de l'interface
