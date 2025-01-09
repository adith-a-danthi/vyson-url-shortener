import { describe, beforeAll, expect, it } from "vitest";
import { config } from "dotenv";

import type { Env } from "@db/index";
import type { SelectUrl, SelectUser } from "@db/schema";
import type { ObjectKeysToSnakeCase } from "@/utils";
import app from "@/index";

config({ path: ".dev.vars" });

const mockEnv: Env = {
  // biome-ignore lint/style/noNonNullAssertion:
  TURSO_DB_URL: process.env.TURSO_DB_URL!,
  TURSO_DB_AUTH_TOKEN: process.env.TURSO_DB_AUTH_TOKEN,
};

type User = ObjectKeysToSnakeCase<Pick<SelectUser, "id" | "email" | "apiKey">>;
type UrlObj = ObjectKeysToSnakeCase<
  Pick<SelectUrl, "id" | "url" | "shortCode">
>;

describe("url routes", () => {
  const email1 = `test3.${Date.now()}@example.com`;
  const email2 = `test4.${Date.now()}@example.com`;

  let user1: User;
  let user2: User;

  beforeAll(async () => {
    const res1 = await app.request(
      "/users",
      {
        method: "POST",
        body: JSON.stringify({ email: email1 }),
        headers: { "Content-Type": "application/json" },
      },
      mockEnv,
    );
    expect(res1.status).toBe(201);

    user1 = await res1.json();

    const res2 = await app.request(
      "/users",
      {
        method: "POST",
        body: JSON.stringify({ email: email2 }),
        headers: { "Content-Type": "application/json" },
      },
      mockEnv,
    );

    expect(res2.status).toBe(201);

    user2 = await res2.json();
  });

  it("should shorten a URL and redirect correctly", async () => {
    const testUrl = `https://example.com?query=${Date.now()}`;

    // Test the /shorten endpoint
    const shortenResponse = await app.request(
      "/urls/shorten",
      {
        method: "POST",
        body: JSON.stringify({ url: testUrl }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": user1.api_key,
        },
      },
      mockEnv,
    );

    expect(shortenResponse.status).toBe(201);
    const shortenData: UrlObj = await shortenResponse.json();
    const shortCode = shortenData.short_code;

    expect(shortCode).toBeDefined();

    // Test the /redirect endpoint
    const redirectResponse = await app.request(
      `/urls/redirect?code=${shortCode}`,
      { method: "GET" },
      mockEnv,
    );

    expect(redirectResponse.status).toBe(302);
    expect(redirectResponse.headers.get("Location")).toBe(testUrl);
  });

  it("ensure deleting a shortcode works by user", async () => {
    const testUrl = `https://example.com?delete=${Date.now()}`;

    // Test the /shorten endpoint
    const shortenResponse = await app.request(
      "/urls/shorten",
      {
        method: "POST",
        body: JSON.stringify({ url: testUrl }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": user1.api_key,
        },
      },
      mockEnv,
    );

    expect(shortenResponse.status).toBe(201);
    const shortenData: UrlObj = await shortenResponse.json();
    const shortCode = shortenData.short_code;

    expect(shortCode).toBeDefined();

    // Test the /shortcode/:code endpoint
    const deleteResponse = await app.request(
      `/urls/shortcode/${shortCode}`,
      { method: "DELETE", headers: { "x-api-key": user1.api_key } },
      mockEnv,
    );

    expect(deleteResponse.status).toBe(200);
  });

  it("ensure deleting a shortcode doesn't work by different user", async () => {
    const testUrl = `https://example.com?delete=${Date.now()}`;

    // Test the /shorten endpoint
    const shortenResponse = await app.request(
      "/urls/shorten",
      {
        method: "POST",
        body: JSON.stringify({ url: testUrl }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": user1.api_key,
        },
      },
      mockEnv,
    );

    expect(shortenResponse.status).toBe(201);
    const shortenData: UrlObj = await shortenResponse.json();
    const shortCode = shortenData.short_code;

    expect(shortCode).toBeDefined();

    // Test the /shortcode/:code endpoint
    const deleteResponse = await app.request(
      `/urls/shortcode/${shortCode}`,
      { method: "DELETE", headers: { "x-api-key": user2.api_key } },
      mockEnv,
    );

    expect(deleteResponse.status).toBe(403);
  });

  it("ensure empty URLs are not added", async () => {
    const testUrl = "";
    const shortenResponse = await app.request(
      "/urls/shorten",
      {
        method: "POST",
        body: JSON.stringify({ url: testUrl }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": user1.api_key,
        },
      },
      mockEnv,
    );

    expect(shortenResponse.status).toBe(400);
    // biome-ignore lint/suspicious/noExplicitAny: zod-validation error response
    const json = (await shortenResponse.json()) as any;
    expect(json.success).toBe(false);
    expect(json.errors).toBeDefined();
    expect(json.errors.url).toBeDefined();
    expect(json.errors.url._errors).toBeDefined();
  });
});
