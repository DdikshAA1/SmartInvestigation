import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const osintReportsTable = pgTable("osint_reports", {
  id: serial("id").primaryKey(),
  target: text("target").notNull(),
  targetType: text("target_type").notNull(),
  riskScore: integer("risk_score").notNull().default(0),
  summary: text("summary").notNull(),
  flags: text("flags").notNull().default("[]"),
  suspiciousActivity: text("suspicious_activity").notNull().default("[]"),
  networkConnections: text("network_connections").notNull().default("[]"),
  recommendation: text("recommendation").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOsintReportSchema = createInsertSchema(osintReportsTable).omit({ id: true, createdAt: true });
export type InsertOsintReport = z.infer<typeof insertOsintReportSchema>;
export type OsintReport = typeof osintReportsTable.$inferSelect;
