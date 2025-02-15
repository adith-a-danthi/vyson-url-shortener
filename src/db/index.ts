import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

export type TursoDbEnv = {
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN?: string;
};

export const connectDb = async (env: TursoDbEnv): Promise<LibSQLDatabase> => {
  try {
    const turso = createClient({
      url: env.TURSO_DB_URL,
      authToken: env.TURSO_DB_AUTH_TOKEN,
    });
    const db = drizzle(turso);

    return db;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw new Error("Database connection failed.");
  }
};
