import { Router, type IRouter } from "express";
import { db, casesTable, complaintsTable, suspectsTable, alertsTable } from "@workspace/db";
import { count, eq, gte, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const [totalCasesRes] = await db.select({ count: count() }).from(casesTable);
  const [activeCasesRes] = await db.select({ count: count() }).from(casesTable).where(eq(casesTable.status, "active"));
  const [openComplaintsRes] = await db.select({ count: count() }).from(complaintsTable).where(eq(complaintsTable.status, "pending"));
  const [highPriorityAlertsRes] = await db.select({ count: count() }).from(alertsTable).where(eq(alertsTable.status, "active"));
  const [suspectsTrackedRes] = await db.select({ count: count() }).from(suspectsTable);
  const [resolvedRes] = await db.select({ count: count() }).from(casesTable).where(eq(casesTable.status, "closed"));

  const casesByStatusRaw = await db
    .select({ status: casesTable.status, count: count() })
    .from(casesTable)
    .groupBy(casesTable.status);

  const casesByTypeRaw = await db
    .select({ type: casesTable.type, count: count() })
    .from(casesTable)
    .groupBy(casesTable.type);

  res.json({
    totalCases: totalCasesRes?.count ?? 0,
    activeCases: activeCasesRes?.count ?? 0,
    openComplaints: openComplaintsRes?.count ?? 0,
    highPriorityAlerts: highPriorityAlertsRes?.count ?? 0,
    suspectsTracked: suspectsTrackedRes?.count ?? 0,
    resolvedThisMonth: resolvedRes?.count ?? 0,
    casesByStatus: casesByStatusRaw.map((r) => ({ status: r.status, count: r.count })),
    casesByType: casesByTypeRaw.map((r) => ({ type: r.type, count: r.count })),
  });
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const recentCases = await db
    .select()
    .from(casesTable)
    .orderBy(sql`${casesTable.createdAt} DESC`)
    .limit(5);

  const recentAlerts = await db
    .select()
    .from(alertsTable)
    .orderBy(sql`${alertsTable.createdAt} DESC`)
    .limit(5);

  const recentComplaints = await db
    .select()
    .from(complaintsTable)
    .orderBy(sql`${complaintsTable.createdAt} DESC`)
    .limit(3);

  const activities = [
    ...recentCases.map((c) => ({
      id: c.id,
      type: "case",
      title: `Case: ${c.title}`,
      description: `${c.type} — ${c.status} — ${c.priority} priority`,
      severity: c.priority,
      createdAt: c.createdAt.toISOString(),
    })),
    ...recentAlerts.map((a) => ({
      id: a.id + 1000,
      type: "alert",
      title: `Alert: ${a.title}`,
      description: a.description,
      severity: a.severity,
      createdAt: a.createdAt.toISOString(),
    })),
    ...recentComplaints.map((c) => ({
      id: c.id + 2000,
      type: "complaint",
      title: `Complaint: ${c.complainantName}`,
      description: c.description.slice(0, 100),
      severity: c.urgency,
      createdAt: c.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  res.json(activities);
});

export default router;
