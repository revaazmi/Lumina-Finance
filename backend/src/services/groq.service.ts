import Groq from 'groq-sdk';
import { config } from '../config';
import { createReadStream, existsSync, unlinkSync } from 'fs';

const groq = new Groq({ apiKey: config.groqApiKey });

export async function transcribeAudio(filePath: string): Promise<string> {
  if (!existsSync(filePath)) {
    throw new Error('Audio file not found');
  }

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-large-v3',
      language: 'id',
    });

    return transcription.text;
  } finally {
    try { unlinkSync(filePath); } catch {}
  }
}
