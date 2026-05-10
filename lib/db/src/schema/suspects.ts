import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const suspectsTable = pgTable("suspects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  alias: text("alias"),
  riskLevel: text("risk_level").notNull().default("medium"),
  status: text("status").notNull().default("active"),
  nationalId: text("national_id"),
  knownAssociates: text("known_associates"),
  socialMediaProfiles: text("social_media_profiles"),
  notes: text("notes"),
  caseIds: text("case_ids"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSuspectSchema = createInsertSchema(suspectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSuspect = z.infer<typeof insertSuspectSchema>;
export type Suspect = typeof suspectsTable.$inferSelect;
