import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

// Lazy client — only throws when AI methods are actually called,
// not at import/startup time. This allows the server to boot without
// Gemini credentials and serve non-AI endpoints normally.
let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!apiKey) {
    throw new Error(
      "AI_INTEGRATIONS_GEMINI_API_KEY must be set. Did you forget to provision the Gemini AI integration?",
    );
  }
  if (!_client) {
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

export function getGeminiModel(model: string = "gemini-pro") {
  return getClient().getGenerativeModel({ model });
}

export const gemini = {
  getModel: getGeminiModel,
  get client() {
    return getClient();
  },
};
