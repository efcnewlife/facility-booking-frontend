// Staging hosting contract (EFC-313): what Cloudflare serves at booking-dev and what the staging build points at.
// Reads the committed files the deployment uses, through Wrangler's own config reader.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { describe, expect, it } from "vitest";
import { unstable_readConfig } from "wrangler";
import viteConfig from "../../vite.config";

const ROOT = path.resolve(import.meta.dirname, "../..");
const STAGING_HOST = "booking-dev.efcnewlife.com";

describe("staging Workers Static Assets config", () => {
  const config = unstable_readConfig({ config: path.join(ROOT, "wrangler.staging.jsonc") });

  it("is its own Worker, separate from production and the Admin Portal", () => {
    expect(config.name).toBe("facility-booking-frontend-stg");
  });

  it("serves only the built assets, with no Worker script", () => {
    expect(config.main).toBeUndefined();
    expect(path.resolve(ROOT, config.assets?.directory ?? "")).toBe(path.join(ROOT, "dist"));
  });

  it("answers unknown paths with index.html so deep links survive a refresh", () => {
    expect(config.assets?.not_found_handling).toBe("single-page-application");
  });

  it("is reachable only on the booking-dev custom domain", () => {
    expect(config.routes).toEqual([{ pattern: STAGING_HOST, custom_domain: true }]);
    expect(config.workers_dev).toBe(false);
    expect(config.preview_urls).toBe(false);
  });
});

// Cloudflare _headers format: an unindented URL pattern, then indented "Name: value" lines.
const parseHeaders = (text: string): Map<string, Record<string, string>> => {
  const rules = new Map<string, Record<string, string>>();
  let current: Record<string, string> | undefined;
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = {};
      rules.set(line.trim(), current);
      continue;
    }
    const [name, ...value] = line.trim().split(":");
    if (current) current[name.trim().toLowerCase()] = value.join(":").trim();
  }
  return rules;
};

describe("published asset rules (public/)", () => {
  const headers = parseHeaders(readFileSync(path.join(ROOT, "public/_headers"), "utf8"));

  it("lets browsers keep content-hashed bundles for a year", () => {
    expect(headers.get("/assets/*")?.["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("leaves index.html on Cloudflare's revalidate-every-time default, so a new release is picked up", () => {
    for (const [pattern, rule] of headers) {
      if (pattern === "/assets/*") continue;
      expect(rule, pattern).not.toHaveProperty("cache-control");
    }
  });

  it("sends baseline browser protections on every response", () => {
    expect(headers.get("/*")).toMatchObject({
      "x-content-type-options": "nosniff",
      "x-frame-options": "SAMEORIGIN",
      "referrer-policy": "strict-origin-when-cross-origin",
    });
  });

  it("never uploads source maps to the public site; they go to Sentry only", () => {
    const ignored = readFileSync(path.join(ROOT, "public/.assetsignore"), "utf8")
      .split("\n")
      .map((line) => line.trim());
    expect(ignored).toContain("*.map");
    expect(viteConfig.build?.sourcemap).toBe("hidden");
  });
});

describe("staging build settings (.env.staging)", () => {
  const env = parseEnv(readFileSync(path.join(ROOT, ".env.staging"), "utf8"));

  it("calls the staging Core API", () => {
    expect(env.VITE_API_BASE_URL).toBe("https://api-dev.efcnewlife.com");
  });

  it("signs in with the NewLife STG registration and returns to the exact booking-dev origin", () => {
    expect(env.VITE_AZURE_CLIENT_ID).toBe("c0766d6c-3ce2-4f97-9052-a2c30c9e67c5");
    expect(env.VITE_AZURE_TENANT_ID).toBe("1611ced1-d776-4134-acca-a77746e45623");
    expect(env.VITE_AZURE_REDIRECT_URI).toBe(`https://${STAGING_HOST}`);
  });

  it("offers Microsoft sign-in only: mock login would need its shared secret in the public bundle", () => {
    expect(env.VITE_SHOW_MOCK_LOGIN).toBe("false");
    expect(env).not.toHaveProperty("VITE_MOCK_LOGIN_SECRET");
  });

  it("leaves the Sentry release to CI, so every build reports its own commit", () => {
    expect(env).not.toHaveProperty("VITE_SENTRY_RELEASE_VERSION");
  });

  it("holds no credentials, since every VITE_ value ships in the bundle", () => {
    const names = Object.keys(env).filter((name) => /TOKEN|SECRET|PASSWORD|PRIVATE|AUTH_KEY/.test(name));
    expect(names).toEqual([]);
  });
});
