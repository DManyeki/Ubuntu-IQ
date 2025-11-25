import { Question, Career, RIASECCode } from '../types';

export const QUESTIONS: Question[] = [
  // REALISTIC (R)
  { 
    id: 1, 
    code: 'R', 
    text: { en: "I enjoy working with my hands on physical tasks", sw: "Ninafurahia kufanya kazi za mikono", sheng: "Napenda job ya mkono, kujenga na kutengeneza vitu" },
    guide: { 
      en: "Examples: Repairing electronics, farming, carpentry, or cooking.", 
      sw: "Mifano: Kutengeneza vifaa vya umeme, ukulima, useremala, au kupika.", 
      sheng: "Mfano: Kutengeneza simu, kulima, useremala, ama kupika." 
    }
  },
  { 
    id: 2, 
    code: 'R', 
    text: { en: "I prefer jobs outdoors or in active environments", sw: "Napendelea kazi za nje au zenye harakati", sheng: "Napenda kuwa nje, sio kukaa ofisi saa zote" },
    guide: { 
      en: "Think about: Working in the field, construction sites, or nature reserves vs sitting at a desk.", 
      sw: "Fikiria: Kufanya kazi shambani, kwenye ujenzi, au mbugani badala ya kukaa ofisini.", 
      sheng: "Fikiria: Job ya field, mjengo, ama kwa nature badala ya kukaa kwa desk." 
    }
  },
  { 
    id: 3, 
    code: 'R', 
    text: { en: "I'm skilled at fixing or building things", sw: "Nina ujuzi wa kurekebisha au kujenga vitu", sheng: "Niko fiti na tools, naweza fix vitu haraka" },
    guide: { 
      en: "Do you like assembling furniture, fixing broken taps, or troubleshooting engines?", 
      sw: "Je, unapenda kuunganisha samani, kurekebisha mifereji, au kushughulikia injini?", 
      sheng: "Unapenda kuunda viti, kurepair mifereji, ama kuangalia injini za gari?" 
    }
  },
  { 
    id: 4, 
    code: 'R', 
    text: { en: "I enjoy practical, hands-on work more than theory", sw: "Ninafurahia kazi za vitendo kuliko nadharia", sheng: "Bora vitendo kuliko stori mingi za theory" },
    guide: { 
      en: "You prefer learning by doing rather than reading textbooks.", 
      sw: "Unapendelea kujifunza kwa vitendo badala ya kusoma vitabu.", 
      sheng: "Unapenda kushika na kufanya ndio ushike, sio kusoma tu kwa vitabu." 
    }
  },

  // INVESTIGATIVE (I)
  { 
    id: 5, 
    code: 'I', 
    text: { en: "I love solving complex problems and puzzles", sw: "Napenda kutatua shida ngumu na mafumbo", sheng: "Napenda kusolve mashida ngumu na puzzles" },
    guide: { 
      en: "Think about: Math problems, logic games, or figuring out why something broke.", 
      sw: "Fikiria: Hesabu, michezo ya akili, au kuelewa kwa nini kitu kiliharibika.", 
      sheng: "Fikiria: Mahesabu, games za akili, ama kujua mbona kitu iliharibika." 
    }
  },
  { 
    id: 6, 
    code: 'I', 
    text: { en: "I'm curious about how things work scientifically", sw: "Nina hamu ya kujua jinsi vitu hufanya kazi kisayansi", sheng: "Nataka kujua vile vitu work kisayansi" },
    guide: { 
      en: "Topics like biology, physics, chemistry, or how computers process data interest you.", 
      sw: "Mada kama biolojia, fizikia, kemia, au jinsi kompyuta inavyofanya kazi zinakuvutia.", 
      sheng: "Biology, physics, chemistry, ama vile computers ufanya kazi inakubamba." 
    }
  },
  { 
    id: 7, 
    code: 'I', 
    text: { en: "I prefer research and analysis to routine tasks", sw: "Napendelea utafiti na uchambuzi kuliko kazi za kawaida", sheng: "Heri nifanye research kuliko job ya kila siku inayoboo" },
    guide: { 
      en: "You enjoy digging deep for information rather than doing the same repetitive task daily.", 
      sw: "Unafurahia kutafuta habari kwa kina badala ya kufanya kazi ileile kila siku.", 
      sheng: "Unapenda kuchimbua info ndani badala ya kufanya job moja kila siku." 
    }
  },
  { 
    id: 8, 
    code: 'I', 
    text: { en: "I enjoy learning new technical concepts", sw: "Ninafurahia kujifunza dhana mpya za kiufundi", sheng: "Napenda kuelewa vitu technical na mpya" },
    guide: { 
      en: "Examples: Learning code, understanding engine mechanics, or medical terms.", 
      sw: "Mifano: Kujifunza kodi za kompyuta, kuelewa mitambo, au lugha ya matibabu.", 
      sheng: "Mfano: Kujifunza coding, kuelewa injini, ama majina za daktari." 
    }
  },

  // ARTISTIC (A)
  { 
    id: 9, 
    code: 'A', 
    text: { en: "I express myself through creative activities", sw: "Ninajieleza kupitia shughuli za ubunifu", sheng: "Napenda kujiexpress na art na vitu creative" },
    guide: { 
      en: "Think about: Painting, writing stories, fashion, photography, or cooking new recipes.", 
      sw: "Fikiria: Kuchora, kuandika hadithi, mitindo, picha, au kupika mapishi mapya.", 
      sheng: "Fikiria: Kuchora, kuandika stories, fashion, kupiga picha, ama kupika vitu new." 
    }
  },
  { 
    id: 10, 
    code: 'A', 
    text: { en: "I enjoy designing or creating aesthetic things", sw: "Ninafurahia kubuni au kuunda vitu vya kupendeza", sheng: "Napenda kudesign vitu zinakaa fiti" },
    guide: { 
      en: "You care about how things look—colors, layout, decoration, and style.", 
      sw: "Unajali jinsi vitu vinavyoonekana—rangi, mpangilio, mapambo, na mtindo.", 
      sheng: "Unajali vile vitu zinakaa—rangi, mpangilio, mapambo, na style." 
    }
  },
  { 
    id: 11, 
    code: 'A', 
    text: { en: "I prefer working in unconventional, creative ways", sw: "Napendelea kufanya kazi kwa njia za kiubunifu zisizo za kawaida", sheng: "Sipendi njia za kawaida, napenda njia zangu za creative" },
    guide: { 
      en: "You prefer freedom and flexibility over strict rules and uniforms.", 
      sw: "Unapendelea uhuru na kunyumbulika kuliko sheria kali na sare.", 
      sheng: "Unapenda uhuru na flexibility kuliko sheria kali na uniform." 
    }
  },
  { 
    id: 12, 
    code: 'A', 
    text: { en: "I'm drawn to music, art, writing, or performance", sw: "Ninavutiwa na muziki, sanaa, uandishi, au maonyesho", sheng: "Music, art, na kuact ni vitu zangu" },
    guide: { 
      en: "Examples: Singing, acting in plays, writing poetry, or graphic design.", 
      sw: "Mifano: Kuimba, kuigiza, kuandika mashairi, au usanifu wa picha.", 
      sheng: "Mfano: Kuimba, kuact, kuandika mashairi, ama graphic design." 
    }
  },

  // SOCIAL (S)
  { 
    id: 13, 
    code: 'S', 
    text: { en: "I enjoy helping others and making a positive impact", sw: "Ninafurahia kusaidia wengine na kuleta mabadiliko chanya", sheng: "Napenda kusaidia wasee na kuleta impact" },
    guide: { 
      en: "You feel good when you assist friends with problems or volunteer.", 
      sw: "Unajiskia vizuri unaposaidia marafiki wenye shida au kujitolea.", 
      sheng: "Unajiskia fiti ukisaidia mabeste wako na mashida zao." 
    }
  },
  { 
    id: 14, 
    code: 'S', 
    text: { en: "I work well in team environments", sw: "Ninafanya kazi vizuri katika timu", sheng: "Hupenda kufanya kazi na genge ama team" },
    guide: { 
      en: "You prefer group projects, sports teams, or community groups over working alone.", 
      sw: "Unapendelea miradi ya kikundi, timu za michezo, au vikundi vya kijamii kuliko kufanya kazi peke yako.", 
      sheng: "Unapenda project za group, team za ball, ama chama kuliko kufanya kazi solo." 
    }
  },
  { 
    id: 15, 
    code: 'S', 
    text: { en: "I prefer careers involving teaching or counseling", sw: "Napendelea kazi zinazohusisha kufundisha au ushauri", sheng: "Napenda kufunza au kushauri watu" },
    guide: { 
      en: "You like explaining things to others or listening to their personal issues.", 
      sw: "Unapenda kuelezea watu mambo au kusikiliza shida zao za kibinafsi.", 
      sheng: "Unapenda kuexplainia watu vitu ama kuskiza mashida zao." 
    }
  },
  { 
    id: 16, 
    code: 'S', 
    text: { en: "I'm good at understanding and supporting others", sw: "Ni mzuri katika kuelewa na kusaidia wengine", sheng: "Naelewa wasee haraka na kuwapa support" },
    guide: { 
      en: "People often come to you for advice or comfort when they are sad.", 
      sw: "Watu mara nyingi huja kwako kwa ushauri au faraja wanapokuwa na huzuni.", 
      sheng: "Wasee hukujia advice ama comfort wakiwa wameboeka." 
    }
  },

  // ENTERPRISING (E)
  { 
    id: 17, 
    code: 'E', 
    text: { en: "I like leading teams and taking initiative", sw: "Napenda kuongoza timu na kuchukua hatua", sheng: "Napenda kuwa kiongozi na kuanzisha mambo" },
    guide: { 
      en: "You enjoy being the captain, class prefect, or project leader.", 
      sw: "Unafurahia kuwa nahodha, kiranja wa darasa, au kiongozi wa mradi.", 
      sheng: "Unabambika kuwa captain, prefect, ama leader wa project." 
    }
  },
  { 
    id: 18, 
    code: 'E', 
    text: { en: "I enjoy persuading others to my viewpoint", sw: "Ninafurahia kushawishi wengine kwa mtazamo wangu", sheng: "Naweza convince wasee wakubaliane nami" },
    guide: { 
      en: "You are good at debating, selling ideas, or convincing people to agree with you.", 
      sw: "Wewe ni hodari katika mdahalo, kuuza maoni, au kushawishi watu wakubaliane nawe.", 
      sheng: "Wewe ni mnoma kwa debate, kuuza idea, ama kuconvince wasee." 
    }
  },
  { 
    id: 19, 
    code: 'E', 
    text: { en: "I'm drawn to business and entrepreneurship", sw: "Ninavutiwa na biashara na ujasiriamali", sheng: "Biashara na hustle ni vitu zangu" },
    guide: { 
      en: "You think about starting a side hustle, making profit, or managing a shop.", 
      sw: "Unafikiria kuanzisha biashara ndogo, kupata faida, au kusimamia duka.", 
      sheng: "Unafikiria kuanzisha hustle, kupata profit, ama kumanage duka." 
    }
  },
  { 
    id: 20, 
    code: 'E', 
    text: { en: "I like making decisions and taking calculated risks", sw: "Napenda kufanya maamuzi na kuchukua hatari zilizopimwa", sheng: "Sogopi kucalculate risk na kumake decision" },
    guide: { 
      en: "You are comfortable making tough choices even when the outcome is uncertain.", 
      sw: "Uko vizuri kufanya maamuzi magumu hata wakati matokeo hayana uhakika.", 
      sheng: "Huwezi ogopa kumake decision ngumu hata kama hujui outcome." 
    }
  },

  // CONVENTIONAL (C)
  { 
    id: 21, 
    code: 'C', 
    text: { en: "I prefer organized, systematic work", sw: "Napendelea kazi iliyopangwa na yenye utaratibu", sheng: "Napenda kazi imepangwa vizuri, sio shagala bagala" },
    guide: { 
      en: "You like having a timetable, filing documents, or arranging things in order.", 
      sw: "Unapenda kuwa na ratiba, kuhifadhi nyaraka, au kupanga vitu kwa mpangilio.", 
      sheng: "Unapenda kuwa na timetable, kufile documents, ama kupanga vitu kwa order." 
    }
  },
  { 
    id: 22, 
    code: 'C', 
    text: { en: "I'm detail-oriented and careful about accuracy", sw: "Ninazingatia maelezo na kuwa makini kuhusu usahihi", sheng: "Mimi huangalia details ndogo ndogo sana" },
    guide: { 
      en: "You easily spot spelling errors, calculation mistakes, or missing details.", 
      sw: "Unagundua makosa ya tahajia, makosa ya hesabu, au maelezo yaliyokosekana kwa urahisi.", 
      sheng: "Unanotice makosa ya spelling, hesabu, ama vitu zimemiss haraka sana." 
    }
  },
  { 
    id: 23, 
    code: 'C', 
    text: { en: "I enjoy administrative and organizational tasks", sw: "Ninafurahia kazi za utawala na shirika", sheng: "Napenda kazi za ofisi na kupanga vitu" },
    guide: { 
      en: "Examples: Keeping records, managing inventory, or planning events.", 
      sw: "Mifano: Kutunza kumbukumbu, kusimamia orodha ya bidhaa, au kupanga hafla.", 
      sheng: "Mfano: Kuweka records, kumanage stock, ama kuplan events." 
    }
  },
  { 
    id: 24, 
    code: 'C', 
    text: { en: "I like clear rules, procedures, and structure", sw: "Napenda sheria na taratibu zilizo wazi", sheng: "Napenda sheria clear na structure, sio vitu ovyo" },
    guide: { 
      en: "You prefer knowing exactly what is expected of you and following a set method.", 
      sw: "Unapendelea kujua haswa kile kinachotarajiwa kwako na kufuata njia iliyowekwa.", 
      sheng: "Unapenda kujua exactly nini inahitajika na kufuata njia moja clear." 
    }
  }
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