import { LLMService } from './src/services/llmService.js';

async function test() {
  const llm = new LLMService();
  const session = {
      domain: "general",
      title: "Ludo Game",
      requirements: { functional: [], non_functional: [] },
      canonicalRequirements: [],
      total_prompt_count: 1,
      merged_prompt_count: 1,
      change_log: []
  };
  try {
     const res = await llm.generate("Ludo Game", "workflow+code", session);
     console.log("Result:", JSON.stringify(res).substring(0, 1000));
     
     // Log the actual text the LLM returned before parse/repair!
     // Wait, llmService catches the text but it isn't output! Let's modify llmService locally to debug.
  } catch (e) {
     console.error("Test Error:", e);
  }
}
test();
