import { Hono } from "hono";
import { and, eq } from "drizzle-orm";

import { connectDb, type Env } from "@db/index";
import { urlsTable } from "@db/schema";
import { zv } from "@middleware/zod-validator";
import { validateApiKey } from "@middleware/auth";
import {
  createUrlSchema,
  redirectUrlSchema,
  deleteUrlSchema,
} from "@validations/urls";
import { getSqid, ensureUrlHasScheme } from "@/utils";

const app = new Hono<{ Bindings: Env }>();

app.get("/", validateApiKey, async (c) => {
  const db = await connectDb(c.env);
  try {
    const urls = await db
      .select()
      .from(urlsTable)
      .where(eq(urlsTable.userId, c.var.user.id))
      .all();

    return c.json(urls);
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.post("/shorten", validateApiKey, zv("json", createUrlSchema), async (c) => {
  const db = await connectDb(c.env);
  try {
    const { url, shortCode: customShortCode, expiresAt } = c.req.valid("json");

    const shortCode = customShortCode ?? getSqid();

    const res = await db.insert(urlsTable).values({
      url,
      shortCode,
      userId: c.var.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
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
      .where(and(eq(urlsTable.shortCode, code)))
      .limit(1);

    if (urls.length === 0) {
      return c.json({ error: "URL not found" }, 404);
    }

    const urlObj = urls[0];

    if (urlObj.expiresAt && urlObj.expiresAt < new Date()) {
      return c.json({ error: "URL expired" }, 410);
    }

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

app.delete(
  "/shortcode/:code",
  validateApiKey,
  zv("param", deleteUrlSchema),
  async (c) => {
    const user = c.var.user;
    const db = await connectDb(c.env);

    try {
      const { code } = c.req.param();

      const urls = await db
        .select()
        .from(urlsTable)
        .where(eq(urlsTable.shortCode, code));

      if (urls.length === 0) {
        return c.json({ message: "URL not found" }, 404);
      }

      if (urls[0].userId !== user.id) {
        return c.json({ message: "Operation not allowed" }, 403);
      }

      const res = await db
        .delete(urlsTable)
        .where(eq(urlsTable.shortCode, code));

      if (res.rowsAffected === 0) {
        return c.json({ error: "URL not found" }, 404);
      }

      return c.json({ message: "URL deleted successfully" }, 200);
    } catch (error) {
      console.log(error);
      return c.json({ error: "Internal Server Error" }, 500);
    }
  },
);

export default app;
