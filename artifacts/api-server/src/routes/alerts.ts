import { Router, type IRouter } from "express";
import { db, alertsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateAlertBody,
  UpdateAlertBody,
  UpdateAlertParams,
  ListAlertsQueryParams,
} from "@workspace/api-zod";

import { sendEmailNotification } from "../lib/mailer";

const router: IRouter = Router();

router.get("/alerts", async (req, res): Promise<void> => {
  const query = ListAlertsQueryParams.safeParse(req.query);
  const { severity, status } = query.success ? query.data : {};

  const conditions = [];
  if (severity) conditions.push(eq(alertsTable.severity, severity));
  if (status) conditions.push(eq(alertsTable.status, status));

  const alerts = await (conditions.length > 0
    ? db.select().from(alertsTable).where(and(...conditions))
    : db.select().from(alertsTable))
    .orderBy(sql`${alertsTable.createdAt} DESC`);

  res.json(alerts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })));
});

router.post("/alerts", async (req, res): Promise<void> => {
  const parsed = CreateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [alert] = await db.insert(alertsTable).values({
    title: parsed.data.title,
    description: parsed.data.description,
    severity: parsed.data.severity,
    source: parsed.data.source,
    linkedCaseId: parsed.data.linkedCaseId ?? null,
    status: "active",
  }).returning();

  // Async Email Dispatch to Admin dikshar1123@gmail.com
  const mailSubject = `🚨 EMERGENCY THREAT ALERT: [${alert.severity.toUpperCase()}] ${alert.title}`;
  const mailText = `
CRITICAL THREAT DISPATCH - VANGUARD INTEL
---------------------------------------------
Alert ID: #${alert.id}
Title: ${alert.title}
Severity: ${alert.severity.toUpperCase()}
Source System: ${alert.source}
Linked Case ID: ${alert.linkedCaseId ?? "None"}
Timestamp: ${new Date().toLocaleString()}

Description:
"${alert.description}"

Immediate Action Required: Log into Vanguard Dashboard for tactical response.
`;
  sendEmailNotification(mailSubject, mailText).catch(err => {
    console.error("Failed to send threat alert email to admin:", err);
  });

  res.status(201).json({ ...alert, createdAt: alert.createdAt.toISOString(), updatedAt: alert.updatedAt.toISOString() });
});

router.patch("/alerts/:id", async (req, res): Promise<void> => {
  const params = UpdateAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid alert ID" });
    return;
  }

  const parsed = UpdateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(alertsTable).set(parsed.data).where(eq(alertsTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

export default router;
