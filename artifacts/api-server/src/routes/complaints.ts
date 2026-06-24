import { Router, type IRouter } from "express";
import { db, complaintsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateComplaintBody,
  UpdateComplaintBody,
  GetComplaintParams,
  UpdateComplaintParams,
  AnalyzeComplaintParams,
  ListComplaintsQueryParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/complaints", async (req, res): Promise<void> => {
  const query = ListComplaintsQueryParams.safeParse(req.query);
  const { urgency, status, category } = query.success ? query.data : {};

  const conditions = [];
  if (urgency) conditions.push(eq(complaintsTable.urgency, urgency));
  if (status) conditions.push(eq(complaintsTable.status, status));
  if (category) conditions.push(eq(complaintsTable.category, category));

  const complaints = await (conditions.length > 0
    ? db.select().from(complaintsTable).where(and(...conditions))
    : db.select().from(complaintsTable))
    .orderBy(sql`${complaintsTable.createdAt} DESC`);

  res.json(complaints.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })));
});

router.post("/complaints", async (req, res): Promise<void> => {
  const parsed = CreateComplaintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [complaint] = await db.insert(complaintsTable).values({
    complainantName: parsed.data.complainantName,
    contactInfo: parsed.data.contactInfo,
    description: parsed.data.description,
    category: "uncategorized",
    urgency: "medium",
    status: "pending",
  }).returning();

  res.status(201).json({ ...complaint, createdAt: complaint.createdAt.toISOString(), updatedAt: complaint.updatedAt.toISOString() });
});

router.get("/complaints/:id", async (req, res): Promise<void> => {
  const params = GetComplaintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid complaint ID" });
    return;
  }

  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, params.data.id));
  if (!complaint) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }

  res.json({ ...complaint, createdAt: complaint.createdAt.toISOString(), updatedAt: complaint.updatedAt.toISOString() });
});

router.patch("/complaints/:id", async (req, res): Promise<void> => {
  const params = UpdateComplaintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid complaint ID" });
    return;
  }

  const parsed = UpdateComplaintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(complaintsTable).set(parsed.data).where(eq(complaintsTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.post("/complaints/:id/analyze", async (req, res): Promise<void> => {
  const params = AnalyzeComplaintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid complaint ID" });
    return;
  }

  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, params.data.id));
  if (!complaint) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }

  const prompt = `You are a law enforcement complaint analyst. Analyze this citizen complaint and return a JSON object with exactly these fields:
- urgency: one of "critical", "high", "medium", "low"
- category: one of "cybercrime", "fraud", "harassment", "identity-theft", "hacking", "phishing", "scam", "other"
- keywords: array of 3-6 key terms extracted from the complaint
- summary: 1-2 sentence executive summary
- recommendedAction: specific recommended next step for the officer
- sentiment: one of "hostile", "distressed", "concerned", "neutral"

Complaint text: "${complaint.description}"

Return ONLY valid JSON, no markdown, no explanation.`;

  let analysis: { urgency: string; category: string; keywords: string[]; summary: string; recommendedAction: string; sentiment: string } = {
    urgency: "medium", category: "other", keywords: [], summary: "AI analysis unavailable.", recommendedAction: "Configure OpenAI integration.", sentiment: "neutral"
  };
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    analysis = JSON.parse(content);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.warn({ err: msg }, "AI complaint analysis unavailable");
  }

  await db.update(complaintsTable).set({
    urgency: analysis.urgency,
    category: analysis.category,
    keywords: JSON.stringify(analysis.keywords),
    aiSummary: analysis.summary,
    status: "under-review",
  }).where(eq(complaintsTable.id, params.data.id));

  res.json({
    complaintId: params.data.id,
    urgency: analysis.urgency,
    category: analysis.category,
    keywords: analysis.keywords,
    summary: analysis.summary,
    recommendedAction: analysis.recommendedAction,
    sentiment: analysis.sentiment,
  });
});

export default router;
