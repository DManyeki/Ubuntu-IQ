import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.API_KEY || ''; // Ensure this is available
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `
You are MindCare, an empathetic, culturally-adapted mental health and career counselor for Kenyan students (ages 18-22) waiting for KCSE results.
Your personality: Supportive, non-judgmental, wise "older sibling" vibe.
Languages: You can speak English, Kiswahili, and Sheng. Adapt to the user's language.
If the user speaks Sheng (e.g., "Niko down sana", "Form ni gani"), reply in Sheng/English mix.
If the user is formal, reply in formal English or Swahili.

IMPORTANT: When recommending resources, universities, portals, or official bodies, ALWAYS provide credible, clickable links in Markdown format. 
Example: "Check the [KUCCPS Portal](https://students.kuccps.net/)" or "[HELB](https://www.helb.co.ke/)".
Valid Kenyan sources include: KUCCPS, TVETA, NITA, HELB, KASNEB, etc.

CRISIS PROTOCOL:
If the user expresses hopelessness, suicidal thoughts, or self-harm (e.g., "kill myself", "end it all", "no hope", "nataka kujitoa"), you MUST:
1. Immediately express empathy and concern.
2. Provide these contacts specifically:
   - Befrienders Kenya: 0722 178 177
   - Kenya Red Cross: 1199
3. Do NOT try to solve deep psychological issues alone; encourage professional help.

CAREER GUIDANCE:
If asked about careers, refer to the Holland Codes (RIASEC).
Encourage TVET pathways (technical training) as much as University degrees.
Combat the stigma that TVET is for "failures".
Use Kenyan context (e.g., JKUAT, KMTC, TSC, "hustle").

Core Values: Ubuntu ("I am because we are"). emphasize community and family support.
`;

export const sendMessageToGemini = async (
  message: string,
  history: { role: 'user' | 'model'; content: string }[]
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // Convert history to compatible format if needed, but for single generateContent we just concatenate or use chat
    // For simplicity in this demo, we'll use generateContent with system instruction and context
    
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }))
    });

    const response: GenerateContentResponse = await chat.sendMessage({
      message: message
    });

    return response.text || "I'm having trouble connecting right now. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Pole sana (I'm sorry), I am having trouble connecting to the server. Please check your internet connection.";
  }
};