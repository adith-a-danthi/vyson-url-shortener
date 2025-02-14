import { connectDb, type Env } from "@db/index";
import { requestLogsTable } from "@db/schema";
import { getConnInfo } from "hono/cloudflare-workers";
import { createMiddleware } from "hono/factory";

export const requestLogger = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const { method, url } = c.req;
    const userAgent = c.req.header("User-Agent") ?? "N/A";

    const connInfo = getConnInfo(c);
    const ip = connInfo.remote.address ?? "N/A";

    const timestamp = new Date().toISOString();

    console.log(
      `[${timestamp}] ${method} ${url} - User-Agent: ${userAgent} - IP: ${ip}`,
    );

    next();

    const db = await connectDb(c.env);
    try {
      await db.insert(requestLogsTable).values({
        method,
        url,
        userAgent,
        ip,
        timestamp,
      });
    } catch (error) {
      console.log(error, "Failed to store request info");
    }
  },
);
