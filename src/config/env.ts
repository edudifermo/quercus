import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Quercus"),
  STORAGE_PROVIDER: z.enum(["LOCAL", "SUPABASE", "S3"]).default("LOCAL"),
  STORAGE_BUCKET: z.string().default("quercus-adjuntos"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
