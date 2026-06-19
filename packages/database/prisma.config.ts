import path from 'path';
import dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Load the global .env file from the monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
