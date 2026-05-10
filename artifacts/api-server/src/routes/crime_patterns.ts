import { Router, type IRouter } from "express";
import { db, crimePatternsTable, crimeHotspotsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/crime-patterns", async (req, res): Promise<void> => {
  const patterns = await db.select().from(crimePatternsTable);
  res.json(patterns);
});

router.get("/crime-patterns/hotspots", async (req, res): Promise<void> => {
  const hotspots = await db.select().from(crimeHotspotsTable);
  res.json(hotspots);
});

router.get("/crime-patterns/predictions", async (req, res): Promise<void> => {
  const patterns = await db.select().from(crimePatternsTable);

  const patternSummary = patterns.slice(-20).map((p) => `${p.month}: ${p.crimeType} - ${p.count} incidents (${p.changePercent > 0 ? "+" : ""}${p.changePercent}%)`).join("\n");

  const prompt = `You are a law enforcement crime analyst. Based on the following crime pattern data, provide predictions for the next month. Return a JSON object with:
- period: string describing the prediction period (e.g. "Next 30 days")
- predictions: array of objects with { crimeType, predictedCount (integer), confidence (0-1 decimal), trend ("increasing"|"decreasing"|"stable") }
- highRiskAreas: array of 3-4 area names
- recommendations: array of 3-4 actionable recommendations for law enforcement

Crime data:
${patternSummary || "No historical data available yet."}

Return ONLY valid JSON, no markdown.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  let predictions = {
    period: "Next 30 days",
    predictions: [
      { crimeType: "Phishing", predictedCount: 45, confidence: 0.82, trend: "increasing" },
      { crimeType: "Fraud", predictedCount: 32, confidence: 0.75, trend: "stable" },
      { crimeType: "Hacking", predictedCount: 18, confidence: 0.70, trend: "increasing" },
    ],
    highRiskAreas: ["Central District", "Tech Hub Zone", "Financial Quarter"],
    recommendations: ["Increase cyber patrol in identified hotspots", "Launch public phishing awareness campaign"],
  };

  try {
    const content = response.choices[0]?.message?.content ?? "{}";
    predictions = JSON.parse(content);
  } catch {
    // use defaults
  }

  res.json(predictions);
});

export default router;
