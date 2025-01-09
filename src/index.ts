import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Env } from "@db/index";
import urls from "@routes/urls";
import users from "@routes/users";

const app = new Hono<{ Bindings: Env }>();
app.use(cors());

app.get("/", (c) => c.text("Eh, What's up doc?"));

app.route("/users", users);
app.route("/urls", urls);

export default app;
