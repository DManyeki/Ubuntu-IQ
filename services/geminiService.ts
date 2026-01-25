import { createClient } from '@supabase/supabase-js';

// Init Supabase (Client-side)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// OpenRouter Config
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = 'google/gemini-2.0-flash-001'; // Use Gemini as requested
const SITE_URL = 'https://mindcare-kenya.vercel.app';
const SITE_NAME = 'MindCare Kenya';

let cachedContext: string | null = null;

async function getEducationContext() {
  if (cachedContext) return cachedContext;

  try {
    // 1. Fetch TVET Programs (Rules)
    const { data: tvetData } = await supabase
      .from('tvet_programs')
      .select('category, level, min_mean_grade, requirements, exam_type')
      .limit(100);

    // 2. Fetch Degree Clusters (Rules)
    const { data: clusterReqs } = await supabase
      .from('cluster_requirements')
      .select('cluster_id, subject_code, min_grade')
      .order('cluster_id');

    // Format Data
    let context = "EDUCATION DATA SOURCE:\n\n";

    if (tvetData) {
      context += "1. TVET PROGRAM REQUIREMENTS (Diploma/Certificate/Artisan):\n";
      tvetData.forEach((p: any) => {
        const reqs = p.requirements ? JSON.stringify(p.requirements) : "None";
        context += `- ${p.category} (${p.level}): Min Mean Grade ${p.min_mean_grade}. Rules: ${reqs}\n`;
      });
    }

    if (clusterReqs) {
      context += "\n2. UNIVERSITY DEGREE CLUSTER REQUIREMENTS (KCSE):\n";
      // Group by cluster
      const clusters: Record<string, any[]> = {};
      clusterReqs.forEach((r: any) => {
        if (!clusters[r.cluster_id]) clusters[r.cluster_id] = [];
        clusters[r.cluster_id].push(`${r.subject_code} (${r.min_grade || 'Pass'})`);
      });

      Object.keys(clusters).forEach(cid => {
        context += `- Cluster ${cid}: Requires ${clusters[cid].join(', ')}\n`;
      });
    }

    // 3. Fetch Universities
    const { data: unis } = await supabase
      .from('universities')
      .select('name, ownership, town, county, location')
      .order('name');

    if (unis) {
      context += "\n3. UNIVERSITIES (Kenya):\n";
      unis.forEach(u => {
        const loc = u.town && u.county ? `${u.town}, ${u.county}` : (u.location || 'Kenya');
        context += `- ${u.name} (${u.ownership}): Located in ${loc}\n`;
      });
    }

    cachedContext = context;
    return context;
  } catch (e) {
    console.error("Failed to fetch education data:", e);
    return "";
  }
}

const SYSTEM_INSTRUCTION_BASE = `
You are MindCare, a helpful, knowledgeable, and culturally-adapted career counselor for Kenyan students (ages 18-22) who just received their KCSE results.
Your personality: Professional, encouraging, clear, and welcoming. Do not assume the user is stressed.
Languages: You can speak English, Kiswahili, and Sheng. Adapt to the user's language.

IMPORTANT:
- Help students explore their options based on their grades.
- You have access to detailed eligibility rules for TVET (Diplomas/Certs) and University Degrees (Clusters).
- When a user shares their grades (e.g., "I got a C-"), suggest programs they qualify for.
- Be accurate with the provided data. If unsure, say so.
- Encourage TVET as a valid and valuable career path.

CRITICAL LINKS:
- KUCCPS Portal: [students.kuccps.net](https://students.kuccps.net/)
- HELB: [www.helb.co.ke](https://www.helb.co.ke/)
`;

export const sendMessageToGemini = async (
  message: string,
  history: { role: 'user' | 'model'; content: string }[]
): Promise<string> => {
  try {
    const educationContext = await getEducationContext();
    const fullSystemInstruction = `${SYSTEM_INSTRUCTION_BASE}\n\n${educationContext}`;

    // Map history to OpenAI format
    const messages = [
      { role: 'system', content: fullSystemInstruction },
      ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: message }
    ];

    console.log("Sending request to OpenRouter/Gemini...");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter Error:", response.status, errText);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I'm having trouble thinking right now. Please try again.";

  } catch (error: any) {
    console.error("AI API Error:", error);
    return `Pole sana (I'm sorry), I am having trouble connecting. Error: ${error.message}`;
  }
};