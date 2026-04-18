import "dotenv/config";

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
if (!process.env.R2_PUBLIC_URL) {
  process.env.R2_PUBLIC_URL = "https://test-pub.r2.dev";
}
