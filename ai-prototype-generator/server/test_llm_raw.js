import { GoogleGenAI } from '@google/genai';
import { CODE_SYSTEM_PROMPT, formatUserPrompt } from './src/utils/promptTemplates.js';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function test() {
  const systemPrompt = CODE_SYSTEM_PROMPT;
  const userContent = formatUserPrompt("Ludo Game", null, "workflow+code", null);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
        maxOutputTokens: 20000,
        responseMimeType: "application/json",
      }
    });

    console.log("----- RAW LLM TEXT -----");
    console.log(response.text);
    console.log("----- END LLM TEXT -----");
  } catch (e) {
    console.error("Test Error:", e);
  }
}
test();
