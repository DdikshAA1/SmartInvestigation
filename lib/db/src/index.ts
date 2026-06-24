import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

const dataDir = process.env.PG_DATA_DIR || "./pglite-data";

export const client = new PGlite(dataDir);
export const db = drizzle(client, { schema });

// Auto-migration & seeding logic
const migrationSql = `
CREATE TABLE IF NOT EXISTS "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"officer_assigned" text NOT NULL,
	"suspect_ids" text,
	"evidence" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"complainant_name" text NOT NULL,
	"contact_info" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'uncategorized' NOT NULL,
	"urgency" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"keywords" text,
	"ai_summary" text,
	"linked_case_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "suspects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alias" text,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"national_id" text,
	"known_associates" text,
	"social_media_profiles" text,
	"notes" text,
	"case_ids" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text NOT NULL,
	"linked_case_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "osint_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"target" text NOT NULL,
	"target_type" text NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"summary" text NOT NULL,
	"flags" text DEFAULT '[]' NOT NULL,
	"suspicious_activity" text DEFAULT '[]' NOT NULL,
	"network_connections" text DEFAULT '[]' NOT NULL,
	"recommendation" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "crime_hotspots" (
	"id" serial PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"district" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"incident_count" integer DEFAULT 0 NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"primary_crime_type" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "crime_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"crime_type" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"change_percent" real DEFAULT 0 NOT NULL
);
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;

await client.waitReady;
await client.exec(migrationSql);

// Check and Seed Database
const result = await client.query("SELECT COUNT(*) FROM cases;");
const count = Number((result as any).rows[0].count);

if (count === 0) {
  console.log("Database is empty. Seeding mock data...");

  // Seed Cases
  await db.insert(schema.casesTable).values([
    {
      title: "Operation Darknet Phish",
      type: "Phishing",
      status: "active",
      priority: "high",
      description: "Investigation into a coordinated phishing ring targeting local government employees via spear phishing emails mimicking payroll updates.",
      officerAssigned: "Detective Sarah Connor",
      notes: "Phishing links resolve to external servers hosted on bulletproof hosts.",
    },
    {
      title: "Ransomware Attack on City Water System",
      type: "Ransomware",
      status: "open",
      priority: "critical",
      description: "SCADA systems infected with LockBit-variant ransomware. Demanding 12 BTC for decryption key.",
      officerAssigned: "Special Agent John Miller",
      notes: "Operations currently on analog fallback. Compromise entry point: compromised VPN credentials.",
    },
    {
      title: "Cryptocurrency Money Laundering Network",
      type: "Fraud",
      status: "open",
      priority: "medium",
      description: "Tracking multiple shell company bank accounts funneling funds to crypto OTC brokers to obfuscate proceeds from local business scams.",
      officerAssigned: "Inspector Robert Chen",
      notes: "Identified 3 active suspicious wallets.",
    },
    {
      title: "Social Engineering Campaign against Local Banks",
      type: "Identity Theft",
      status: "closed",
      priority: "low",
      description: "Suspects impersonating bank support personnel to acquire customer account PINs and personal IDs.",
      officerAssigned: "Detective Sarah Connor",
      notes: "Suspects identified and apprehended. Case closed.",
    }
  ]);

  // Seed Suspects
  await db.insert(schema.suspectsTable).values([
    {
      name: "Dmitry Ivanov",
      alias: "DarkWebKing",
      riskLevel: "critical",
      status: "active",
      nationalId: "RU-9827364",
      knownAssociates: "Elena Petrova, ShadowByte",
      socialMediaProfiles: "t.me/darkwebking_otc, twitter.com/d_ivanov_sec",
      notes: "Known administrator of cryptocurrency laundering mixer. Highly tech-savvy.",
      caseIds: "[2, 3]",
    },
    {
      name: "Kevin Mitnick Jr",
      alias: "ZeroDay",
      riskLevel: "high",
      status: "active",
      nationalId: "US-3829102",
      knownAssociates: "Dmitry Ivanov",
      socialMediaProfiles: "github.com/zeroday-exploit",
      notes: "Specializes in SCADA vulnerabilities and malware deployment.",
      caseIds: "[2]",
    },
    {
      name: "Elena Petrova",
      alias: "ShadowByte",
      riskLevel: "medium",
      status: "under_surveillance",
      nationalId: "UA-5749201",
      knownAssociates: "Dmitry Ivanov",
      socialMediaProfiles: "linkedin.com/elena-petrova-sec",
      notes: "Responsible for creating landing pages and template graphics for phishing campaigns.",
      caseIds: "[1]",
    }
  ]);

  // Seed Complaints
  await db.insert(schema.complaintsTable).values([
    {
      complainantName: "Alice Smith",
      contactInfo: "alice.smith@gmail.com",
      description: "I received a very convincing email claiming to be from our corporate payroll system. It asked me to confirm my login details, which I did. Later I noticed unauthorized login attempts.",
      category: "Phishing",
      urgency: "high",
      status: "investigating",
      keywords: "payroll, email, login, credentials",
      aiSummary: "Complainant fell victim to a spear phishing attack targeting payroll. Credentials compromised.",
      linkedCaseId: 1,
    },
    {
      complainantName: "Bob Jones",
      contactInfo: "bob.jones@metroparts.com",
      description: "Arrived at work this morning to find all our manufacturing management server files encrypted with a ransom demand on the screens. Most operations are offline.",
      category: "Ransomware",
      urgency: "critical",
      status: "pending",
      keywords: "ransomware, encrypted, offline, servers",
      aiSummary: "Severe ransomware infestation on MetroParts server network. SCADA systems vulnerable.",
      linkedCaseId: 2,
    },
    {
      complainantName: "Carol White",
      contactInfo: "555-0199",
      description: "An individual calling himself Bank Security called my phone, claimed my card was compromised, and asked for my PIN to cancel it. Soon after, $2000 was withdrawn.",
      category: "Fraud",
      urgency: "medium",
      status: "resolved",
      keywords: "phone call, impersonation, withdraw",
      aiSummary: "Vishing fraud case where caller successfully phished PIN and withdrew funds.",
      linkedCaseId: 4,
    }
  ]);

  // Seed Alerts
  await db.insert(schema.alertsTable).values([
    {
      title: "Brute Force SSH Attack",
      description: "IP 198.51.100.42 attempted 150 SSH logins in 2 minutes on the primary active directory controller.",
      severity: "critical",
      status: "active",
      source: "Firewall-IDS",
      linkedCaseId: 2,
    },
    {
      title: "Suspicious Large Crypto Transfer",
      description: "Wallet associated with Dmitry Ivanov transferred 45.2 BTC to a mixer OTC broker.",
      severity: "high",
      status: "active",
      source: "Crypto-Tracker",
      linkedCaseId: 3,
    },
    {
      title: "Data Exfiltration Alert",
      description: "Internal server uploaded 1.2GB of encrypted zip files to anonymous file hosting service 'filebin'.",
      severity: "high",
      status: "active",
      source: "SIEM-System",
      linkedCaseId: 1,
    }
  ]);

  // Seed Crime Hotspots
  await db.insert(schema.crimeHotspotsTable).values([
    {
      area: "Central District",
      district: "Sector 1",
      lat: 40.7128,
      lng: -74.0060,
      incidentCount: 52,
      riskLevel: "high",
      primaryCrimeType: "Phishing",
    },
    {
      area: "Tech Hub Zone",
      district: "Sector 3",
      lat: 40.7589,
      lng: -73.9851,
      incidentCount: 38,
      riskLevel: "critical",
      primaryCrimeType: "Hacking",
    },
    {
      area: "Financial Quarter",
      district: "Sector 2",
      lat: 40.7061,
      lng: -74.0091,
      incidentCount: 45,
      riskLevel: "high",
      primaryCrimeType: "Fraud",
    },
    {
      area: "Suburban Industrial Park",
      district: "Sector 5",
      lat: 40.7831,
      lng: -73.9712,
      incidentCount: 15,
      riskLevel: "low",
      primaryCrimeType: "Ransomware",
    }
  ]);

  // Seed Crime Patterns
  await db.insert(schema.crimePatternsTable).values([
    { month: "2026-01", crimeType: "Phishing", count: 30, changePercent: 5.0 },
    { month: "2026-01", crimeType: "Fraud", count: 20, changePercent: -2.0 },
    { month: "2026-01", crimeType: "Hacking", count: 10, changePercent: 0.0 },
    { month: "2026-02", crimeType: "Phishing", count: 32, changePercent: 6.6 },
    { month: "2026-02", crimeType: "Fraud", count: 22, changePercent: 10.0 },
    { month: "2026-02", crimeType: "Hacking", count: 12, changePercent: 20.0 },
    { month: "2026-03", crimeType: "Phishing", count: 35, changePercent: 9.3 },
    { month: "2026-03", crimeType: "Fraud", count: 21, changePercent: -4.5 },
    { month: "2026-03", crimeType: "Hacking", count: 15, changePercent: 25.0 },
    { month: "2026-04", crimeType: "Phishing", count: 42, changePercent: 20.0 },
    { month: "2026-04", crimeType: "Fraud", count: 25, changePercent: 19.0 },
    { month: "2026-04", crimeType: "Hacking", count: 16, changePercent: 6.6 },
    { month: "2026-05", crimeType: "Phishing", count: 45, changePercent: 7.1 },
    { month: "2026-05", crimeType: "Fraud", count: 28, changePercent: 12.0 },
    { month: "2026-05", crimeType: "Hacking", count: 18, changePercent: 12.5 }
  ]);

  console.log("Database seeded successfully!");
}

export * from "./schema";

