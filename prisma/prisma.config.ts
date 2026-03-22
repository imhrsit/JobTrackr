import { defineConfig } from "prisma/config";

// DIRECT_URL is used by Prisma CLI (migrations, studio, etc.) — bypasses the connection pooler.
// DATABASE_URL (pooled) is used by the app at runtime via lib/prisma.ts.
export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
