import { MoodQuestion, MoodResult, MoodRecommendation } from '../types';

export const MOOD_QUESTIONS: MoodQuestion[] = [
  // DEPRESSION SUBSCALE (1-6)
  {
    id: 1,
    category: 'depression',
    text: {
      en: "I feel sad right now",
      sw: "Ninahisi huzuni sasa hivi",
      sheng: "Naskia niko down saa hii"
    }
  },
  {
    id: 2,
    category: 'depression',
    text: {
      en: "I feel hopeless about my future",
      sw: "Sina matumaini kuhusu maisha yangu ya baadaye",
      sheng: "Sioni future ikiwa fiti"
    }
  },
  {
    id: 3,
    category: 'depression',
    text: {
      en: "I lack energy and motivation",
      sw: "Sina nguvu wala motisha",
      sheng: "Sina nguvu na nimejam na kila kitu"
    }
  },
  {
    id: 4,
    category: 'depression',
    text: {
      en: "I feel empty or numb",
      sw: "Ninahisi utupu ndani yangu",
      sheng: "Naskia niko empty tu"
    }
  },
  {
    id: 5,
    category: 'depression',
    text: {
      en: "Nothing feels enjoyable right now",
      sw: "Hakuna kitu kinachonifurahisha sasa",
      sheng: "Hakuna kitu inanibamba saa hii"
    }
  },
  {
    id: 6,
    category: 'depression',
    text: {
      en: "I feel worthless or like a burden",
      sw: "Ninajiona sina thamani au ni mzigo",
      sheng: "Najiona useless ama kama mzigo kwa wengine"
    }
  },
  // ANXIETY SUBSCALE (7-12)
  {
    id: 7,
    category: 'anxiety',
    text: {
      en: "I feel anxious or worried right now",
      sw: "Nina wasiwasi au mashaka sasa hivi",
      sheng: "Niko na wasiwasi mob"
    }
  },
  {
    id: 8,
    category: 'anxiety',
    text: {
      en: "I feel tense or on edge",
      sw: "Nimekazika au niko roho juu",
      sheng: "Nimekazika, siezi relax"
    }
  },
  {
    id: 9,
    category: 'anxiety',
    text: {
      en: "My mind is racing with thoughts",
      sw: "Akili yangu imejaa mawazo mengi",
      sheng: "Akili inarace na mawazo mob"
    }
  },
  {
    id: 10,
    category: 'anxiety',
    text: {
      en: "I feel a sense of panic or dread",
      sw: "Ninahisi hofu kubwa",
      sheng: "Naskia uoga fulani mbaya"
    }
  },
  {
    id: 11,
    category: 'anxiety',
    text: {
      en: "I'm having trouble concentrating",
      sw: "Ninapata shida kuzingatia jambo",
      sheng: "Siwezi concentrate kwa kitu moja"
    }
  },
  {
    id: 12,
    category: 'anxiety',
    text: {
      en: "I feel restless or can't sit still",
      sw: "Situlii, siwezi kukaa sehemu moja",
      sheng: "Siwezi tulia mahali pamoja"
    }
  }
];

export const calculateMoodResults = (scores: Record<number, number>): MoodResult => {
  const depIds = [1, 2, 3, 4, 5, 6];
  const anxIds = [7, 8, 9, 10, 11, 12];

  const depSum = depIds.reduce((sum, id) => sum + (scores[id] || 0), 0);
  const anxSum = anxIds.reduce((sum, id) => sum + (scores[id] || 0), 0);

  // Scores are 1-6 average
  return {
    scores,
    depressionScore: depSum / 6,
    anxietyScore: anxSum / 6,
    overallScore: (depSum + anxSum) / 12,
    timestamp: new Date()
  };
};

export const getMoodRecommendation = (result: MoodResult): MoodRecommendation => {
  const { overallScore, depressionScore, anxietyScore } = result;

  // 1. Crisis
  if (overallScore >= 4.5) {
    return {
      type: 'crisis',
      message: {
        en: "We are concerned about you. You seem to be going through a very difficult time right now. Please let us help.",
        sw: "Tunakujali. Inaonekana unapitia wakati mgumu sana sasa hivi. Tafadhali tukusaidie.",
        sheng: "Tunakujali. Inakaa unapitia time ngumu sana. Tafadhali acha tukusaidie."
      },
      activities: [
        {
          title: { en: "Speak to a Counselor", sw: "Ongea na Mshauri", sheng: "Bonga na Counselor" },
          action: 'crisis_hotline' // Handled specifically in UI
        },
        {
          title: { en: "Safety Plan", sw: "Mpango wa Usalama", sheng: "Safety Plan" },
          action: 'chat_safety_plan'
        }
      ]
    };
  }

  // 2. Positive / Excellent (< 2.5)
  if (overallScore < 2.5) {
    return {
      type: 'positive',
      message: {
        en: "You're managing well! It's great to see you feeling balanced. Keep doing what you're doing.",
        sw: "Unaendelea vizuri! Ni vizuri kukuona ukiwa na utulivu. Endelea hivyo.",
        sheng: "Unaendelea fiti! Ni poa kuona uko balanced. Endelea hivo hivo."
      },
      activities: [
        {
          title: { en: "Journal Your Wins", sw: "Andika Ushindi Wako", sheng: "Andika Wins Zako" },
          action: 'chat_journal'
        },
        {
          title: { en: "Explore Careers", sw: "Gundua Kazi", sheng: "Cheki Career" },
          action: 'nav_assessment'
        }
      ]
    };
  }

  // 3. Okay (2.5 - 3.5) OR Struggling (3.6 - 4.4)
  // Determine dominant symptom
  if (depressionScore > anxietyScore) {
    return {
      type: 'depression',
      message: {
        en: "Your mood seems a bit low. Trying a small activity can help boost your energy.",
        sw: "Hali yako inaonekana kuwa chini kidogo. Kujaribu shughuli ndogo kunaweza kuongeza nguvu zako.",
        sheng: "Mood yako iko chini kiasi. Kujaribu activity ndogo inaweza kukupea nguvu."
      },
      activities: [
        {
          title: { en: "Do One Small Thing", sw: "Fanya Jambo Moja Dogo", sheng: "Fanya Kitu Moja Ndogo" },
          action: 'chat_behavioral_activation' // "Help me pick one small enjoyable thing to do"
        },
        {
          title: { en: "Talk to MindCare", sw: "Ongea na MindCare", sheng: "Bonga na MindCare" },
          action: 'chat_low_mood'
        }
      ]
    };
  } else {
    // Anxiety is higher or equal
    return {
      type: 'anxiety',
      message: {
        en: "You seem to be feeling anxious or tense. Let's try to ground you in the present moment.",
        sw: "Inaonekana una wasiwasi au umekazika. Hebu tujaribu kukutuliza kwa sasa.",
        sheng: "Inakaa uko na wasiwasi ama tension. Wacha tujaribu kukurelax kiasi."
      },
      activities: [
        {
          title: { en: "5-Senses Grounding", sw: "Zoezi la Kutuliza", sheng: "Grounding Exercise" },
          action: 'chat_grounding'
        },
        {
          title: { en: "Breathing Exercise", sw: "Zoezi la Kupumua", sheng: "Breathing Exercise" },
          action: 'chat_breathing'
        }
      ]
    };
  }
};