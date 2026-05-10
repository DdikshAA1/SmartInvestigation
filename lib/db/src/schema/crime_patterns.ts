import { pgTable, text, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const crimePatternsTable = pgTable("crime_patterns", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(),
  crimeType: text("crime_type").notNull(),
  count: integer("count").notNull().default(0),
  changePercent: real("change_percent").notNull().default(0),
});

export const crimeHotspotsTable = pgTable("crime_hotspots", {
  id: serial("id").primaryKey(),
  area: text("area").notNull(),
  district: text("district").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  incidentCount: integer("incident_count").notNull().default(0),
  riskLevel: text("risk_level").notNull().default("medium"),
  primaryCrimeType: text("primary_crime_type").notNull(),
});

export const insertCrimePatternSchema = createInsertSchema(crimePatternsTable).omit({ id: true });
export type InsertCrimePattern = z.infer<typeof insertCrimePatternSchema>;
export type CrimePattern = typeof crimePatternsTable.$inferSelect;
