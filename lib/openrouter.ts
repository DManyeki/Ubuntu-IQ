// OpenRouter AI Client Configuration
// Using Xiaomi MiMo-V2-Flash (free model) for chat, analysis, and scraping

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'xiaomi/mimo-v2-flash:free';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: 'json_object' };
}

/**
 * Send a chat completion request to OpenRouter
 */
export async function createChatCompletion(messages: ChatMessage[], options?: {
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
}): Promise<string> {
    const requestBody: ChatCompletionRequest = {
        model: OPENROUTER_MODEL,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 2000,
    };

    if (options?.json_mode) {
        requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'MindCare Kenya'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}

/**
 * Review parsed KUCCPS data with AI
 */
export async function reviewKUCCPSData(extractedData: any): Promise<any> {
    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: 'You are a data quality reviewer for Kenyan higher education data. Review and improve the provided data.'
        },
        {
            role: 'user',
            content: `Review the following extracted institution/program data and:
1. Correct any typos or inconsistencies in institution names
2. Standardize program names (e.g., "BSc Computer Science" vs "Bachelor of Science in Computer Science")
3. Validate KUCCPS codes format
4. Suggest RIASEC personality codes for each program (R=Realistic, I=Investigative, A=Artistic, S=Social, E=Enterprising, C=Conventional)
5. Flag any suspicious or incomplete data
6. Link programs to correct institutions if they appear mismatched

Extracted Data:
${JSON.stringify(extractedData, null, 2)}

Return a JSON object with:
{
  "suggestions": [
    {
      "type": "typo|standardization|riasec_mapping|data_quality",
      "field": "institution|program|kuccps_code",
      "original_value": "...",
      "suggested_value": "...",
      "confidence": 0.0-1.0,
      "reason": "..."
    }
  ],
  "institutions": [
    {
      "name": "standardized name",
      "website": "inferred website (based on institution name)",
      "type": "university|tveta|college"
    }
  ],
  "programs": [
    {
      "name": "standardized name",
      "institution": "matched institution",
      "kuccps_code": "...",
      "riasec_codes": ["R", "I"],
      "level": "bachelors|diploma|certificate",
      "career_outcomes": ["Software Developer", "Data Analyst"]
    }
  ]
}`
        }
    ];

    const responseText = await createChatCompletion(messages, {
        temperature: 0.3,
        max_tokens: 4000,
        json_mode: true
    });

    return JSON.parse(responseText);
}

/**
 * Extract structured data from scraped webpage
 */
export async function extractFromScrapedPage(pageText: string, pageType: string): Promise<any> {
    const prompts: Record<string, string> = {
        programs: `Extract program/course information from this webpage text:

${pageText.substring(0, 5000)}

Return JSON array of programs:
[
  {
    "name": "Bachelor of Science in Computer Science",
    "level": "bachelors",
    "duration": {"value": 4, "unit": "years"},
    "description": "...",
    "requirements": "B+ in KCSE, Math B, English C+",
    "mode": ["full_time", "part_time"]
  }
]`,

        fees: `Extract fee structure from this webpage text:

${pageText.substring(0, 5000)}

Return JSON:
{
  "fees": [
    {
      "program_level": "bachelors",
      "amount_min": 100000,
      "amount_max": 150000,
      "currency": "KES",
      "period": "year",
      "notes": "per year for Kenyan students"
    }
  ]
}`,

        admission: `Extract admission requirements from this webpage text:

${pageText.substring(0, 5000)}

Return JSON:
{
  "requirements": {
    "min_grade": "C+",
    "specific_subjects": ["Mathematics", "English"],
    "application_deadline": "...",
    "application_process": "..."
  }
}`
    };

    const prompt = prompts[pageType] || `Summarize key information from this webpage:\n\n${pageText.substring(0, 3000)}`;

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: 'You are a data extraction assistant for Kenyan education websites. Extract structured information accurately.'
        },
        {
            role: 'user',
            content: prompt
        }
    ];

    const responseText = await createChatCompletion(messages, {
        temperature: 0.2,
        max_tokens: 2000,
        json_mode: true
    });

    return JSON.parse(responseText);
}

/**
 * Generate text embeddings using OpenRouter
 * Note: Not all models support embeddings. For now, we'll use a simple TF-IDF approach
 * or wait for embedding support. MiMo doesn't have native embedding support.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    // TODO: Switch to an embedding model or use a dedicated service
    // For now, return a placeholder
    console.warn('Embedding generation not supported by MiMo model. Consider using a dedicated embedding service.');
    return new Array(1536).fill(0);
}

/**
 * Chat completion for the existing MindCare chat feature
 */
export async function sendChatMessage(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: `You are MindCare, an empathetic, culturally-adapted mental health and career counselor for Kenyan students (ages 18-22) waiting for KCSE results.

Your personality: Supportive, non-judgmental, wise "older sibling" vibe.
Languages: You can speak English, Kiswahili, and Sheng. Adapt to the user's language.

CRISIS PROTOCOL:
If the user expresses suicidal thoughts, self-harm, or severe distress:
1. Acknowledge their pain with empathy
2. DO NOT provide therapy - you're not a replacement for professional help
3. Immediately recommend:
   - Befrienders Kenya: 0722 178 177 / 0734 537 995
   - Kenya Red Cross: 1199
4. Encourage them to speak to a trusted adult

Keep responses concise and supportive.`
        },
        ...conversationHistory,
        {
            role: 'user',
            content: userMessage
        }
    ];

    return await createChatCompletion(messages, {
        temperature: 0.8,
        max_tokens: 500
    });
}
