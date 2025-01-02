import { Hono } from "hono";
import { cors } from "hono/cors";
import Sqids from "sqids";

import { type Bindings, connectDb } from "./db";
import { ensureUrlHasScheme } from "./utils";

const app = new Hono<{ Bindings: Bindings }>();
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

    const sqids = new Sqids();
    const short_code = sqids.encode([Date.now()]);

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
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;
