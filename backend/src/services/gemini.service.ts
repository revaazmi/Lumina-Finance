import Groq from 'groq-sdk';
import { config } from '../config';
import { AITransaction } from '../types';

const groq = new Groq({ apiKey: config.groqApiKey });

const SYSTEM_PROMPT = `Extract transaction information from the text into JSON.
Return ONLY valid JSON (no markdown, no extra text) with this structure:
{
  "type": "INCOME" or "EXPENSE",
  "amount": number (numeric value only),
  "category": string (one word, e.g. "Makanan", "Transportasi", "Gaji", "Belanja", "Hiburan", "Tagihan", "Kesehatan", "Lainnya"),
  "description": string (brief description),
  "confidenceScore": number between 0 and 1
}

Examples:
- "beli nasi goreng 25rb" -> {"type":"EXPENSE","amount":25000,"category":"Makanan","description":"Beli nasi goreng","confidenceScore":0.95}
- "gaji bulan ini 5 juta" -> {"type":"INCOME","amount":5000000,"category":"Gaji","description":"Gaji bulan ini","confidenceScore":0.9}`;

async function callGroq(messages: any[], model: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await groq.chat.completions.create({
        messages,
        model,
        temperature: 0.1,
        max_tokens: 256,
        response_format: { type: 'json_object' as const },
      });
      return response;
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || err?.message?.includes('429');
      if (isRateLimit && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`Groq rate limit, retry ${i + 1}/${retries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Groq failed after all retries');
}

export async function extractFromText(text: string): Promise<AITransaction> {
  const response = await callGroq([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: text },
  ], 'llama-3.3-70b-versatile');

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty Groq response');
  return JSON.parse(content) as AITransaction;
}

export async function extractFromImage(base64: string, mimeType: string): Promise<AITransaction> {
  const response = await callGroq([
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Extract transaction information from this image.' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
      ]
    }
  ], 'meta-llama/llama-4-scout-17b-16e-instruct');

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty Groq response');
  return JSON.parse(content) as AITransaction;
}
