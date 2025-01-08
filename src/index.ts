import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";

import { urlsTable } from "@db/schema";
import { type Env, connectDb } from "@db/index";
import { ensureUrlHasScheme, getSqid } from "./utils";
import {
  createUrlSchema,
  deleteUrlSchema,
  redirectUrlSchema,
} from "@validations/urls";
import { zv } from "@middleware/zod-validator";

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

app.post("/shorten", zv("json", createUrlSchema), async (c) => {
  const db = await connectDb(c.env);
  try {
    const { url } = c.req.valid("json");

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
      201,
    );
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.get("/redirect", zv("query", redirectUrlSchema), async (c) => {
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

    const urlObj = urls[0];

    const res = await db
      .update(urlsTable)
      .set({ clicks: urlObj.clicks + 1, lastAccessedAt: new Date() })
      .where(eq(urlsTable.id, urlObj.id));

    if (res.rowsAffected === 0) {
      return c.json({ error: "Internal Server Error" }, 500);
    }

    return c.redirect(ensureUrlHasScheme(urlObj.url), 302);
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.delete("/shortcode/:code", zv("param", deleteUrlSchema), async (c) => {
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
