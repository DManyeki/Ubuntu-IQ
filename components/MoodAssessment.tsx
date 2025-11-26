import React, { useState } from 'react';
import { MOOD_QUESTIONS, calculateMoodResults, getMoodRecommendation } from '../services/moodData';
import { Language, MoodResult, MoodRecommendation } from '../types';
import { ArrowLeft, Play, CheckCircle2, HeartPulse, ChevronRight, BarChart2, HelpCircle, Info, ChevronUp, ChevronDown, Lightbulb, Clock, BrainCircuit, Phone, Award } from 'lucide-react';
import { MoodChart } from './MoodChart';
import { useSessionStorage } from '../hooks/useSessionStorage';

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
  const [started, setStarted] = useSessionStorage<boolean>('mindcare_mood_started', false);
  const [currentIndex, setCurrentIndex] = useSessionStorage<number>('mindcare_mood_index', 0);
  const [scores, setScores] = useSessionStorage<Record<number, number>>('mindcare_mood_scores', {});
  
  // Local state for UI
  const [viewMode, setViewMode] = useState<'assessment' | 'result'>('assessment');
  const [currentResult, setCurrentResult] = useState<MoodResult | null>(null);
  const [recommendation, setRecommendation] = useState<MoodRecommendation | null>(null);
  const [showFaqList, setShowFaqList] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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
          <div className={`p-4 text-white text-center relative ${
            recommendation.type === 'crisis' ? 'bg-red-600' :
            recommendation.type === 'positive' ? 'bg-green-600' :
            recommendation.type === 'anxiety' ? 'bg-orange-500' :
            'bg-blue-500' // Depression
          }`}>
             {/* Back Arrow */}
             <button 
                onClick={onCancel}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Back to Menu"
             >
                <ArrowLeft size={20} className="text-white" />
             </button>

             <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner mt-4">
                <HeartPulse size={32} className="text-white" />
             </div>
             <h2 className="text-2xl font-bold mb-1">
               {language === 'sw' ? 'Matokeo Yako' : language === 'sheng' ? 'Results Zako' : 'Your Mood Check'}
             </h2>
             <p className="opacity-90 font-medium text-sm bg-white/20 inline-block px-3 py-1 rounded-full capitalize mb-2">
               {recommendation.severity === 'severe' ? 'High Intensity' : 
                recommendation.severity === 'moderate' ? 'Moderate Intensity' :
                recommendation.severity === 'mild' ? 'Mild Intensity' : 'Excellent'}
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
              {language === 'sw' ? 'Mapendekezo Yako' : language === 'sheng' ? 'Form Yako' : 'Recommended Strategies'}
            </h3>

            <div className="space-y-4">
               {recommendation.strategies.map((strategy, idx) => (
                 <div key={idx} className={`border rounded-xl p-5 transition-all shadow-sm ${
                     strategy.category === 'crisis' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:border-primary/50'
                 }`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${
                                strategy.category === 'crisis' ? 'text-red-500' : 'text-gray-400'
                            }`}>
                                {strategy.category}
                            </span>
                            <h4 className={`font-bold text-lg ${strategy.category === 'crisis' ? 'text-red-700' : 'text-gray-900'}`}>
                                {strategy.title[language]}
                            </h4>
                        </div>
                        {strategy.duration > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1.5 rounded-lg whitespace-nowrap">
                                <Clock size={12} /> {strategy.duration}m
                            </span>
                        )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                        {strategy.description[language]}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {strategy.mechanism && (
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                <BrainCircuit size={12} className="text-primary/70" />
                                <span className="truncate max-w-[200px]">{strategy.mechanism}</span>
                            </div>
                        )}
                        {strategy.success_rate && (
                             <div className="flex items-center gap-1.5 text-[10px] text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">
                                <Award size={12} />
                                <span>{strategy.success_rate} Success</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            if (strategy.id === 'crisis_hotline') {
                                window.location.href = 'tel:0722178177';
                            } else {
                                onChatTrigger(strategy.action_context);
                            }
                        }}
                        className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                            strategy.category === 'crisis'
                            ? 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg'
                            : 'bg-primary text-white hover:bg-secondary shadow-md hover:shadow-lg'
                        }`}
                    >
                        {strategy.id === 'crisis_hotline' ? (
                            <><Phone size={18} /> Call Now</>
                        ) : (
                            <>{language === 'sheng' ? 'Jaribu Hii' : 'Try This'} <ChevronRight size={18} /></>
                        )}
                    </button>
                 </div>
               ))}
            </div>
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