import { Router, type IRouter } from "express";
import { db, suspectsTable } from "@workspace/db";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import {
  CreateSuspectBody,
  UpdateSuspectBody,
  GetSuspectParams,
  UpdateSuspectParams,
  ListSuspectsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/suspects/network", async (req, res): Promise<void> => {
  const suspects = await db.select().from(suspectsTable);

  const nodes = suspects.map((s) => ({
    id: s.id,
    name: s.name,
    riskLevel: s.riskLevel,
    status: s.status,
  }));

  const edges: { source: number; target: number; relationship: string }[] = [];
  for (const suspect of suspects) {
    if (suspect.knownAssociates) {
      let resolvedIds: number[] = [];
      try {
        const parsed = JSON.parse(suspect.knownAssociates);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === "number") {
              resolvedIds.push(item);
            } else if (typeof item === "string") {
              const matched = suspects.find(
                (s) => s.name.toLowerCase() === item.trim().toLowerCase() || s.alias?.toLowerCase() === item.trim().toLowerCase()
              );
              if (matched) resolvedIds.push(matched.id);
            }
          }
        }
      } catch {
        // Fallback: parse as comma-separated string of names/aliases
        const names = suspect.knownAssociates.split(",").map((n) => n.trim()).filter(Boolean);
        for (const name of names) {
          const matched = suspects.find(
            (s) => s.name.toLowerCase() === name.toLowerCase() || s.alias?.toLowerCase() === name.toLowerCase()
          );
          if (matched) resolvedIds.push(matched.id);
        }
      }

      for (const id of resolvedIds) {
        if (suspects.some((s) => s.id === id)) {
          if (!edges.some((e) => e.source === suspect.id && e.target === id)) {
            edges.push({ source: suspect.id, target: id, relationship: "known-associate" });
          }
        }
      }
    }
  }

  res.json({ nodes, edges });
});

router.get("/suspects", async (req, res): Promise<void> => {
  const query = ListSuspectsQueryParams.safeParse(req.query);
  const { search, riskLevel } = query.success ? query.data : {};

  const conditions = [];
  if (riskLevel) conditions.push(eq(suspectsTable.riskLevel, riskLevel));
  if (search) conditions.push(or(ilike(suspectsTable.name, `%${search}%`), ilike(suspectsTable.alias, `%${search}%`)));

  const suspects = await (conditions.length > 0
    ? db.select().from(suspectsTable).where(and(...conditions))
    : db.select().from(suspectsTable))
    .orderBy(sql`${suspectsTable.createdAt} DESC`);

  res.json(suspects.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })));
});

router.post("/suspects", async (req, res): Promise<void> => {
  const parsed = CreateSuspectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [suspect] = await db.insert(suspectsTable).values({
    name: parsed.data.name,
    alias: parsed.data.alias ?? null,
    riskLevel: parsed.data.riskLevel,
    nationalId: parsed.data.nationalId ?? null,
    socialMediaProfiles: parsed.data.socialMediaProfiles ?? null,
    notes: parsed.data.notes ?? null,
    status: "active",
  }).returning();

  res.status(201).json({ ...suspect, createdAt: suspect.createdAt.toISOString(), updatedAt: suspect.updatedAt.toISOString() });
});

router.get("/suspects/:id", async (req, res): Promise<void> => {
  const params = GetSuspectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid suspect ID" });
    return;
  }

  const [suspect] = await db.select().from(suspectsTable).where(eq(suspectsTable.id, params.data.id));
  if (!suspect) {
    res.status(404).json({ error: "Suspect not found" });
    return;
  }

  res.json({ ...suspect, createdAt: suspect.createdAt.toISOString(), updatedAt: suspect.updatedAt.toISOString() });
});

router.patch("/suspects/:id", async (req, res): Promise<void> => {
  const params = UpdateSuspectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid suspect ID" });
    return;
  }

  const parsed = UpdateSuspectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(suspectsTable).set(parsed.data).where(eq(suspectsTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Suspect not found" });
    return;
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

export default router;
