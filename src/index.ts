import { Hono } from "hono";
import { cors } from "hono/cors";

import { type Env, connectDb } from "./db";
import { ensureUrlHasScheme, getSqid } from "./utils";
import { urlsTable } from "./db/schema";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: Env }>();
app.use("/*", cors());

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/urls", async (c) => {
  const db = await connectDb(c.env);
  try {
    const urls = await db.select().from(urlsTable).all();
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
    const existingUrl = await db
      .select()
      .from(urlsTable)
      .where(eq(urlsTable.url, url))
      .limit(1);

    // If URL exists, return the existing record
    if (existingUrl.length > 0) {
      const record = existingUrl[0];
      return c.json(
        {
          id: record.id?.toString(),
          url: record.url,
          short_code: record.shortCode,
        },
        200
      );
    }

    // If URL doesn't exist, create new shortcode
    const shortCode = getSqid();
    const res = await db.insert(urlsTable).values({
      url,
      shortCode,
    });

    return c.json(
      {
        id: res.lastInsertRowid?.toString(),
        url,
        short_code: shortCode,
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
    const urls = await db
      .select()
      .from(urlsTable)
      .where(eq(urlsTable.shortCode, code))
      .limit(1);

    if (urls.length === 0) {
      return c.json({ error: "URL not found" }, 404);
    }

    return c.redirect(ensureUrlHasScheme(urls[0].url), 302);
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.delete("/shortcode/:code", async (c) => {
  const db = await connectDb(c.env);
  try {
    const { code } = c.req.param();

    const res = await db.delete(urlsTable).where(eq(urlsTable.shortCode, code));

    if (res.rowsAffected === 0) {
      return c.json({ error: "URL not found" }, 404);
    }
    return c.json({ message: "URL deleted successfully" }, 200);
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;
