# Gemini AI Integration

Google Generative AI (Gemini) integration for the Smart Investigation Dashboard.

## Setup

1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. Add the API key to your environment:
   ```bash
   export AI_INTEGRATIONS_GEMINI_API_KEY=your_api_key_here
   ```

   Or create a `.env.local` file in the project root:
   ```env
   AI_INTEGRATIONS_GEMINI_API_KEY=your_api_key_here
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

## Usage

### In Express Routes

```typescript
import { gemini } from "@workspace/integrations-gemini-ai-server";

// Get a specific model
const model = gemini.getModel("gemini-pro");

// Generate content
const result = await model.generateContent("Analyze this crime pattern...");
const response = result.response;
console.log(response.text());
```

### For Vision/Multimodal Content

```typescript
import { gemini } from "@workspace/integrations-gemini-ai-server";

const model = gemini.getModel("gemini-pro-vision");

const result = await model.generateContent([
  "What's in this image?",
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64ImageData,
    },
  },
]);
```

## Available Models

- `gemini-pro` - Text-based completions
- `gemini-pro-vision` - Multimodal (text + images)
- `gemini-1.5-pro` - Latest high-capability model
- `gemini-1.5-flash` - Fast, efficient model

## Error Handling

The module throws an error if `AI_INTEGRATIONS_GEMINI_API_KEY` is not set when methods are called:

```typescript
try {
  const model = gemini.getModel();
  // Use the model
} catch (error) {
  console.error("Gemini not configured:", error.message);
}
```

## Reference

- [Google Generative AI Docs](https://ai.google.dev/)
- [Node.js SDK Reference](https://ai.google.dev/tutorials/nodejs_quickstart)
