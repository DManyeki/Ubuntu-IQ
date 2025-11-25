import { Question, Career, RIASECCode } from '../types';

export const QUESTIONS: Question[] = [
  // REALISTIC (R)
  { id: 1, code: 'R', text: { en: "I enjoy working with my hands on physical tasks", sw: "Ninafurahia kufanya kazi za mikono", sheng: "Napenda job ya mkono, kujenga na kutengeneza vitu" } },
  { id: 2, code: 'R', text: { en: "I prefer jobs outdoors or in active environments", sw: "Napendelea kazi za nje au zenye harakati", sheng: "Napenda kuwa nje, sio kukaa ofisi saa zote" } },
  { id: 3, code: 'R', text: { en: "I'm skilled at fixing or building things", sw: "Nina ujuzi wa kurekebisha au kujenga vitu", sheng: "Niko fiti na tools, naweza fix vitu haraka" } },
  { id: 4, code: 'R', text: { en: "I enjoy practical, hands-on work more than theory", sw: "Ninafurahia kazi za vitendo kuliko nadharia", sheng: "Bora vitendo kuliko stori mingi za theory" } },

  // INVESTIGATIVE (I)
  { id: 5, code: 'I', text: { en: "I love solving complex problems and puzzles", sw: "Napenda kutatua shida ngumu na mafumbo", sheng: "Napenda kusolve mashida ngumu na puzzles" } },
  { id: 6, code: 'I', text: { en: "I'm curious about how things work scientifically", sw: "Nina hamu ya kujua jinsi vitu hufanya kazi kisayansi", sheng: "Nataka kujua vile vitu work kisayansi" } },
  { id: 7, code: 'I', text: { en: "I prefer research and analysis to routine tasks", sw: "Napendelea utafiti na uchambuzi kuliko kazi za kawaida", sheng: "Heri nifanye research kuliko job ya kila siku inayoboo" } },
  { id: 8, code: 'I', text: { en: "I enjoy learning new technical concepts", sw: "Ninafurahia kujifunza dhana mpya za kiufundi", sheng: "Napenda kuelewa vitu technical na mpya" } },

  // ARTISTIC (A)
  { id: 9, code: 'A', text: { en: "I express myself through creative activities", sw: "Ninajieleza kupitia shughuli za ubunifu", sheng: "Napenda kujiexpress na art na vitu creative" } },
  { id: 10, code: 'A', text: { en: "I enjoy designing or creating aesthetic things", sw: "Ninafurahia kubuni au kuunda vitu vya kupendeza", sheng: "Napenda kudesign vitu zinakaa fiti" } },
  { id: 11, code: 'A', text: { en: "I prefer working in unconventional, creative ways", sw: "Napendelea kufanya kazi kwa njia za kiubunifu zisizo za kawaida", sheng: "Sipendi njia za kawaida, napenda njia zangu za creative" } },
  { id: 12, code: 'A', text: { en: "I'm drawn to music, art, writing, or performance", sw: "Ninavutiwa na muziki, sanaa, uandishi, au maonyesho", sheng: "Music, art, na kuact ni vitu zangu" } },

  // SOCIAL (S)
  { id: 13, code: 'S', text: { en: "I enjoy helping others and making a positive impact", sw: "Ninafurahia kusaidia wengine na kuleta mabadiliko chanya", sheng: "Napenda kusaidia wasee na kuleta impact" } },
  { id: 14, code: 'S', text: { en: "I work well in team environments", sw: "Ninafanya kazi vizuri katika timu", sheng: "Hupenda kufanya kazi na genge ama team" } },
  { id: 15, code: 'S', text: { en: "I prefer careers involving teaching or counseling", sw: "Napendelea kazi zinazohusisha kufundisha au ushauri", sheng: "Napenda kufunza au kushauri watu" } },
  { id: 16, code: 'S', text: { en: "I'm good at understanding and supporting others", sw: "Ni mzuri katika kuelewa na kusaidia wengine", sheng: "Naelewa wasee haraka na kuwapa support" } },

  // ENTERPRISING (E)
  { id: 17, code: 'E', text: { en: "I like leading teams and taking initiative", sw: "Napenda kuongoza timu na kuchukua hatua", sheng: "Napenda kuwa kiongozi na kuanzisha mambo" } },
  { id: 18, code: 'E', text: { en: "I enjoy persuading others to my viewpoint", sw: "Ninafurahia kushawishi wengine kwa mtazamo wangu", sheng: "Naweza convince wasee wakubaliane nami" } },
  { id: 19, code: 'E', text: { en: "I'm drawn to business and entrepreneurship", sw: "Ninavutiwa na biashara na ujasiriamali", sheng: "Biashara na hustle ni vitu zangu" } },
  { id: 20, code: 'E', text: { en: "I like making decisions and taking calculated risks", sw: "Napenda kufanya maamuzi na kuchukua hatari zilizopimwa", sheng: "Sogopi kucalculate risk na kumake decision" } },

  // CONVENTIONAL (C)
  { id: 21, code: 'C', text: { en: "I prefer organized, systematic work", sw: "Napendelea kazi iliyopangwa na yenye utaratibu", sheng: "Napenda kazi imepangwa vizuri, sio shagala bagala" } },
  { id: 22, code: 'C', text: { en: "I'm detail-oriented and careful about accuracy", sw: "Ninazingatia maelezo na kuwa makini kuhusu usahihi", sheng: "Mimi huangalia details ndogo ndogo sana" } },
  { id: 23, code: 'C', text: { en: "I enjoy administrative and organizational tasks", sw: "Ninafurahia kazi za utawala na shirika", sheng: "Napenda kazi za ofisi na kupanga vitu" } },
  { id: 24, code: 'C', text: { en: "I like clear rules, procedures, and structure", sw: "Napenda sheria na taratibu zilizo wazi", sheng: "Napenda sheria clear na structure, sio vitu ovyo" } }
];

