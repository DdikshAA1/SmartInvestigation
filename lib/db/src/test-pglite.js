import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

try {
  const client = new PGlite();
  console.log("PGlite client created successfully.");
  const db = drizzle(client);
  console.log("drizzle instance created successfully:", db);
} catch (err) {
  console.error("Error initializing PGlite/drizzle:", err);
}
