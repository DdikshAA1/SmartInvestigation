import OpenAI from "openai";

const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

// Lazy client — only throws when AI methods are actually called,
// not at import/startup time. This allows the server to boot without
// OpenAI credentials and serve non-AI endpoints normally.
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!baseURL) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_BASE_URL must be set. Did you forget to provision the OpenAI AI integration?",
    );
  }
  if (!apiKey) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_API_KEY must be set. Did you forget to provision the OpenAI AI integration?",
    );
  }
  if (!_client) {
    _client = new OpenAI({ apiKey, baseURL });
  }
  return _client;
}

export const openai: Pick<OpenAI, "chat"> = {
  get chat() {
    return getClient().chat;
  },
};