export const KENYA_CAREERS: Career[] = [
  {
    id: "civil_engineer",
    title: "Civil Engineer",
    primary_code: "RIE",
    description: "Design and oversee construction projects like roads, bridges, and buildings.",
    education_required: "University (Engineering) - 4 years",
    salary_range: "KES 90,000 - 400,000/month",
    job_outlook: "High demand, infrastructure projects",
    employers: ["Safal", "Persimmon", "Crown Construction", "Government"],
    personality_fit: "Practical + Problem-solving + Leadership",
    resources: [
        { name: "Engineers Board of Kenya", url: "https://ebk.go.ke/" },
        { name: "KUCCPS Portal", url: "https://students.kuccps.net/" }
    ]
  },
  {
    id: "software_developer",
    title: "Software Developer",
    primary_code: "IER",
    description: "Create and maintain software applications and systems.",
    education_required: "University (CS/IT) OR TVET (ICT) + Self-learning",
    salary_range: "KES 120,000 - 600,000/month",
    job_outlook: "Critical shortage, top demand",
    employers: ["Safaricom", "Equity Bank", "Tech startups", "International firms"],
    personality_fit: "Analytical + Entrepreneurial + Problem-solving",
    resources: [
        { name: "TVET Authority", url: "https://www.tveta.go.ke/" },
        { name: "Moringa School", url: "https://moringaschool.com/" }
    ]
  },
  {
    id: "nurse",
    title: "Registered Nurse",
    primary_code: "SIR",
    description: "Provide medical care and patient support in hospitals and clinics.",
    education_required: "University (Nursing) - 4 years OR Diploma (TVET) - 3 years",
    salary_range: "KES 60,000 - 250,000/month",
    job_outlook: "Chronic shortage, always hiring",
    employers: ["Public hospitals", "Private hospitals", "NGOs"],
    personality_fit: "People-focused + Caring + Practical",
    resources: [
        { name: "Nursing Council of Kenya", url: "https://nckenya.com/" },
        { name: "KMTC Admissions", url: "https://kmtc.ac.ke/" }
    ]
  },
  {
    id: "accountant",
    title: "Chartered Accountant",
    primary_code: "CES",
    description: "Manage financial records and business accounting.",
    education_required: "University (Accounting) + CPA certification",
    salary_range: "KES 80,000 - 500,000/month",
    job_outlook: "Stable demand across all sectors",
    employers: ["Banks", "Corporations", "Government", "Audit firms"],
    personality_fit: "Detail-oriented + Systematic + Entrepreneurial",
    resources: [
        { name: "ICPAK", url: "https://www.icpak.com/" },
        { name: "KASNEB", url: "https://kasneb.or.ke/" }
    ]
  },
  {
    id: "plumber",
    title: "Licensed Plumber",
    primary_code: "REC",
    description: "Install and repair water systems in residential and commercial buildings.",
    education_required: "TVET Artisan (6 months) → Craft (1-2 years)",
    salary_range: "KES 40,000 - 150,000/month",
    job_outlook: "High demand, skill shortage",
    employers: ["Self-employed", "Construction companies", "Real estate"],
    personality_fit: "Practical + Hands-on + Entrepreneurial",
    resources: [
        { name: "NITA Kenya", url: "https://www.nita.go.ke/" },
        { name: "Kenya Association of Technical Training Institutions", url: "https://katti.co.ke/" }
    ]
  },
  {
    id: "teacher",
    title: "Secondary School Teacher",
    primary_code: "SEI",
    description: "Educate students in academic subjects.",
    education_required: "University (Education) - 4 years",
    salary_range: "KES 50,000 - 200,000/month",
    job_outlook: "Good demand, government hiring via TSC",
    employers: ["Public schools", "Private schools", "International schools"],
    personality_fit: "People-focused + Service-oriented + Intellectual",
    resources: [
        { name: "Teachers Service Commission", url: "https://www.tsc.go.ke/" },
        { name: "KUCCPS", url: "https://students.kuccps.net/" }
    ]
  },
  {
    id: "entrepreneur",
    title: "Business Owner / Entrepreneur",
    primary_code: "ESC",
    description: "Start and manage own business venture.",
    education_required: "Any background; business skills helpful",
    salary_range: "Variable, unlimited upside",
    job_outlook: "Growing youth entrepreneurship, government support",
    employers: ["Self-employed"],
    personality_fit: "Leadership + Risk-taking + Autonomy-seeking",
    resources: [
        { name: "Youth Enterprise Development Fund", url: "https://www.youthfund.go.ke/" },
        { name: "Micro and Small Enterprises Authority", url: "https://msea.go.ke/" }
    ]
  },
  {
    id: "graphic_designer",
    title: "Graphic Designer",
    primary_code: "AES",
    description: "Create visual content for brands and media.",
    education_required: "TVET (Design) OR University (Fine Arts) OR Self-taught",
    salary_range: "KES 50,000 - 300,000/month",
    job_outlook: "Growing with digital economy",
    employers: ["Advertising agencies", "Media companies", "Freelance"],
    personality_fit: "Creative + Visual + Entrepreneurial",
    resources: [
        { name: "Buruburu Institute of Fine Arts", url: "https://bifa.ac.ke/" },
        { name: "Talent Garden", url: "https://talentgarden.org/" }
    ]
  }
];

export const calculateResults = (answers: Record<number, number>): { topCodes: RIASECCode[], scores: Record<RIASECCode, number> } => {
  const scores: Record<RIASECCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  
  QUESTIONS.forEach(q => {
    const answerValue = answers[q.id] || 0;
    scores[q.code] += answerValue;
  });

  const sortedCodes = (Object.keys(scores) as RIASECCode[]).sort((a, b) => scores[b] - scores[a]);
  
  return {
    scores,
    topCodes: sortedCodes.slice(0, 3)
  };
};

export const getCareerMatches = (topCodes: RIASECCode[]): Career[] => {
    const primary = topCodes[0];
    const secondary = topCodes[1];
    
    // Sort careers based on how many letters they share with the user's top 3
    return KENYA_CAREERS.map(career => {
        let matchScore = 0;
        if (career.primary_code.includes(primary)) matchScore += 3;
        if (career.primary_code.includes(secondary)) matchScore += 2;
        if (career.primary_code.includes(topCodes[2])) matchScore += 1;
        return { ...career, matchScore };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .filter(c => c.matchScore > 0);
};