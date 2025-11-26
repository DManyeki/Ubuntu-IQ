import { MoodQuestion, MoodResult, MoodRecommendation, MoodStrategy } from '../types';

export const MOOD_QUESTIONS: MoodQuestion[] = [
  // DEPRESSION SUBSCALE (1-6)
  { id: 1, category: 'depression', text: { en: "I feel sad right now", sw: "Ninahisi huzuni sasa hivi", sheng: "Naskia niko down saa hii" } },
  { id: 2, category: 'depression', text: { en: "I feel hopeless about my future", sw: "Sina matumaini kuhusu maisha yangu ya baadaye", sheng: "Sioni future ikiwa fiti" } },
  { id: 3, category: 'depression', text: { en: "I lack energy and motivation", sw: "Sina nguvu wala motisha", sheng: "Sina nguvu na nimejam na kila kitu" } },
  { id: 4, category: 'depression', text: { en: "I feel empty or numb", sw: "Ninahisi utupu ndani yangu", sheng: "Naskia niko empty tu" } },
  { id: 5, category: 'depression', text: { en: "Nothing feels enjoyable right now", sw: "Hakuna kitu kinachonifurahisha sasa", sheng: "Hakuna kitu inanibamba saa hii" } },
  { id: 6, category: 'depression', text: { en: "I feel worthless or like a burden", sw: "Ninajiona sina thamani au ni mzigo", sheng: "Najiona useless ama kama mzigo kwa wengine" } },
  // ANXIETY SUBSCALE (7-12)
  { id: 7, category: 'anxiety', text: { en: "I feel anxious or worried right now", sw: "Nina wasiwasi au mashaka sasa hivi", sheng: "Niko na wasiwasi mob" } },
  { id: 8, category: 'anxiety', text: { en: "I feel tense or on edge", sw: "Nimekazika au niko roho juu", sheng: "Nimekazika, siezi relax" } },
  { id: 9, category: 'anxiety', text: { en: "My mind is racing with thoughts", sw: "Akili yangu imejaa mawazo mengi", sheng: "Akili inarace na mawazo mob" } },
  { id: 10, category: 'anxiety', text: { en: "I feel a sense of panic or dread", sw: "Ninahisi hofu kubwa", sheng: "Naskia uoga fulani mbaya" } },
  { id: 11, category: 'anxiety', text: { en: "I'm having trouble concentrating", sw: "Ninapata shida kuzingatia jambo", sheng: "Siwezi concentrate kwa kitu moja" } },
  { id: 12, category: 'anxiety', text: { en: "I feel restless or can't sit still", sw: "Situlii, siwezi kukaa sehemu moja", sheng: "Siwezi tulia mahali pamoja" } }
];

export const calculateMoodResults = (scores: Record<number, number>): MoodResult => {
  const depIds = [1, 2, 3, 4, 5, 6];
  const anxIds = [7, 8, 9, 10, 11, 12];

  const depSum = depIds.reduce((sum, id) => sum + (scores[id] || 0), 0);
  const anxSum = anxIds.reduce((sum, id) => sum + (scores[id] || 0), 0);

  return {
    scores,
    depressionScore: depSum / 6,
    anxietyScore: anxSum / 6,
    overallScore: (depSum + anxSum) / 12,
    timestamp: new Date()
  };
};

