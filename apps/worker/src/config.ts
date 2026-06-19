import path from 'path';
import dotenv from 'dotenv';

// Load the global .env file from the monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    model: process.env.LLM_MODEL || 'gemini-2.5-flash',
  },
  browser: {
    headless: process.env.BROWSER_HEADLESS !== 'false',
  },
};
