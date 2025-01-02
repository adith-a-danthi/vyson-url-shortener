import { Hono } from "hono";
import { cors } from "hono/cors";
import { type Bindings, connectDb } from "./db";

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

export default app;