// --- STRATEGY LIBRARY ---
const STRATEGIES: MoodStrategy[] = [
  // --- POSITIVE ---
  {
    id: 'pos_journal',
    category: 'positive',
    intensity: 'all',
    title: { en: "Journal Your Wins", sw: "Andika Ushindi Wako", sheng: "Andika Wins Zako" },
    description: { en: "Write down 3 things that went well today.", sw: "Andika mambo 3 yaliyoenda vizuri leo.", sheng: "Andika vitu 3 zimeenda fiti leo." },
    duration: 5,
    mechanism: "Gratitude practice increases positive affect.",
    success_rate: "58%",
    action_context: "I'm feeling good. Help me journal my wins for today."
  },
  {
    id: 'pos_career',
    category: 'positive',
    intensity: 'all',
    title: { en: "Explore Future Goals", sw: "Gundua Malengo", sheng: "Cheki Future Goals" },
    description: { en: "Use this energy to plan your next career steps.", sw: "Tumia nguvu hii kupanga hatua zako za kazi.", sheng: "Tumia hii energy kuplan hustle zako." },
    duration: 15,
    mechanism: "Positive mood enhances creative problem solving.",
    success_rate: "N/A",
    action_context: "I'm feeling motivated. Let's talk about my career goals."
  },

  // --- DEPRESSION (MILD 2.5-3.0) ---
  {
    id: 'dep_mild_ba',
    category: 'depression',
    intensity: 'mild',
    title: { en: "Behavioral Activation", sw: "Fanya Jambo Dogo", sheng: "Fanya Kitu Moja" },
    description: { en: "Pick ONE small enjoyable activity and do it now for 10 mins.", sw: "Chagua shughuli moja ndogo ya kufurahisha na uifanye sasa.", sheng: "Chagua activity moja ndogo inakubamba na uifanye." },
    duration: 10,
    mechanism: "Increases dopamine and breaks rumination cycle.",
    success_rate: "65%",
    action_context: "I'm feeling a bit down. Help me pick one small enjoyable thing to do right now (Behavioral Activation)."
  },
  {
    id: 'dep_mild_nature',
    category: 'depression',
    intensity: 'mild',
    title: { en: "Go Outside", sw: "Toka Nje", sheng: "Toka Nje Kiasi" },
    description: { en: "Spend 10-15 minutes in fresh air or sunlight.", sw: "Tumia dakika 10-15 kwenye hewa safi au jua.", sheng: "Kaa nje kwa jua kiasi." },
    duration: 15,
    mechanism: "Sunlight regulates circadian rhythm and boosts serotonin.",
    success_rate: "60%",
    action_context: "Encourage me to go outside for a few minutes."
  },
  {
    id: 'dep_mild_social',
    category: 'depression',
    intensity: 'mild',
    title: { en: "Reach Out", sw: "Wasiliana", sheng: "Holla Beste" },
    description: { en: "Text or call one trusted friend/family member.", sw: "Tuma ujumbe au piga simu kwa rafiki/familia unayemwamini.", sheng: "Text ama call msee mmoja unaringa." },
    duration: 15,
    mechanism: "Social connection reduces isolation.",
    success_rate: "70%",
    action_context: "I'm feeling lonely. Help me draft a text to a friend."
  },

  // --- DEPRESSION (MODERATE 3.0-3.5) ---
  {
    id: 'dep_mod_thought',
    category: 'depression',
    intensity: 'moderate',
    title: { en: "Challenge Negative Thoughts", sw: "Changamoto Mawazo Hasi", sheng: "Challenge Mawazo Negative" },
    description: { en: "Identify one negative thought and write evidence against it.", sw: "Tambua wazo moja hasi na uandike ushahidi dhidi yake.", sheng: "Shika wazo moja negative na uandike evidence ya kuipinga." },
    duration: 10,
    mechanism: "Cognitive Restructuring (CBT).",
    success_rate: "58%",
    action_context: "I have negative thoughts. Help me challenge them using a Thought Record."
  },
  {
    id: 'dep_mod_sleep',
    category: 'depression',
    intensity: 'moderate',
    title: { en: "Optimize Sleep", sw: "Boresha Usingizi", sheng: "Lala Fiti" },
    description: { en: "Plan a wind-down routine tonight. No phone 30 mins before bed.", sw: "Panga utaratibu wa kulala leo. Hakuna simu dakika 30 kabla ya kulala.", sheng: "Panga kulala mapema. Weka simu kando 30 mins before ulale." },
    duration: 5,
    mechanism: "Sleep quality directly impacts mood regulation.",
    success_rate: "52%",
    action_context: "Give me tips for better sleep hygiene."
  },
  
  // --- DEPRESSION (SEVERE 3.5+) ---
  {
    id: 'dep_sev_compassion',
    category: 'depression',
    intensity: 'severe',
    title: { en: "Self-Compassion", sw: "Jihurumie", sheng: "Jipe Moyo" },
    description: { en: "Talk to yourself like you would a good friend.", sw: "Ongea na wewe mwenyewe kama vile ungeongea na rafiki mwema.", sheng: "Jibongeshe fiti vile unaweza bongesha beste yako." },
    duration: 5,
    mechanism: "Reduces self-criticism and depression severity.",
    success_rate: "60%",
    action_context: "I'm being hard on myself. Help me practice self-compassion."
  },

  // --- ANXIETY (MILD 2.5-3.0) ---
  {
    id: 'anx_mild_breath',
    category: 'anxiety',
    intensity: 'mild',
    title: { en: "4-7-8 Breathing", sw: "Kupumua kwa 4-7-8", sheng: "Breathing ya 4-7-8" },
    description: { en: "Breathe in for 4, hold for 7, out for 8. Repeat 4 times.", sw: "Vuta pumzi kwa 4, shikilia kwa 7, toa kwa 8.", sheng: "Vuta hewa 4, shikiria 7, toa 8." },
    duration: 5,
    mechanism: "Activates parasympathetic nervous system (calming response).",
    success_rate: "78%",
    action_context: "Guide me through the 4-7-8 breathing exercise."
  },
  {
    id: 'anx_mild_ground',
    category: 'anxiety',
    intensity: 'mild',
    title: { en: "5-Senses Grounding", sw: "Kutuliza kwa Hisi 5", sheng: "Grounding ya Senses 5" },
    description: { en: "Name 5 things you see, 4 touch, 3 hear, 2 smell, 1 taste.", sw: "Taja vitu 5 unavyoona, 4 unavyogusa...", sheng: "Taja vitu 5 unaona, 4 unagusa..." },
    duration: 5,
    mechanism: "Redirects attention from anxious thoughts to present moment.",
    success_rate: "72%",
    action_context: "Help me with the 5-senses grounding technique."
  },
  
  // --- ANXIETY (MODERATE 3.0-3.5) ---
  {
    id: 'anx_mod_defusion',
    category: 'anxiety',
    intensity: 'moderate',
    title: { en: "Name the Story", sw: "Taja Hadithi", sheng: "Taja hio Story" },
    description: { en: "Say 'I'm having the thought that...' instead of 'I am...'", sw: "Sema 'Niko na wazo kwamba...' badala ya 'Mimi ni...'", sheng: "Sema 'Niko na thought ati...' badala ya 'Mimi ni...'" },
    duration: 5,
    mechanism: "Cognitive Defusion (ACT) creates distance from thoughts.",
    success_rate: "61%",
    action_context: "Help me practice cognitive defusion for my anxiety."
  },
  {
    id: 'anx_mod_pmr',
    category: 'anxiety',
    intensity: 'moderate',
    title: { en: "Muscle Relaxation", sw: "Kulegeza Misuli", sheng: "Relax Muscles" },
    description: { en: "Tense and then release muscle groups one by one.", sw: "Kaza na kisha legeza vikundi vya misuli kimoja baada ya kingine.", sheng: "Kaza alafu uachilie muscles zako pole pole." },
    duration: 10,
    mechanism: "Progressive Muscle Relaxation reduces physical tension.",
    success_rate: "71%",
    action_context: "Guide me through Progressive Muscle Relaxation (PMR)."
  },

  // --- ANXIETY (SEVERE 3.5+) ---
  {
    id: 'anx_sev_cold',
    category: 'anxiety',
    intensity: 'severe',
    title: { en: "Cold Water Shock", sw: "Maji Baridi", sheng: "Maji Baridi" },
    description: { en: "Splash cold water on your face or hold ice.", sw: "Jipake maji baridi usoni au shikilia barafu.", sheng: "Jipake maji baridi kwa uso ama shika barafu." },
    duration: 1,
    mechanism: "Mammalian dive response activates calming reflex immediately.",
    success_rate: "72%",
    action_context: "I'm feeling panicked. Tell me about the cold water technique."
  },

  // --- CRISIS (4.5+) ---
  {
    id: 'crisis_hotline',
    category: 'crisis',
    intensity: 'severe',
    title: { en: "Call Befrienders", sw: "Piga Befrienders", sheng: "Call Befrienders" },
    description: { en: "Speak to a trained listener now (0722 178 177).", sw: "Ongea na msikilizaji aliyefunzwa sasa.", sheng: "Bonga na msee amewiva saa hii." },
    duration: 0,
    mechanism: "Immediate crisis intervention.",
    success_rate: "50%+",
    action_context: "Provide crisis contacts."
  },
  {
    id: 'crisis_safety',
    category: 'crisis',
    intensity: 'severe',
    title: { en: "Create Safety Plan", sw: "Mpango wa Usalama", sheng: "Safety Plan" },
    description: { en: "Identify triggers and safe people to contact.", sw: "Tambua vichochezi na watu salama.", sheng: "Jua triggers na wasee safe." },
    duration: 15,
    mechanism: "Reduces risk of acting on suicidal urges.",
    success_rate: "60%",
    action_context: "Help me create a safety plan."
  },

  // --- MIXED (DEP + ANX) ---
  {
    id: 'mixed_label',
    category: 'mixed',
    intensity: 'all',
    title: { en: "Label Your Emotions", sw: "Taja Hisia Zako", sheng: "Taja Feelings Zako" },
    description: { en: "Identify exactly what you feel (e.g., Sad AND Anxious).", sw: "Tambua haswa unachohisi (k.m., Huzuni NA Wasiwasi).", sheng: "Jua exactly vile unaskia (mfano, Sad NA Anxious)." },
    duration: 3,
    mechanism: "Affect labeling reduces amygdala activity.",
    success_rate: "61%",
    action_context: "Help me label my mixed emotions."
  },
  {
    id: 'mixed_soothe',
    category: 'mixed',
    intensity: 'all',
    title: { en: "Self-Soothing", sw: "Kujituliza", sheng: "Kujituliza" },
    description: { en: "Use comforting touch, smells, or sounds.", sw: "Tumia mguso, harufu, au sauti za kutuliza.", sheng: "Tumia vitu poa, harufu, ama ngoma." },
    duration: 10,
    mechanism: "Calms physiological arousal via senses.",
    success_rate: "68%",
    action_context: "Give me ideas for self-soothing."
  }
];

