import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  botToken: requireEnv('BOT_TOKEN'),
  groqApiKey: requireEnv('GROQ_API_KEY'),
  geminiApiKey: requireEnv('GEMINI_API_KEY'),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
};
