import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".dev.vars" });

export default defineConfig({
  out: "./migrations",
  schema: "./src/db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
