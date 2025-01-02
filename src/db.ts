import { Client, createClient } from "@libsql/client";

export type Env = {
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN?: string;
};

export const connectDb = async (env: Env): Promise<Client> => {
  try {
    const db = createClient({
      url: env.TURSO_DB_URL,
      authToken: env.TURSO_DB_AUTH_TOKEN,
    });

    await initDb(db);
    return db;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw new Error("Database connection failed.");
  }
};

const initDb = async (db: Client) => {
  try {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY,
        url TEXT NOT NULL,
        short_code VARCHAR(255) UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );
    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_short_code ON urls(short_code);"
    );
  } catch (error) {
    console.error("Error initializing database:", error);
    throw new Error("Database initialization failed.");
  }
};
