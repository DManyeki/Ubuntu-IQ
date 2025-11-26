import React, { useState, useEffect } from 'react';
import { QUESTIONS, calculateResults } from '../services/careerData';
import { Language, AssessmentResult } from '../types';
import { ChevronRight, ChevronLeft, CheckCircle2, ArrowLeft, ChevronDown, ChevronUp, HelpCircle, Info, Play, Lightbulb, BarChart2 } from 'lucide-react';
import { useSessionStorage } from '../hooks/useSessionStorage';

interface Props {
  language: Language;
  onComplete: (result: AssessmentResult) => void;
  onCancel: () => void;
  previousResults?: AssessmentResult | null;
  onViewResults?: () => void;
}

const FAQs = [
  {
    q: { en: "What is the RIASEC test?", sw: "Mtihani wa RIASEC ni nini?", sheng: "RIASEC test ni nini?" },
    a: { 
      en: "It matches your personality to careers you'll enjoy. RIASEC stands for 6 types: Realistic, Investigative, Artistic, Social, Enterprising, and Conventional.",
      sw: "Hulinganisha utu wako na kazi utakazofurahia. RIASEC inasimama kwa aina 6 za utu.",
      sheng: "Inacheki tabia zako na kuzimatch na jobs utapenda. RIASEC ni types 6 za personalities."
    }
  },
  {
    q: { en: "How long does it take?", sw: "Inachukua muda gani?", sheng: "Inachukua time gani?" },
    a: {
      en: "About 5 minutes. There are 24 simple questions about what you like to do.",
      sw: "Takriban dakika 5. Kuna maswali 24 rahisi kuhusu mambo unayopenda kufanya.",
      sheng: "Ka dakika 5 hivi. Kuna maswali 24 simple kuhusu vitu unapenda."
    }
  },
  {
    q: { en: "Is this a final decision?", sw: "Je, huu ni uamuzi wa mwisho?", sheng: "Hii ni final decision?" },
    a: {
      en: "No, this is a guide to help you explore. You choose your own path based on your KCSE results and passion.",
      sw: "Hapana, huu ni mwongozo tu. Unachagua njia yako kulingana na matokeo yako na mapenzi yako.",
      sheng: "Zii, hii ni guide tu. Wewe ndio utadecide kulingana na results zako na vile unajiskia."
    }
  },
  {
    q: { en: "Can I have multiple career interests?", sw: "Je, ninaweza kuwa na maslahi mbalimbali ya kazi?", sheng: "Naweza kuwa na interests kibao za job?" },
    a: {
      en: "Yes! Most people are a mix. You might be an Engineer (Realistic) who also writes poetry (Artistic). The test shows your top 3 strengths.",
      sw: "Ndio! Watu wengi wana mchanganyiko. Unaweza kuwa Mhandisi ambaye pia anaandika mashairi. Mtihani unaonyesha nguvu zako 3 kuu.",
      sheng: "Ee bana! Wasee wengi wako mix. Unaweza kuwa Engineer na bado unaandika ngoma. Test inaonyesha strengths zako 3 top."
    }
  },
  {
    q: { en: "What if my parents want a different course?", sw: "Je, ikiwa wazazi wangu wanataka kozi tofauti?", sheng: "Nifanye aje kama wazazi wanataka course ingine?" },
    a: {
      en: "This is common. Use these results to show them your natural strengths. We can also help you chat about how to talk to them respectfully.",
      sw: "Hii ni kawaida. Tumia matokeo haya kuwaonyesha uwezo wako wa asili. Tunaweza pia kukusaidia jinsi ya kuongea nao kwa heshima.",
      sheng: "Hio ni kawaida. Tumia hii results kuwashow penye uko fiti. Tunaweza pia kukushow vile utabonga nao kwa heshima."
    }
  },
  {
    q: { en: "Are TVET/Diploma courses good?", sw: "Je, kozi za TVET/Diploma ni nzuri?", sheng: "Kozi za TVET na Diploma ni fiti?" },
    a: {
      en: "Absolutely. Employers value skills. Diplomas often lead to self-employment and faster jobs than some degrees.",
      sw: "Kabisa. Waajiri wanathamini ujuzi. Diploma mara nyingi huongoza kwa kujiajiri na kazi za haraka kuliko baadhi ya digrii.",
      sheng: "Sana! Maboss wanataka skills. Diploma inakupea ujuzi wa kujiajiri na kupata job haraka kuliko degree zingine."
    }
  },
  {
    q: { en: "What if I get equal scores in everything?", sw: "Je, nikipata alama sawa katika kila kitu?", sheng: "Nifanye aje nikipata marks sawa kwa zote?" },
    a: {
      en: "It means you are well-rounded! You can fit in many careers. Look at your hobbies to see which one you enjoy most.",
      sw: "Inamaanisha una uwezo mwingi! Unaweza kufaa katika kazi nyingi. Angalia vitu unavyopenda kufanya ili kuona ni ipi unaifurahia zaidi.",
      sheng: "Inamaanisha wewe ni all-rounder! Unaweza fanya jobs mingi. Angalia hobbies zako uone ni gani inakubamba zaidi."
    }
  },
  {
    q: { en: "How accurate is this test?", sw: "Je, mtihani huu ni sahihi kiasi gani?", sheng: "Hii test ni ukweli kiasi gani?" },
    a: {
      en: "It is based on scientific research used globally. However, only you know yourself best. Use it as a compass, not a map.",
      sw: "Inategemea utafiti wa kisayansi unaotumika duniani kote. Hata hivyo, wewe ndiye unayejijua vyema zaidi. Itumie kama dira, sio ramani.",
      sheng: "Inatumia science inatumika dunia mzima. Lakini wewe ndio unajijua best. Itumie kama guide."
    }
  },
  {
    q: { en: "I feel anxious about my results. Is that normal?", sw: "Nina wasiwasi kuhusu matokeo yangu. Je, ni kawaida?", sheng: "Niko na wasiwasi kuhusu results. Ni kawaida?" },
    a: {
      en: "Very normal. The waiting period is tough. Try our breathing exercises in the chat or talk to someone you trust.",
      sw: "Ni kawaida sana. Kipindi cha kusubiri ni kigumu. Jaribu mazoezi yetu ya kupumua kwenye gumzo au ongea na mtu unayemwamini.",
      sheng: "Ni kawaida sana. Hii time ya kuwait ni ngumu. Jaribu breathing exercises zetu kwa chat ama bonga na msee unaringa."
    }
  },
  {
    q: { en: "Is my data private?", sw: "Je, data yangu ni ya siri?", sheng: "Data yangu iko safe?" },
    a: {
      en: "Yes. Your answers stay in your browser session. We do not store your personal details permanently.",
      sw: "Ndio. Majibu yako yanabaki kwenye kivinjari chako. Hatuhifadhi maelezo yako ya kibinafsi kabisa.",
      sheng: "Ee. Majibu yako yanabaki kwa simu yako. Hatuweki details zako permanently."
    }
  }
];

