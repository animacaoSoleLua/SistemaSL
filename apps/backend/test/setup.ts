import "dotenv/config";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgres://slr:admin@localhost:5453/slr";
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET =
    "test-secret-0123456789abcdef0123456789abcdef";
}
