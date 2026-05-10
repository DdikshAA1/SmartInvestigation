import { Router, type IRouter } from "express";
import { db, osintReportsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { AnalyzeOsintBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/osint/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeOsintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { target, targetType, context } = parsed.data;

  const prompt = `You are a law enforcement OSINT (Open Source Intelligence) analyst. Analyze the following ${targetType} target and return a JSON object with exactly these fields:
- riskScore: integer from 0-100 (0=no risk, 100=extreme risk)
- summary: 2-3 sentence executive summary of findings
- flags: array of 3-6 specific red flags found (strings)
- suspiciousActivity: array of 2-4 suspicious behaviors or patterns observed (strings)
- networkConnections: array of 2-4 notable connections or associations (strings)
- recommendation: specific recommended law enforcement action

Target: ${target}
Target Type: ${targetType}
${context ? `Additional Context: ${context}` : ""}

Simulate a realistic OSINT analysis based on the target type. Return ONLY valid JSON, no markdown, no explanation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  let analysis = {
    riskScore: 50,
    summary: "Analysis completed.",
    flags: [],
    suspiciousActivity: [],
    networkConnections: [],
    recommendation: "Continue monitoring.",
  };

  try {
    const content = response.choices[0]?.message?.content ?? "{}";
    analysis = JSON.parse(content);
  } catch {
    req.log.warn("Failed to parse AI OSINT analysis response");
  }

  const [report] = await db.insert(osintReportsTable).values({
    target,
    targetType,
    riskScore: analysis.riskScore,
    summary: analysis.summary,
    flags: JSON.stringify(analysis.flags),
    suspiciousActivity: JSON.stringify(analysis.suspiciousActivity),
    networkConnections: JSON.stringify(analysis.networkConnections),
    recommendation: analysis.recommendation,
  }).returning();

  res.json({
    id: report.id,
    target: report.target,
    targetType: report.targetType,
    riskScore: report.riskScore,
    summary: report.summary,
    flags: analysis.flags,
    suspiciousActivity: analysis.suspiciousActivity,
    networkConnections: analysis.networkConnections,
    recommendation: report.recommendation,
    createdAt: report.createdAt.toISOString(),
  });
});

router.get("/osint/reports", async (req, res): Promise<void> => {
  const reports = await db.select().from(osintReportsTable).orderBy(sql`${osintReportsTable.createdAt} DESC`);

  res.json(reports.map((r) => ({
    ...r,
    flags: (() => { try { return JSON.parse(r.flags); } catch { return []; } })(),
    suspiciousActivity: (() => { try { return JSON.parse(r.suspiciousActivity); } catch { return []; } })(),
    networkConnections: (() => { try { return JSON.parse(r.networkConnections); } catch { return []; } })(),
    createdAt: r.createdAt.toISOString(),
  })));
});

export default router;
