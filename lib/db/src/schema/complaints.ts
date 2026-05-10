import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  complainantName: text("complainant_name").notNull(),
  contactInfo: text("contact_info").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("uncategorized"),
  urgency: text("urgency").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  keywords: text("keywords"),
  aiSummary: text("ai_summary"),
  linkedCaseId: integer("linked_case_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;
