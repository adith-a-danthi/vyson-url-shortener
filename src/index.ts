import { Hono } from "hono";
import { cors } from "hono/cors";

import { type Env, connectDb } from "./db";
import { ensureUrlHasScheme, getSqid } from "./utils";

const app = new Hono<{ Bindings: Env }>();
app.use("/*", cors());

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/urls", async (c) => {
  const db = await connectDb(c.env);
  try {
    const { rows: urls } = await db.execute("SELECT * FROM urls;");
    return c.json(urls);
  } catch (error) {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.post("/shorten", async (c) => {
  const db = await connectDb(c.env);
  try {
    const { url } = await c.req.json();
    // First check if the URL already exists
    const existingUrl = await db.execute({
      sql: "SELECT * FROM urls WHERE url = ? LIMIT 1",
      args: [url],
    });

    // If URL exists, return the existing record
    if (existingUrl.rows.length > 0) {
      const record = existingUrl.rows[0];
      return c.json(
        {
          id: record.id?.toString(),
          url: record.url,
          short_code: record.short_code,
        },
        200
      );
    }

    // If URL doesn't exist, create new shortcode
    const short_code = getSqid();
    const res = await db.execute({
      sql: "INSERT INTO urls (url, short_code) VALUES (?, ?)",
      args: [url, short_code],
    });

    return c.json(
      {
        id: res.lastInsertRowid?.toString(),
        url,
        short_code,
      },
      201
    );
  } catch (error: any) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.get("/redirect", async (c) => {
  const db = await connectDb(c.env);
  try {
    const { code } = c.req.query();
    const { rows: urls } = await db.execute({
      sql: `SELECT * FROM urls WHERE short_code = ?`,
      args: [code],
    });

    if (urls.length === 0) {
      return c.json({ error: "URL not found" }, 404);
    }

    return c.redirect(ensureUrlHasScheme(urls[0].url as string), 302);
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;
