import React, { useState, useEffect } from 'react';
import { MOOD_QUESTIONS, calculateMoodResults, getMoodRecommendation } from '../services/moodData';
import { Language, MoodResult, MoodRecommendation } from '../types';
import { ArrowLeft, Play, CheckCircle2, HeartPulse, ChevronRight, BarChart2, HelpCircle, Info, ChevronUp, ChevronDown, Lightbulb } from 'lucide-react';
import { MoodChart } from './MoodChart';

interface Props {
  language: Language;
  onComplete: (result: MoodResult) => void; 
  onCancel: () => void;
  onChatTrigger: (message: string) => void;
  previousResult?: MoodResult | null;
}

const MOOD_FAQS = [
  {
    q: { en: "Why check my mood?", sw: "Kwa nini nipime hisia zangu?", sheng: "Mbona nicheki mood yangu?" },
    a: { 
      en: "Tracking your mood helps you understand patterns, triggers, and when to seek support. It's like a thermometer for your mind.",
      sw: "Kufuatilia hisia zako hukusaidia kuelewa mitindo, vichochezi, na wakati wa kutafuta msaada. Ni kama kipimajoto cha akili yako.",
      sheng: "Kucheki mood inakusaidia kujua patterns zako na nini inakuafect. Ni kama thermometer ya akili."
    }
  },
  {
    q: { en: "Is this a medical diagnosis?", sw: "Je, huu ni uchunguzi wa kimatibabu?", sheng: "Hii ni diagnosis ya daktari?" },
    a: {
      en: "No. This is a rapid screening tool (IMS-12) to help you understand your current state. It does not replace a doctor.",
      sw: "Hapana. Hii ni zana ya uchunguzi wa haraka kukusaidia kuelewa hali yako ya sasa. Haichukui nafasi ya daktari.",
      sheng: "Zii. Hii ni tool ya kukusaidia kujicheki haraka. Sio replacement ya daktari."
    }
  },
  {
    q: { en: "What if I feel like hurting myself?", sw: "Je, nikijisikia kujiumiza?", sheng: "Nifanye aje nikiskia kujiumiza?" },
    a: {
      en: "Please seek help immediately. We will provide emergency contacts like Befrienders Kenya (0722 178 177) if you are in crisis.",
      sw: "Tafadhali tafuta msaada mara moja. Tutatoa mawasiliano ya dharura kama Befrienders Kenya ikiwa uko hatarini.",
      sheng: "Tafadhali tafuta help haraka. Tutakupea namba za emergency kama Befrienders ukikwama."
    }
  },
  {
    q: { en: "Who sees my results?", sw: "Nani anaona matokeo yangu?", sheng: "Nani huona results zangu?" },
    a: {
      en: "Only you. Your data is stored temporarily on your device for this session.",
      sw: "Wewe tu. Data yako imehifadhiwa kwa muda kwenye kifaa chako kwa kikao hiki.",
      sheng: "Wewe pekee. Data yako inakaa kwa simu yako kwa hii session tu."
    }
  }
];

