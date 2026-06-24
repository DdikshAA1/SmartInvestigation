import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL || "postgres://localhost/dummy";

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});

