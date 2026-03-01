import { defineConfig } from "prisma/config";

// For Prisma Client runtime
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "",
  },
});
