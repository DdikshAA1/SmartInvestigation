import { Router, type IRouter } from "express";
import { db, casesTable, suspectsTable } from "@workspace/db";
import { eq, ilike, and, or, sql } from "drizzle-orm";
import {
  CreateCaseBody,
  UpdateCaseBody,
  GetCaseParams,
  UpdateCaseParams,
  DeleteCaseParams,
  GetCaseSuspectsParams,
  ListCasesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cases", async (req, res): Promise<void> => {
  const query = ListCasesQueryParams.safeParse(req.query);
  const { status, priority, search } = query.success ? query.data : {};

  let baseQuery = db.select().from(casesTable);
  const conditions = [];

  if (status) conditions.push(eq(casesTable.status, status));
  if (priority) conditions.push(eq(casesTable.priority, priority));
  if (search) conditions.push(or(ilike(casesTable.title, `%${search}%`), ilike(casesTable.description, `%${search}%`)));

  const cases = await (conditions.length > 0
    ? db.select().from(casesTable).where(and(...conditions))
    : db.select().from(casesTable))
    .orderBy(sql`${casesTable.createdAt} DESC`);

  res.json(cases.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })));
});

router.post("/cases", async (req, res): Promise<void> => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [newCase] = await db.insert(casesTable).values({
    title: parsed.data.title,
    type: parsed.data.type,
    priority: parsed.data.priority,
    description: parsed.data.description,
    officerAssigned: parsed.data.officerAssigned,
    notes: parsed.data.notes ?? null,
    status: "open",
  }).returning();

  res.status(201).json({ ...newCase, createdAt: newCase.createdAt.toISOString(), updatedAt: newCase.updatedAt.toISOString() });
});

router.get("/cases/:id", async (req, res): Promise<void> => {
  const params = GetCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, params.data.id));
  if (!caseRecord) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.json({ ...caseRecord, createdAt: caseRecord.createdAt.toISOString(), updatedAt: caseRecord.updatedAt.toISOString() });
});

router.patch("/cases/:id", async (req, res): Promise<void> => {
  const params = UpdateCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(casesTable).set(parsed.data).where(eq(casesTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/cases/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const [deleted] = await db.delete(casesTable).where(eq(casesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/cases/:id/suspects", async (req, res): Promise<void> => {
  const params = GetCaseSuspectsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const suspects = await db.select().from(suspectsTable);
  const filtered = suspects.filter((s) => {
    if (!s.caseIds) return false;
    try {
      const ids = JSON.parse(s.caseIds) as number[];
      return ids.includes(params.data.id);
    } catch {
      return false;
    }
  });

  res.json(filtered.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })));
});

export default router;
