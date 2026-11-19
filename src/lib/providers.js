export const PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    needsKey: true,
    defaultModel: "gpt-4o-mini",
    suggestions: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3-mini"]
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    needsKey: true,
    defaultModel: "claude-sonnet-5-5",
    suggestions: ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"]
  },
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    needsKey: true,
    defaultModel: "gemini-2.5-flash",
    suggestions: ["gemini-2.5-flash", "gemini-2.5-pro"]
  },
  {
    id: "mistral",
    label: "Mistral",
    kind: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    needsKey: true,
    defaultModel: "mistral-small-latest",
    suggestions: ["mistral-small-latest", "mistral-large-latest"]
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    needsKey: true,
    defaultModel: "openai/gpt-4o-mini",
    suggestions: ["openai/gpt-4o-mini", "anthropic/claude-sonnet-5-5", "google/gemini-2.5-flash"]
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    kind: "openai",
    baseUrl: "http://localhost:11434/v1",
    needsKey: false,
    defaultModel: "llama3.2",
    suggestions: ["llama3.2", "mistral", "gemma2"]
  },
  {
    id: "custom",
    label: "Custom endpoint",
    kind: "openai",
    baseUrl: "",
    needsKey: false,
    defaultModel: "",
    suggestions: []
  }
];

export function getProvider(id) {
  return PROVIDERS.find(p => p.id === id);
}

export function resolveBaseUrl(provider, settings) {
  if (provider.id === "custom") {
    const url = settings.customBaseUrl || "";
    return url.replace(/\/+$/, "");
  }
  return provider.baseUrl;
}

export function originPattern(baseUrl) {
  try {
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}/*`;
  } catch {
    return baseUrl;
  }
}
