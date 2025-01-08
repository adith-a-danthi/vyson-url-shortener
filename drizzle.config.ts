import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".dev.vars" });

export default defineConfig({
  out: "./.drizzle/migrations",
  schema: "./src/db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion:
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_DB_AUTH_TOKEN,
  },
  tablesFilter: ["urls"],
});
