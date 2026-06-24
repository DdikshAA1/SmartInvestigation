import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";

const dbSync = new DatabaseSync(":memory:");
console.log("dbSync created:", dbSync);

const db = drizzle(dbSync);
console.log("drizzle instance created:", db);
