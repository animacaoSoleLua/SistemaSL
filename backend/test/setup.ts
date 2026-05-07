import "dotenv/config";

// Block all Resend API calls during tests. We set globalThis.fetch directly
// (not vi.stubGlobal) so that vi.unstubAllGlobals() in email.unit.test.ts
// restores back to this interceptor rather than the original Node fetch.
const _realFetch = globalThis.fetch;
globalThis.fetch = async function (url: RequestInfo | URL, init?: RequestInit) {
  if (typeof url === "string" && url.startsWith("https://api.resend.com")) {
    return new Response(JSON.stringify({ id: "blocked-by-test-setup" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return _realFetch.call(this, url, init);
};

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgres://slr:admin@localhost:5453/slr";
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET =
    "test-secret-0123456789abcdef0123456789abcdef";
}

if (!process.env.R2_ENDPOINT) {
  process.env.R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
}
if (!process.env.R2_ACCESS_KEY_ID) {
  process.env.R2_ACCESS_KEY_ID = "test-access-key";
}
if (!process.env.R2_SECRET_ACCESS_KEY) {
  process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
}
if (!process.env.R2_BUCKET_NAME) {
  process.env.R2_BUCKET_NAME = "test-bucket";
}
