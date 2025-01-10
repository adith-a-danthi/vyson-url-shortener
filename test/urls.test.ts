import { describe, beforeAll, expect, it } from "vitest";
import { config } from "dotenv";

import type { Env } from "@db/index";
import { UserTier, type SelectUrl, type SelectUser } from "@db/schema";
import { getSqid, type ObjectKeysToSnakeCase } from "@/utils";
import app from "@/index";

config({ path: ".dev.vars" });

const mockEnv: Env = {
  // biome-ignore lint/style/noNonNullAssertion:
  TURSO_DB_URL: process.env.TURSO_DB_URL!,
  TURSO_DB_AUTH_TOKEN: process.env.TURSO_DB_AUTH_TOKEN,
};

type User = ObjectKeysToSnakeCase<Pick<SelectUser, "id" | "email" | "apiKey">>;
type UrlObj = ObjectKeysToSnakeCase<
  Pick<SelectUrl, "id" | "url" | "shortCode" | "expiresAt">
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
        body: JSON.stringify({ email: email1, tier: UserTier.Enterprise }),
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

  it("ensure expired URLs are not redirected", async () => {
    const testUrl = `https://example.com?expired=${Date.now()}`;

    // shorten the URL
    const shortenResponse = await app.request(
      "/urls/shorten",
      {
        method: "POST",
        body: JSON.stringify({
          url: testUrl,
          expiresAt: "2000-01-01T00:00:00.000Z",
        }),
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

    // test redirect
    const redirectResponse = await app.request(
      `/urls/redirect?code=${shortCode}`,
      { method: "GET" },
      mockEnv,
    );
    expect(redirectResponse.status).toBe(410);
  });

  it("check support for custom short codes", async () => {
    const testUrl = `https://example.com?custom=${Date.now()}`;
    const customShortCode = getSqid();

    // shorten the URL
    const shortenResponse = await app.request(
      "/urls/shorten",
      {
        method: "POST",
        body: JSON.stringify({ url: testUrl, shortCode: customShortCode }),
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

    expect(shortCode).toBe(customShortCode);
  });

  it("ensure batch shortening works", async () => {
    const testUrl1 = `https://example.com?batch1=${Date.now()}`;
    const testUrl2 = `https://example.com?batch2=${Date.now()}`;

    // shorten the URLs
    const res = await app.request(
      "/urls/shorten/batch",
      {
        method: "POST",
        body: JSON.stringify({
          urls: [
            { url: testUrl1, expiresAt: "2000-01-01T00:00:00.000Z" },
            { url: testUrl2 },
          ],
        }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": user1.api_key,
        },
      },
      mockEnv,
    );
    expect(res.status).toBe(201);
    const { urls }: { urls: UrlObj[] } = await res.json();
    expect(urls.length).toBe(2);
  });

  it("ensure user can't batch shorten URLs with hobby tier", async () => {
    const testUrl1 = `https://example.com?hobby=${Date.now()}`;
    const testUrl2 = `https://example.com?hobby=${Date.now()}`;

    // shorten the URL
    const res = await app.request(
      "/urls/shorten/batch",
      {
        method: "POST",
        body: JSON.stringify({
          urls: [{ url: testUrl1 }, { url: testUrl2 }],
        }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": user2.api_key,
        },
      },
      mockEnv,
    );

    expect(res.status).toBe(403);
  });

  it("ensure user can update url expiry and password", async () => {
    const testUrl = `https://example.com?update=${Date.now()}`;
    const expiresAtStr = "2000-01-01T00:00:00.000Z";
    const password = "password";

    // shorten the URL
    const shortenResponse = await app.request(
      "/urls/shorten",
      {
        method: "POST",
        body: JSON.stringify({
          url: testUrl,
          expiresAt: expiresAtStr,
          password,
        }),
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
    expect(shortenData.expires_at).toBeDefined();
    expect(shortenData.expires_at).toBe(expiresAtStr);

    // update the URL
    const updateResponse = await app.request(
      `/urls/${shortenData.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ expiresAt: null }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": user1.api_key,
        },
      },
      mockEnv,
    );

    expect(updateResponse.status).toBe(200);
    const updatedData: UrlObj = await updateResponse.json();
    expect(updatedData.expires_at).toBeNull();

    // try redirecting without password
    const redirectResponse = await app.request(
      `/urls/redirect?code=${shortenData.short_code}`,
      { method: "GET" },
      mockEnv,
    );

    expect(redirectResponse.status).toBe(403);
  });

  it("ensure redirection works with valid password", async () => {
    const testUrl = `https://example.com?auth=${Date.now()}`;
    const password = "password";

    const shortenResponse = await app.request(
      "/urls/shorten",
      {
        method: "POST",
        body: JSON.stringify({ url: testUrl, password }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": user1.api_key,
        },
      },
      mockEnv,
    );

    expect(shortenResponse.status).toBe(201);
    const urlDate: UrlObj = await shortenResponse.json();
    expect(urlDate.short_code).toBeDefined();

    const redirectResponse = await app.request(
      `/urls/redirect?code=${urlDate.short_code}&pw=${password}`,
      { method: "GET" },
      mockEnv,
    );

    expect(redirectResponse.status).toBe(302);
  });

  it("ensure redirection doesn't work with invalid password", async () => {
    const testUrl = `https://example.com?invalidAuth=${Date.now()}`;
    const password = "password";

    const shortenResponse = await app.request(
      "/urls/shorten",
      {
        method: "POST",
        body: JSON.stringify({ url: testUrl, password }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": user1.api_key,
        },
      },
      mockEnv,
    );

    expect(shortenResponse.status).toBe(201);
    const urlDate: UrlObj = await shortenResponse.json();
    expect(urlDate.short_code).toBeDefined();

    // Test with incorrect password
    const redirectResponse = await app.request(
      `/urls/redirect?code=${urlDate.short_code}&pw=nope`,
      { method: "GET" },
      mockEnv,
    );

    expect(redirectResponse.status).toBe(401);

    // Test with no password
    const redirectResponse2 = await app.request(
      `/urls/redirect?code=${urlDate.short_code}`,
      { method: "GET" },
      mockEnv,
    );

    expect(redirectResponse2.status).toBe(403);
  });
});
