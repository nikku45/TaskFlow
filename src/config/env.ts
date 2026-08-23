import dotenv from 'dotenv';
import { z } from 'zod/v4';

// Load .env file before parsing
dotenv.config();

/**
 * Zod schema covering every variable in .env.example.
 * Parsed once at startup; exported as a typed `env` object.
 * Fail fast (process.exit(1)) with a clear message if parsing fails.
 */
const envSchema = z.object({
  // --- App ---
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_PATH: z.string().default('/api/v1'),

  // --- PostgreSQL ---
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  POSTGRES_USER: z.string().default('taskflow'),
  POSTGRES_PASSWORD: z.string().default('taskflow_password'),
  POSTGRES_DB: z.string().default('taskflow'),
  POSTGRES_HOST: z.string().default('postgres'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),

  // --- Redis / BullMQ ---
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_HOST: z.string().default('redis'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  // --- JWT / Auth ---
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  BCRYPT_COST_FACTOR: z.coerce.number().int().min(12, 'BCRYPT_COST_FACTOR must be >= 12').default(12),

  // --- Rate Limiting ---
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  // --- Background Jobs ---
  EMAIL_QUEUE_NAME: z.string().default('email-notifications'),
  EMAIL_QUEUE_DLQ_NAME: z.string().default('email-notifications-dlq'),
  JOB_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
  JOB_BACKOFF_BASE_MS: z.coerce.number().int().positive().default(1000),

  // --- Email Provider (Brevo / Mock) ---
  MOCK_EMAIL_FROM: z.string().default('noreply@taskflow.local'),
  EMAIL_GLOBAL_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(50),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().optional(),
  BREVO_SENDER_NAME: z.string().default('TaskFlow Notification'),

  // --- CORS ---
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),

  // --- Logging ---
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // --- Test Environment ---
  TEST_DATABASE_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    for (const issue of error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
  } else {
    console.error('❌ Unexpected error validating environment:', error);
  }
  process.exit(1);
}

export { env };
