import { describe, it, expect } from "vitest";
import { config } from "dotenv";

import app from "@/index";
import type { Env } from "@/db";

config({ path: ".dev.vars" });

const mockEnv: Env = {
  // biome-ignore lint/style/noNonNullAssertion:
  TURSO_DB_URL: process.env.TURSO_DB_URL!,
  TURSO_DB_AUTH_TOKEN: process.env.TURSO_DB_AUTH_TOKEN,
};

describe("user routes", () => {
  const email1 = `test.${Date.now()}@example.com`;
  it("should create a new user", async () => {
    const response = await app.request(
      "/users",
      {
        method: "POST",
        body: JSON.stringify({ email: email1 }),
        headers: { "Content-Type": "application/json" },
      },
      mockEnv,
    );

    expect(response.status).toBe(201);
  });

  it("should not create a new user with an existing email", async () => {
    const response = await app.request(
      "/users",
      {
        method: "POST",
        body: JSON.stringify({ email: email1 }),
        headers: { "Content-Type": "application/json" },
      },
      mockEnv,
    );

    expect(response.status).toBe(409);
  });
});
