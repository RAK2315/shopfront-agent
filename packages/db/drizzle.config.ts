import { defineConfig } from 'drizzle-kit';

// Migrations use the DIRECT (unpooled) Neon URL; the app uses the pooled one (docs/SETUP.md §6).
export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '' },
  strict: true,
});
