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
    const testUrl = `https://example.com?query=${Date.now()}`;

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

  it("ensure duplicate URLs are not created", async () => {
    const testUrl = `https://example.com?timestamp=${Date.now()}`;

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

    // Test the /shorten endpoint again
    const shortenResponse2 = await app.request(
      "/shorten",
      {
        method: "POST",
        body: JSON.stringify({ url: testUrl }),
        headers: { "Content-Type": "application/json" },
      },
      mockEnv
    );

    expect(shortenResponse2.status).toBe(200);
    const shortenData2 = (await shortenResponse2.json()) as any;
    const shortCode2 = shortenData2.short_code;

    expect(shortCode2).toBeDefined();
    expect(shortCode2).toBe(shortCode);
  });

  it("ensure deleting a shortcode works", async () => {
    const testUrl = `https://example.com?delete=${Date.now()}`;

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

    // Test the /shortcode/:code endpoint
    const deleteResponse = await app.request(
      `/shortcode/${shortCode}`,
      { method: "DELETE" },
      mockEnv
    );

    expect(deleteResponse.status).toBe(200);
  });

  it("ensure empty URLs are not added", async () => {
    const testUrl = "";
    const shortenResponse = await app.request(
      "/shorten",
      {
        method: "POST",
        body: JSON.stringify({ url: testUrl }),
        headers: { "Content-Type": "application/json" },
      },
      mockEnv
    );

    expect(shortenResponse.status).toBe(400);
    const json = (await shortenResponse.json()) as any;
    expect(json.success).toBe(false);
    expect(json.errors).toBeDefined();
    expect(json.errors.url).toBeDefined();
    expect(json.errors.url._errors).toBeDefined();
  });
});
