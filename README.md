# AI for Gmail

Open-source Chrome extension that lets you write emails with any AI LLM directly inside Gmail.

## Features

- **AI Write** button in every Gmail compose toolbar
- Three actions: compose from scratch, reply to a thread, improve a draft
- Streaming output — see the response as it generates
- Seven built-in providers: OpenAI, Anthropic (Claude), Google Gemini, Mistral, OpenRouter, Ollama (local), plus any OpenAI-compatible endpoint
- Tone (neutral, formal, friendly, direct) and length (short, medium, long) controls
- Bilingual interface (English and French via `chrome.i18n`)
- API keys stay in browser local storage — requests go directly from your browser to the provider, no backend server

## Installation (developer mode)

1. Clone the repository
2. Open `chrome://extensions` and enable **Developer mode**
3. Click **Load unpacked** and select the `src/` folder
4. Open the extension options and configure your provider, model, and API key

## Provider setup

| Provider | API key | Notes |
|---|---|---|
| OpenAI | Required | |
| Anthropic | Required | |
| Google Gemini | Required | Uses the OpenAI-compatible endpoint |
| Mistral | Required | |
| OpenRouter | Required | |
| Ollama | None | Start with `OLLAMA_ORIGINS=chrome-extension://* ollama serve` |
| Custom | Optional | Any OpenAI-compatible endpoint (LM Studio, vLLM, etc.) |

## Running tests

```bash
npm test
```

Requires Node.js 20+. No dependencies to install — tests use `node:test`.

## Project structure

```
src/
  manifest.json             Manifest V3
  _locales/                 English and French translations
  lib/                      Shared modules (providers, storage, prompt, SSE, LLM adapters)
  background/               Service worker — streaming LLM calls via port messaging
  content/                  Gmail content scripts (DOM access, panel, button injection)
  popup/                    Extension popup — provider status
  options/                  Settings page — provider, model, API key, tone, length
  assets/icons/             Placeholder icons
tests/                      Unit tests (node:test)
docs/                       Development plan, privacy policy, store submission notes
```

## Privacy

No backend, no telemetry, no data collection. Email content is sent only to the provider you choose, only when you click Generate. See [docs/PRIVACY.md](docs/PRIVACY.md).

## License

MIT — see [LICENSE](LICENSE).