export const MoodAssessment: React.FC<Props> = ({ language, onComplete, onCancel, onChatTrigger, previousResult }) => {
  // Session Storage helper
  const getStorage = <T,>(key: string, initialValue: T): T => {
    try {
        const saved = sessionStorage.getItem(key);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.warn('Failed to parse mood storage', e);
    }
    return initialValue;
  };

  const [started, setStarted] = useState(() => getStorage('mindcare_mood_started', false));
  const [currentIndex, setCurrentIndex] = useState(() => getStorage('mindcare_mood_index', 0));
  const [scores, setScores] = useState<Record<number, number>>(() => getStorage('mindcare_mood_scores', {}));
  
  // Local state for UI
  const [viewMode, setViewMode] = useState<'assessment' | 'result'>('assessment');
  const [currentResult, setCurrentResult] = useState<MoodResult | null>(null);
  const [recommendation, setRecommendation] = useState<MoodRecommendation | null>(null);
  const [showFaqList, setShowFaqList] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Persist State
  useEffect(() => {
    sessionStorage.setItem('mindcare_mood_started', JSON.stringify(started));
  }, [started]);

  useEffect(() => {
    sessionStorage.setItem('mindcare_mood_index', JSON.stringify(currentIndex));
  }, [currentIndex]);

  useEffect(() => {
    sessionStorage.setItem('mindcare_mood_scores', JSON.stringify(scores));
  }, [scores]);

  // Handle viewing previous result
  const handleViewPrevious = () => {
      if (previousResult) {
          const rec = getMoodRecommendation(previousResult);
          setCurrentResult(previousResult);
          setRecommendation(rec);
          setViewMode('result');
          setStarted(true);
      }
  };

  const handleStart = () => {
      // Clear old session if starting new
      setScores({});
      setCurrentIndex(0);
      setStarted(true);
      setViewMode('assessment');
  };

  const handleScoreChange = (val: number) => {
    const qId = MOOD_QUESTIONS[currentIndex].id;
    setScores(prev => ({ ...prev, [qId]: val }));
  };

  const handleNext = () => {
    if (currentIndex < MOOD_QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishAssessment();
    }
  };

  const finishAssessment = () => {
    // Ensure last answer is captured
    const finalScores = { ...scores };
    // Fill defaults if missing (should be prevented by UI but safe to check)
    MOOD_QUESTIONS.forEach(q => {
        if (!finalScores[q.id]) finalScores[q.id] = 3; 
    });

    const res = calculateMoodResults(finalScores);
    const rec = getMoodRecommendation(res);
    
    setCurrentResult(res);
    setRecommendation(rec);
    setViewMode('result');
    onComplete(res);
    
    // Clear progress from session storage
    sessionStorage.removeItem('mindcare_mood_started');
    sessionStorage.removeItem('mindcare_mood_index');
    sessionStorage.removeItem('mindcare_mood_scores');
  };

  // Helper to get color based on score (1-6)
  const getScoreColor = (score: number) => {
    if (score <= 2) return 'bg-green-500';
    if (score <= 3.5) return 'bg-yellow-400';
    if (score <= 4.5) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const getEmoji = (score: number) => {
    if (score <= 2) return '😊'; // Happy/Calm
    if (score <= 3) return '😐'; // Neutral
    if (score <= 4) return '😟'; // Worried
    if (score <= 5) return '😫'; // Stressed
    return '😡'; // Crisis/Overwhelmed
  };

  // View: Recommendation / Result
  if (viewMode === 'result' && currentResult && recommendation) {
    return (
      <div className="max-w-xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header based on Type */}
          <div className={`p-6 text-white text-center ${
            recommendation.type === 'crisis' ? 'bg-red-600' :
            recommendation.type === 'positive' ? 'bg-green-600' :
            recommendation.type === 'anxiety' ? 'bg-orange-500' :
            'bg-blue-500' // Depression
          }`}>
             <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner">
                <HeartPulse size={32} className="text-white" />
             </div>
             <h2 className="text-2xl font-bold mb-1">
               {language === 'sw' ? 'Matokeo Yako' : language === 'sheng' ? 'Results Zako' : 'Your Mood Check'}
             </h2>
             <p className="opacity-90 font-medium text-sm bg-white/20 inline-block px-3 py-1 rounded-full">
               {recommendation.type === 'crisis' ? 'Alert' : 
                recommendation.type === 'positive' ? 'Excellent Condition' :
                recommendation.type === 'anxiety' ? 'Anxiety Detected' : 'Low Mood Detected'}
             </p>
          </div>

          <div className="p-6">
            
            {/* Visual Chart */}
            <MoodChart result={currentResult} />

            <div className="bg-gray-50 rounded-xl p-5 mb-8 border border-gray-100">
                <p className="text-gray-700 text-lg text-center leading-relaxed font-medium">
                "{recommendation.message[language]}"
                </p>
            </div>

            {/* Activities */}
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4 text-center">
              {language === 'sw' ? 'Jaribu Hii Sasa' : language === 'sheng' ? 'Jaribu Hii' : 'Recommended For You'}
            </h3>

            <div className="space-y-3">
               {recommendation.activities.map((activity, idx) => (
                 <button
                   key={idx}
                   onClick={() => {
                       if (activity.action === 'crisis_hotline') {
                           window.location.href = 'tel:0722178177';
                       } else if (activity.action === 'nav_assessment') {
                           onCancel(); 
                       } else {
                           let msg = "";
                           if (activity.action === 'chat_breathing') msg = "I'm feeling anxious. Can you guide me through a 4-7-8 breathing exercise?";
                           if (activity.action === 'chat_grounding') msg = "I need to calm down. Can you help me with the 5-senses grounding technique?";
                           if (activity.action === 'chat_journal') msg = "I want to journal my wins for today. Can you help me start?";
                           if (activity.action === 'chat_behavioral_activation') msg = "I'm feeling low. Can you help me pick one small enjoyable thing to do right now?";
                           if (activity.action === 'chat_safety_plan') msg = "I'm feeling unsafe. Can you help me make a safety plan?";
                           if (activity.action === 'chat_low_mood') msg = "I'm feeling down and just want to talk to someone who understands.";
                           
                           onChatTrigger(msg);
                       }
                   }}
                   className={`w-full py-4 px-6 rounded-xl text-left flex items-center justify-between group transition-all shadow-sm ${
                     recommendation.type === 'crisis' 
                     ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' 
                     : 'bg-white text-gray-800 hover:bg-primary hover:text-white border border-gray-100 hover:border-primary'
                   }`}
                 >
                    <span className="font-semibold">{activity.title[language]}</span>
                    {activity.action === 'crisis_hotline' ? <PhoneIcon /> : <ChevronRight className="opacity-50 group-hover:opacity-100" />}
                 </button>
               ))}
            </div>
            
            <button 
              onClick={onCancel}
              className="mt-8 w-full py-3 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View: Welcome
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto p-4 min-h-[500px] flex flex-col">
        <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          
          <div className="flex items-center gap-2 mb-4">
             <button 
                 onClick={onCancel}
                 className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                 aria-label="Back"
             >
                 <ArrowLeft size={24} />
             </button>
             <h2 className="text-xl font-bold text-gray-900">
               {language === 'sw' ? 'Karibu kwenye Kipimo' : language === 'sheng' ? 'Karibu kwa Mood Check' : 'Welcome to Mood Check'}
             </h2>
          </div>

          {/* Theme: Indigo/Violet for Mood */}
          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-6 text-center">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-indigo-600">
                <HeartPulse size={32} />
             </div>
             <h3 className="text-lg font-bold text-indigo-700 mb-2">
               {language === 'sw' ? 'Elewa Hisia Zako' : language === 'sheng' ? 'Jijue Vile Unajiskia' : 'Understand Your Feelings'}
             </h3>
             <p className="text-gray-600 leading-relaxed">
               {language === 'sw' 
                 ? 'Chukua dakika 2 kuangalia unavyohisi sasa. Hii itatusaidia kukusaidia vyema.' 
                 : language === 'sheng' 
                 ? 'Chukua 2 mins tucheki vile unajiskia saa hii. Hii itatusaidia kukusupport.' 
                 : 'Take 2 minutes to check in on how you are feeling right now. This helps us support you better.'}
             </p>
          </div>

          {/* FAQ Section */}
          <div className="space-y-3">
             <button 
                onClick={() => setShowFaqList(!showFaqList)}
                className="w-full flex items-center justify-between font-bold text-gray-700 text-sm uppercase tracking-wide p-2 hover:bg-gray-50 rounded-lg transition-colors"
             >
                <span className="flex items-center gap-2">
                    <Info size={16} /> FAQ / Maswali
                </span>
                {showFaqList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </button>

             {showFaqList && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    {MOOD_FAQS.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <button 
                        onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                        >
                        <span className="font-medium text-gray-800 text-sm pr-4">{faq.q[language]}</span>
                        {openFaqIndex === index ? <ChevronUp size={16} className="shrink-0 text-gray-500" /> : <ChevronDown size={16} className="shrink-0 text-gray-500" />}
                        </button>
                        {openFaqIndex === index && (
                        <div className="p-4 bg-white text-sm text-gray-600 leading-relaxed border-t border-gray-200 animate-in fade-in slide-in-from-top-1 duration-200">
                            {faq.a[language]}
                        </div>
                        )}
                    </div>
                    ))}
                </div>
             )}
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
            <button 
              onClick={handleStart}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {language === 'sw' ? 'Anza Sasa' : language === 'sheng' ? 'Anza Sasa' : 'Start Check-in'}
              <Play size={20} fill="currentColor" />
            </button>
            
            {previousResult && (
                <button 
                onClick={handleViewPrevious}
                className="w-full py-3 bg-white text-indigo-600 border-2 border-indigo-100 rounded-xl font-bold text-base hover:bg-indigo-50 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                <BarChart2 size={20} />
                {language === 'sw' ? 'Angalia Matokeo Yaliyopita' : language === 'sheng' ? 'Cheki Last Results' : 'View Last Check-in'}
                </button>
            )}
        </div>
      </div>
    );
  }

  // View: Question Slider
  const question = MOOD_QUESTIONS[currentIndex];
  const currentScore = scores[question.id] || 3; // Default center

  return (
    <div className="max-w-lg mx-auto p-4 min-h-[500px] flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Progress */}
      <div className="flex items-center justify-between mb-8 text-gray-400 text-sm font-medium">
         <button onClick={onCancel} className="hover:text-gray-600 p-2 -ml-2 rounded-full"><ArrowLeft size={20} /></button>
         <span>{currentIndex + 1} / {MOOD_QUESTIONS.length}</span>
      </div>

      {/* Question */}
      <div className="text-center mb-10">
         <h3 className="text-2xl font-bold text-gray-800 leading-snug mb-2">
            {question.text[language]}
         </h3>
         <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">
             {language === 'sw' ? 'Hivi sasa...' : language === 'sheng' ? 'Saa hii...' : 'Right now...'}
         </p>
      </div>

      {/* Slider Interaction Area */}
      <div className="bg-gray-50 rounded-3xl p-6 md:p-8 mb-8 border border-gray-100 shadow-inner">
         <div className="flex justify-center mb-6">
            <div className={`text-6xl transition-transform duration-300 transform hover:scale-110 cursor-default select-none filter drop-shadow-sm`}>
                {getEmoji(currentScore)}
            </div>
         </div>

         <input 
           type="range" 
           min="1" 
           max="6" 
           step="1"
           value={currentScore}
           onChange={(e) => handleScoreChange(parseInt(e.target.value))}
           className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
           style={{
               background: `linear-gradient(to right, #22c55e 0%, #eab308 50%, #ef4444 100%)`
           }}
         />
         
         <div className="flex justify-between mt-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400">
             <span>Strongly Disagree</span>
             <span>Strongly Agree</span>
         </div>
      </div>

      {/* Navigation */}
      <button 
        onClick={handleNext}
        className={`w-full py-4 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${getScoreColor(currentScore)}`}
      >
        {currentIndex === MOOD_QUESTIONS.length - 1 ? (
            <>Finish <CheckCircle2 size={20} /></>
        ) : (
            <>Next <Play size={20} fill="currentColor" /></>
        )}
      </button>

    </div>
  );
};

const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
);