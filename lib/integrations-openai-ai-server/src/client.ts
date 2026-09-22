import OpenAI from "openai";

function getClient(): OpenAI {
  const rawKey =
    process.env.GROQ_API_KEY ||
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY;

  if (!rawKey) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_API_KEY or GROQ_API_KEY must be set.",
    );
  }

  const isGroqKey = rawKey.startsWith("gsk_") || Boolean(process.env.GROQ_API_KEY);
  const baseURL =
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
    (isGroqKey ? "https://api.groq.com/openai/v1" : undefined);

  if (!_client) {
    _client = new OpenAI({ apiKey: rawKey, baseURL });
  }
  return _client;
}

let _client: OpenAI | null = null;

export const openai: Pick<OpenAI, "chat"> = {
  get chat() {
    return getClient().chat;
  },
};

