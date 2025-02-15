import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";

import { connectDb } from "@db/index";
import { type SelectUser, usersTable } from "@db/schema";
import type { Blacklist, ApplicationBindings } from "@/types";

export const validateApiKey = createMiddleware<{
  Bindings: ApplicationBindings;
  Variables: { user: SelectUser };
}>(async (c, next) => {
  const apiKey = c.req.header("x-api-key");
  if (!apiKey) {
    return c.json({ error: "Missing API Key" }, 401);
  }

  const db = await connectDb(c.env);
  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.apiKey, apiKey))
      .limit(1);

    if (users.length === 0) {
      return c.json({ error: "Invalid API Key" }, 401);
    }

    c.set("user", users[0]);

    return next();
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export const requireEnterpriseTier = createMiddleware<{
  Bindings: ApplicationBindings;
  Variables: { user: SelectUser };
}>(async (c, next) => {
  if (c.var.user.tier !== "enterprise") {
    return c.json({ error: "Operation not allowed" }, 403);
  }

  return next();
});

export const blacklistCheck = createMiddleware<{
  Bindings: ApplicationBindings;
  Variables: { user: SelectUser };
}>(async (c, next) => {
  try {
    const blacklist = await c.env.BLACKLIST.get<Blacklist>("blacklist", "json");

    if (blacklist?.blacklistedKeys.includes(c.var?.user?.apiKey)) {
      return c.json({ error: "Operation not allowed" }, 403);
    }

    return next();
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});
