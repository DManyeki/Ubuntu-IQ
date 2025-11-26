export type Language = 'en' | 'sw' | 'sheng';

export type RIASECCode = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export interface Question {
  id: number;
  code: RIASECCode;
  text: {
    en: string;
    sw: string;
    sheng: string;
  };
  guide: {
    en: string;
    sw: string;
    sheng: string;
  };
}

export interface Career {
  id: string;
  title: string;
  primary_code: string;
  description: string;
  education_required: string;
  salary_range: string;
  job_outlook: string;
  employers: string[];
  personality_fit: string;
  resources?: { name: string; url: string }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isCrisisResponse?: boolean;
}

export interface AssessmentResult {
  scores: Record<RIASECCode, number>;
  topCodes: RIASECCode[];
}

// Mood Scaler Types
export interface MoodQuestion {
  id: number;
  category: 'depression' | 'anxiety';
  text: {
    en: string;
    sw: string;
    sheng: string;
  };
}

export interface MoodResult {
  scores: Record<number, number>; // questionId -> 1-6
  depressionScore: number;
  anxietyScore: number;
  overallScore: number;
  timestamp: Date;
}

export interface MoodRecommendation {
  type: 'positive' | 'depression' | 'anxiety' | 'crisis';
  message: {
    en: string;
    sw: string;
    sheng: string;
  };
  activities: {
    title: { en: string; sw: string; sheng: string };
    action: string; // 'chat_breathing', 'chat_grounding', 'chat_journal'
  }[];
}