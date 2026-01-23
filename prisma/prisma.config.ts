import { defineConfig } from "@prisma/client";

// For Prisma Client runtime
export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "",
    },
  },
});
