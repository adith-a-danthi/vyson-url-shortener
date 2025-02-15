import { Hono } from "hono";
import { and, eq } from "drizzle-orm";

import { connectDb } from "@db/index";
import { urlsTable } from "@db/schema";
import { zv } from "@middleware/zod-validator";
import {
  blacklistCheck,
  requireEnterpriseTier,
  validateApiKey,
} from "@middleware/auth";
import {
  createUrlSchema,
  redirectUrlSchema,
  deleteUrlSchema,
  createUrlBatchSchema,
  updateUrlSchema,
  updateUrlParamsSchema,
} from "@validations/urls";
import {
  getSqid,
  ensureUrlHasScheme,
  validatePassword,
  hashPassword,
} from "@/utils";
import type { ApplicationBindings } from "@/types";

const app = new Hono<{ Bindings: ApplicationBindings }>();

app.get("/", validateApiKey, blacklistCheck, async (c) => {
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

app.post(
  "/shorten",
  validateApiKey,
  blacklistCheck,
  zv("json", createUrlSchema),
  async (c) => {
    const db = await connectDb(c.env);
    try {
      const {
        url,
        shortCode: customShortCode,
        expiresAt,
        password,
      } = c.req.valid("json");

      const shortCode = customShortCode ?? getSqid();
      const passwordHash = password ? await hashPassword(password) : null;

      const res = await db
        .insert(urlsTable)
        .values({
          url,
          shortCode,
          userId: c.var.user.id,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          password: passwordHash,
        })
        .returning({
          id: urlsTable.id,
          url: urlsTable.url,
          short_code: urlsTable.shortCode,
          expires_at: urlsTable.expiresAt,
        });

      return c.json({ ...res[0] }, 201);
    } catch (error) {
      console.log(error);
      return c.json({ error: "Internal Server Error" }, 500);
    }
  },
);

app.post(
  "/shorten/batch",
  validateApiKey,
  blacklistCheck,
  requireEnterpriseTier,
  zv("json", createUrlBatchSchema),
  async (c) => {
    const db = await connectDb(c.env);
    try {
      const { urls } = c.req.valid("json");

      const res = await db
        .insert(urlsTable)
        .values(
          urls.map(({ url, shortCode, expiresAt }) => ({
            url,
            shortCode: shortCode ?? getSqid(),
            userId: c.var.user.id,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          })),
        )
        .returning({
          id: urlsTable.id,
          url: urlsTable.url,
          short_code: urlsTable.shortCode,
          expires_at: urlsTable.expiresAt,
        });

      return c.json({ urls: res }, 201);
    } catch (error) {
      console.log(error);
      return c.json({ error: "Internal Server Error" }, 500);
    }
  },
);

app.get("/redirect", zv("query", redirectUrlSchema), async (c) => {
  const db = await connectDb(c.env);
  try {
    const { code, pw } = c.req.query();
    const urls = await db
      .select()
      .from(urlsTable)
      .where(and(eq(urlsTable.shortCode, code)))
      .limit(1);

    if (urls.length === 0) {
      return c.json({ error: "URL not found" }, 404);
    }

    const urlObj = urls[0];

    if (urlObj.password) {
      if (!pw) {
        return c.json({ error: "Operation not allowed" }, 403);
      }

      const isValid = await validatePassword(pw, urlObj.password);
      if (!isValid) {
        return c.json({ error: "Unauthorized" }, 401);
      }
    }

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
  blacklistCheck,
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

app.patch(
  "/:id",
  validateApiKey,
  blacklistCheck,
  zv("param", updateUrlParamsSchema),
  zv("json", updateUrlSchema),
  async (c) => {
    const user = c.var.user;
    const db = await connectDb(c.env);

    try {
      const { expiresAt, password } = c.req.valid("json");
      const { id } = c.req.valid("param");

      const urls = await db
        .select()
        .from(urlsTable)
        .where(eq(urlsTable.id, id))
        .limit(1);

      if (urls.length === 0) {
        return c.json({ error: "URL not found" }, 404);
      }

      if (urls[0].userId !== user.id) {
        return c.json({ error: "Operation not allowed" }, 403);
      }

      const res = await db
        .update(urlsTable)
        .set({
          ...(expiresAt !== undefined
            ? { expiresAt: expiresAt ? new Date(expiresAt) : null }
            : {}),
          ...(password !== undefined ? { password } : {}),
        })
        .where(eq(urlsTable.id, id))
        .returning({
          id: urlsTable.id,
          url: urlsTable.url,
          short_code: urlsTable.shortCode,
          expires_at: urlsTable.expiresAt,
        });

      if (res.length === 0) {
        return c.json({ error: "Internal Server Error" }, 500);
      }

      return c.json({ ...res[0] }, 200);
    } catch (error) {
      console.log(error);
      return c.json({ error: "Internal Server Error" }, 500);
    }
  },
);

export default app;
