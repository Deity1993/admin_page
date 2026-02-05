
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const getGeminiHelp = async (query: string, serverContext: string) => {
  // Fixed: Always use direct process.env.API_KEY for initialization as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert Ubuntu Server Administrator. 
      Context: The server runs Docker (n8n, Custom App) and Asterisk PBX with WSS.
      Current State: ${serverContext}
      
      User Question: ${query}
      
      Provide a concise, professional answer with specific shell commands if necessary. Use Markdown.`,
      config: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    // Fixed: response.text is a property, not a method
    return response.text || "Sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI diagnostics service.";
  }
};
