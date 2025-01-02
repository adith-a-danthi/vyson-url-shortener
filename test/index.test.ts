import { describe, it, expect } from "vitest";
import { config } from "dotenv";

import app from "../src/index";
import { type Env } from "../src/db";

config({ path: ".dev.vars" });

const mockEnv: Env = {
  TURSO_DB_URL: process.env.TURSO_DB_URL!,
  TURSO_DB_AUTH_TOKEN: process.env.TURSO_DB_AUTH_TOKEN,
};

describe("URL Shortener API", () => {
  it("should shorten a URL and redirect correctly", async () => {
    const testUrl = "https://example.com";

    // Test the /shorten endpoint
    const shortenResponse = await app.request(
      "/shorten",
      {
        method: "POST",
        body: JSON.stringify({ url: testUrl }),
        headers: { "Content-Type": "application/json" },
      },
      mockEnv
    );

    expect(shortenResponse.status).toBe(201);
    const shortenData = (await shortenResponse.json()) as any;
    const shortCode = shortenData.short_code;

    expect(shortCode).toBeDefined();

    // Test the /redirect endpoint
    const redirectResponse = await app.request(
      `/redirect?code=${shortCode}`,
      { method: "GET" },
      mockEnv
    );

    expect(redirectResponse.status).toBe(302);
    expect(redirectResponse.headers.get("Location")).toBe(testUrl);
  });
});