export const Assessment: React.FC<Props> = ({ language, onComplete, onCancel, previousResults, onViewResults }) => {
  const [hasStarted, setHasStarted] = useSessionStorage<boolean>('mindcare_assessment_started', false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useSessionStorage<number>('mindcare_assessment_index', 0);
  const [answers, setAnswers] = useSessionStorage<Record<number, number>>('mindcare_assessment_answers', {});
  
  const [showFaqList, setShowFaqList] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Reset guide when question changes
  useEffect(() => {
    setShowGuide(false);
  }, [currentQuestionIndex]);

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Auto-advance to next question if not the last one
    if (currentQuestionIndex < QUESTIONS.length - 1) {
        setTimeout(() => {
            setCurrentQuestionIndex(prev => prev + 1);
        }, 250);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < QUESTIONS.length) return; 

    const result = calculateResults(answers);
    onComplete(result);
  };

  // Render Welcome Screen
  if (!hasStarted) {
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
               {language === 'sw' ? 'Karibu kwenye Tathmini' : language === 'sheng' ? 'Karibu kwa Assessment' : 'Welcome to Assessment'}
             </h2>
          </div>

          <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 mb-6 text-center">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-primary">
                <HelpCircle size={32} />
             </div>
             <h3 className="text-lg font-bold text-primary mb-2">
               {language === 'sw' ? 'Gundua Njia Yako' : language === 'sheng' ? 'Cheki Njia Yako' : 'Discover Your Path'}
             </h3>
             <p className="text-gray-600 leading-relaxed">
               {language === 'sw' 
                 ? 'Jibu maswali machache kuhusu unachopenda, na tutakusaidia kupata kazi zinazokufaa.' 
                 : language === 'sheng' 
                 ? 'Jibu maswali kiasi kuhusu vitu unapenda, na tutakuonyesha jobs zinakufaa.' 
                 : 'Answer a few questions about what you like, and we will help you match with careers that fit your personality.'}
             </p>
          </div>

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
                    {FAQs.map((faq, index) => (
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
              onClick={() => setHasStarted(true)}
              className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-secondary shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {language === 'sw' ? 'Anza Tathmini' : language === 'sheng' ? 'Anza Test' : 'Start New Assessment'}
              <Play size={20} fill="currentColor" />
            </button>

            {previousResults && onViewResults && (
                <button 
                  onClick={onViewResults}
                  className="w-full py-3 bg-white text-primary border-2 border-primary/20 rounded-xl font-bold text-base hover:bg-primary/5 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <BarChart2 size={20} />
                  {language === 'sw' ? 'Angalia Matokeo Yaliyopita' : language === 'sheng' ? 'Cheki Results Za Kitambo' : 'View Previous Results'}
                </button>
            )}
        </div>
      </div>
    );
  }

  // Question Slider Render
  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const totalQuestions = QUESTIONS.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const currentAnswer = answers[currentQuestion.id];
  const allAnswered = Object.keys(answers).length === totalQuestions;

  return (
    <div className="max-w-2xl mx-auto p-4 min-h-[500px] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header card with Back button */}
      <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <button 
                    onClick={() => {
                        if (currentQuestionIndex === 0) setHasStarted(false);
                        else handlePrevious();
                    }}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    aria-label="Back"
                >
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-bold text-primary">
                {language === 'sw' ? 'Tathmini' : language === 'sheng' ? 'Check' : 'Assessment'}
                </h2>
            </div>
             <div className="text-xs font-medium bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                {currentQuestionIndex + 1} / {totalQuestions}
            </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col">
          <div key={currentQuestion.id} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-right-8 duration-300">
            <h3 className="text-xl md:text-2xl font-medium text-gray-800 mb-6 leading-relaxed text-center">
                {currentQuestion.text[language]}
            </h3>
            
            {/* Brief Guide Hint */}
            <div className="mb-8">
               <button 
                 onClick={() => setShowGuide(!showGuide)}
                 className="flex items-center gap-1.5 mx-auto text-sm text-primary font-medium hover:text-secondary hover:underline transition-all"
               >
                  <Lightbulb size={16} className={showGuide ? "fill-primary" : ""} />
                  {language === 'sw' ? 'Unahitaji msaada kuelewa?' : language === 'sheng' ? 'Unataka hint?' : 'Need help understanding?'}
                  {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
               </button>
               
               {showGuide && (
                 <div className="mt-3 bg-primary/5 border border-primary/10 rounded-xl p-4 text-center animate-in fade-in zoom-in-95 duration-200">
                    <p className="text-gray-700 text-sm leading-relaxed">
                       {currentQuestion.guide[language]}
                    </p>
                 </div>
               )}
            </div>
            
            <div className="grid grid-cols-5 gap-2 sm:gap-4 mb-8">
               {[1, 2, 3, 4, 5].map((val) => (
                 <button
                    key={val}
                    onClick={() => handleAnswer(currentQuestion.id, val)}
                    className={`flex flex-col items-center justify-center py-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                      currentAnswer === val 
                      ? 'bg-primary text-white shadow-lg scale-105 ring-4 ring-primary/20' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105 hover:shadow-md'
                    }`}
                 >
                    <span className="text-2xl mb-2">{val}</span>
                    <span className="text-[10px] uppercase opacity-80 hidden sm:block font-bold tracking-wider">
                        {val === 1 ? (language === 'sheng' ? 'Zii' : 'Disagree') : 
                         val === 5 ? (language === 'sheng' ? 'Kabisa' : 'Agree') : 
                         '-'}
                    </span>
                 </button>
               ))}
            </div>
             <div className="flex justify-between px-2 text-xs text-gray-400 font-medium uppercase tracking-wide">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
            </div>
          </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 && !hasStarted}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
            currentQuestionIndex === 0 
            ? 'text-gray-400 cursor-pointer' // Allow going back to intro
            : 'text-gray-600 hover:bg-gray-100 hover:text-primary'
          }`}
          onClickCapture={(e) => {
              // Override default disabled behavior for first question to go back to intro
              if(currentQuestionIndex === 0) {
                  e.stopPropagation();
                  setHasStarted(false);
              }
          }}
        >
          <ChevronLeft size={20} />
          Back
        </button>

        {isLastQuestion ? (
             <button
              onClick={handleFinish}
              disabled={!allAnswered}
              className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all ${
                allAnswered 
                ? 'bg-primary text-white hover:bg-secondary hover:shadow-xl hover:-translate-y-1' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {language === 'sheng' ? 'Nimalize' : language === 'sw' ? 'Kamilisha' : 'Finish'} 
              <CheckCircle2 size={20} />
            </button>
        ) : (
             <button
              onClick={handleNext}
              disabled={!currentAnswer}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
                 !currentAnswer 
                 ? 'text-gray-300 cursor-not-allowed' 
                 : 'bg-gray-900 text-white hover:bg-black shadow-md'
              }`}
            >
              Next
              <ChevronRight size={20} />
            </button>
        )}
      </div>
    </div>
  );
};