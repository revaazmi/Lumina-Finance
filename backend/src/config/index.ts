import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnv(key: string): string {
  return process.env[key] || '';
}

export const config = {
  botToken: getEnv('BOT_TOKEN'),
  groqApiKey: getEnv('GROQ_API_KEY'),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
  jwtSecret: requireEnv('JWT_SECRET'),
};