export const getMoodRecommendation = (result: MoodResult): MoodRecommendation => {
  const { overallScore, depressionScore, anxietyScore } = result;

  // 1. CRISIS (>= 4.5)
  if (overallScore >= 4.5) {
    return {
      type: 'crisis',
      severity: 'severe',
      message: {
        en: "We are concerned. You seem to be going through a very difficult time. Please reach out.",
        sw: "Tunakujali. Inaonekana unapitia wakati mgumu sana. Tafadhali tafuta msaada.",
        sheng: "Tunakujali. Inakaa unapitia time ngumu sana. Tafadhali holla tusaidiane."
      },
      strategies: STRATEGIES.filter(s => s.category === 'crisis')
    };
  }

  // 2. POSITIVE (< 2.5)
  if (overallScore < 2.5) {
    return {
      type: 'positive',
      severity: 'mild',
      message: {
        en: "You're doing well! Keep building these positive habits.",
        sw: "Unaendelea vizuri! Endelea kujenga tabia hizi chanya.",
        sheng: "Unaendelea fiti! Endelea na hizi habits poa."
      },
      strategies: STRATEGIES.filter(s => s.category === 'positive')
    };
  }

  // 3. DETERMINE DOMINANT SYMPTOM & INTENSITY
  const isDepressionDominant = depressionScore > anxietyScore + 0.5;
  const isAnxietyDominant = anxietyScore > depressionScore + 0.5;
  const isMixed = !isDepressionDominant && !isAnxietyDominant;

  const intensity = overallScore < 3.5 ? 'mild' : 'moderate'; 
  // Map 'moderate' logic to 'severe' strategies if score is high moderate (>4.0) but not crisis? 
  // For simplicity, we stick to mild/moderate buckets for non-crisis.
  // Actually, let's allow 'severe' strategies if > 3.5 since 3.6-4.5 is "Struggling"
  const strategyIntensity = overallScore < 3.0 ? 'mild' : overallScore < 3.8 ? 'moderate' : 'severe';

  let selectedStrategies: MoodStrategy[] = [];

  if (isMixed) {
     selectedStrategies = [
         ...STRATEGIES.filter(s => s.category === 'mixed'),
         // Add best of both worlds
         STRATEGIES.find(s => s.id === 'anx_mild_breath')!,
         STRATEGIES.find(s => s.id === 'dep_mild_ba')!
     ].filter(Boolean);
  } else if (isDepressionDominant) {
     selectedStrategies = STRATEGIES.filter(s => 
         s.category === 'depression' && 
         (s.intensity === 'all' || s.intensity === strategyIntensity || 
          (strategyIntensity === 'severe' && s.intensity === 'moderate') ||
          (strategyIntensity === 'moderate' && s.intensity === 'mild'))
     );
  } else {
     // Anxiety Dominant
     selectedStrategies = STRATEGIES.filter(s => 
        s.category === 'anxiety' && 
        (s.intensity === 'all' || s.intensity === strategyIntensity ||
         (strategyIntensity === 'severe' && s.intensity === 'moderate') ||
         (strategyIntensity === 'moderate' && s.intensity === 'mild'))
    );
  }

  // Shuffle and pick top 3
  selectedStrategies = selectedStrategies.sort(() => Math.random() - 0.5).slice(0, 3);

  // Fallback if not enough strategies found
  if (selectedStrategies.length < 2) {
      selectedStrategies.push(STRATEGIES.find(s => s.id === 'anx_mild_ground')!);
  }

  if (isMixed) {
      return {
          type: 'mixed',
          severity: intensity,
          message: {
              en: "You seem to be feeling a mix of stress and low mood.",
              sw: "Inaonekana unahisi mchanganyiko wa msongo na huzuni.",
              sheng: "Inakaa unaskia mix ya stress na kuwa down."
          },
          strategies: selectedStrategies
      };
  }

  if (isDepressionDominant) {
      return {
          type: 'depression',
          severity: intensity,
          message: {
              en: intensity === 'mild' ? "Your mood is a bit low. Small actions can help." : "You're feeling quite down. Be gentle with yourself.",
              sw: intensity === 'mild' ? "Hali yako iko chini kidogo. Hatua ndogo zinaweza kusaidia." : "Unahisi huzuni nyingi. Kuwa mpole kwako.",
              sheng: intensity === 'mild' ? "Mood iko down kiasi. Vitu ndogo zitasaidia." : "Unaskia vibaya sana. Jipe time."
          },
          strategies: selectedStrategies
      };
  } else {
      return {
          type: 'anxiety',
          severity: intensity,
          message: {
              en: intensity === 'mild' ? "You're feeling a bit anxious. Grounding can help." : "Anxiety levels are high. Let's slow things down.",
              sw: intensity === 'mild' ? "Una wasiwasi kidogo. Kutuliza kunaweza kusaidia." : "Wasiwasi ni mwingi. Hebu tupunguze mwendo.",
              sheng: intensity === 'mild' ? "Uko na wasiwasi kiasi. Grounding itasaidia." : "Tension iko juu. Wacha turelax kiasi."
          },
          strategies: selectedStrategies
      };
  }
};