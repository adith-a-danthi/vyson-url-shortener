import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { connectDb, type Env } from "@db/index";
import { zv } from "@middleware/zod-validator";
import { createUserSchema, getUsersSchema } from "@validations/users";
import { usersTable } from "@db/schema";
import { LibsqlError } from "@libsql/client";

const app = new Hono<{ Bindings: Env }>();

app.post("/", zv("json", createUserSchema), async (c) => {
  const db = await connectDb(c.env);
  try {
    const { email, name } = c.req.valid("json");

    const apiKey = crypto.randomUUID();

    const res = await db.insert(usersTable).values({
      email,
      name,
      apiKey,
    });

    return c.json(
      {
        id: res.lastInsertRowid?.toString(),
        email,
        name,
        api_key: apiKey,
      },
      201,
    );
  } catch (error) {
    if (error instanceof LibsqlError && error.code === "SQLITE_CONSTRAINT") {
      return c.json({ message: "User with this email already exists" }, 409);
    }

    return c.json({ message: "Internal Server Error" }, 500);
  }
});

app.get("/", zv("query", getUsersSchema), async (c) => {
  const db = await connectDb(c.env);
  try {
    const { email } = c.req.query();

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (users.length === 0) {
      return c.json({ message: "User not found" }, 404);
    }

    return c.json(users, 200);
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;
