import { Hono } from "hono";
import { cors } from "hono/cors";
import { sql } from "drizzle-orm";

import { connectDb } from "@db/index";
import urls from "@routes/urls";
import users from "@routes/users";
import { requestLogger } from "@middleware/logger";
import { timing, type TimingVariables } from "hono/timing";
import { blacklistCheck } from "@middleware/auth";
import type { ApplicationBindings } from "./types";

const app = new Hono<{
  Bindings: ApplicationBindings & TimingVariables;
}>();
app.use(cors());
app.use(timing());
app.use(requestLogger);

app.get("/test", blacklistCheck, async (c) => {
  try {
    const keyList = await c.env.BLACKLIST.list();

    return c.json({ message: "Server Health", data: keyList }, 200);
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.get("/", (c) => c.text("Eh, What's up doc?"));

app.get("/health", async (c) => {
  const db = await connectDb(c.env);
  try {
    // Check database connectivity by running a simple query
    await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(sql`sqlite_master`)
      .where(sql`type = 'table'`);

    return c.json({ status: "healthy", database: "connected" }, 200);

    // biome-ignore lint/suspicious/noExplicitAny:
  } catch (error: any) {
    console.error(error);
    return c.json(
      { status: "unhealthy", database: "disconnected", error: error.message },
      500,
    );
  }
});

app.route("/users", users);
app.route("/urls", urls);

export default app;
