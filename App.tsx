import React, { useState, useEffect } from 'react';
import { CrisisBanner } from './components/CrisisBanner';
import { ChatInterface } from './components/ChatInterface';
import { Assessment } from './components/Assessment';
import { RiasecChart } from './components/RiasecChart';
import { Language, AssessmentResult, Career } from './types';
import { getCareerMatches } from './services/careerData';
import { MessageCircle, BookOpen, Globe, ArrowLeft, HeartPulse, GraduationCap, ExternalLink, X, Share2, Check } from 'lucide-react';

const App: React.FC = () => {
  // Session Storage Helpers
  const getStorage = <T,>(key: string, initialValue: T): T => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse session storage', e);
    }
    return initialValue;
  };

  const [language, setLanguage] = useState<Language>(() => getStorage('mindcare_language', 'en'));
  const [view, setView] = useState<'chat' | 'assessment' | 'results'>(() => getStorage('mindcare_view', 'chat'));
  const [results, setResults] = useState<{ result: AssessmentResult; careers: Career[] } | null>(() => getStorage('mindcare_results', null));
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showShareToast, setShowShareToast] = useState(false);

  // Persist State Changes
  useEffect(() => {
    sessionStorage.setItem('mindcare_language', JSON.stringify(language));
  }, [language]);

  useEffect(() => {
    sessionStorage.setItem('mindcare_view', JSON.stringify(view));
  }, [view]);

  useEffect(() => {
    sessionStorage.setItem('mindcare_results', JSON.stringify(results));
  }, [results]);

  const handleAssessmentComplete = (result: AssessmentResult) => {
    const matches = getCareerMatches(result.topCodes);
    setResults({ result, careers: matches });
    
    // Clear assessment progress from storage now that it's complete
    sessionStorage.removeItem('mindcare_assessment_started');
    sessionStorage.removeItem('mindcare_assessment_index');
    sessionStorage.removeItem('mindcare_assessment_answers');
    
    setView('results');
  };

  const startChatWithContext = (message: string) => {
    setTriggerMessage(message);
    setView('chat');
    window.scrollTo(0, 0);
  };

  const handleShareResults = async () => {
    if (!results) return;

    const code = results.result.topCodes.join('');
    const traits = results.result.topCodes.map(c => 
        c === 'R' ? 'Realistic' : 
        c === 'I' ? 'Investigative' : 
        c === 'A' ? 'Artistic' : 
        c === 'S' ? 'Social' : 
        c === 'E' ? 'Enterprising' : 'Conventional'
    ).join(', ');

    const shareText = `🇰🇪 My MindCare Profile: ${code}\n\nI am a mix of ${traits} traits.\n\nDiscover your career path and mental wellness tips on MindCare Kenya!`;
    const shareUrl = window.location.href;
    const fullText = `${shareText}\n${shareUrl}`;

    // Helper for legacy copy (must run synchronously within click handler)
    const legacyCopy = () => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = fullText;
            
            // Ensure it's not visible but part of DOM and interactable
            textArea.style.position = "fixed";
            textArea.style.left = "0";
            textArea.style.top = "0";
            textArea.style.opacity = "0";
            textArea.contentEditable = "true";
            textArea.readOnly = false; 
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, 999999); // For mobile devices

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (err) {
            console.warn('Legacy copy failed', err);
            return false;
        }
    };

    // Strategy:
    // 1. If Native Share exists (Mobile), try it.
    // 2. If Native Share missing (Desktop), try Legacy Copy (Sync).
    // 3. If Legacy Copy fails, try Async Clipboard API.
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'MindCare Kenya Results',
                text: shareText,
                url: shareUrl,
            });
        } catch (error: any) {
            if (error.name === 'AbortError') return; // User cancelled
            
            // If share failed (e.g., desktop implementation error), fall back to async clipboard
            try {
                await navigator.clipboard.writeText(fullText);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 3000);
            } catch (err) {
                console.error('Clipboard failed after share error', err);
            }
        }
    } else {
        // Synchronous Fallback (Preferred for Desktop/Non-Share browsers)
        const copied = legacyCopy();
        
        if (copied) {
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 3000);
        } else {
            // If legacy failed, try modern async API as last resort
            try {
                await navigator.clipboard.writeText(fullText);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 3000);
            } catch (err) {
                console.error('All copy methods failed', err);
                alert('Could not auto-copy results. Please capture a screenshot instead.');
            }
        }
    };
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative bg-gray-50">
      
      {/* Sticky Header Group */}
      <div className="sticky top-0 z-50 w-full shadow-sm">
        <CrisisBanner />
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary cursor-pointer" onClick={() => setView('chat')}>
              <HeartPulse className="h-6 w-6" />
              <h1 className="font-bold text-xl tracking-tight">MindCare<span className="text-kenya-red">.ke</span></h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="sw">Kiswahili</option>
                <option value="sheng">Sheng</option>
              </select>
            </div>
          </div>
        </header>
      </div>

      {/* Toast Notification */}
      {showShareToast && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[60] bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 border border-gray-700">
              <Check size={18} className="text-green-400" />
              <span className="font-medium text-sm">Results copied to clipboard!</span>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-6 w-full max-w-4xl mx-auto">
          
          {/* Navigation Tabs (Only visible on main views) */}
          {view !== 'assessment' && view !== 'results' && (
             <div className="flex gap-3 md:gap-4 mb-4 md:mb-6">
                <button 
                  onClick={() => setView('chat')}
                  className={`flex-1 py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all shadow-sm text-sm md:text-base ${
                    view === 'chat' 
                    ? 'bg-white text-primary ring-2 ring-primary/10' 
                    : 'bg-white/60 text-gray-500 hover:bg-white'
                  }`}
                >
                  <MessageCircle className="w-5 h-5" />
                  {language === 'sheng' ? 'Bonga Nami' : language === 'sw' ? 'Ongea Nami' : 'Chat'}
                </button>
                <button 
                  onClick={() => setView('assessment')}
                  className="flex-1 py-3 md:py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all text-sm md:text-base"
                >
                  <BookOpen className="w-5 h-5" />
                  {language === 'sheng' ? 'Check Career' : language === 'sw' ? 'Tathmini Kazi' : 'Career Test'}
                </button>
             </div>
          )}

          {/* Chat View - Persistent but hidden when inactive to keep state */}
          <div className={view === 'chat' ? 'block' : 'hidden'}>
              {showDisclaimer && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 flex justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                  <p className="leading-relaxed text-xs md:text-sm">
                    <strong>Note:</strong> MindCare is an AI assistant. While we are here to support you, we are not a replacement for professional medical advice.
                  </p>
                  <button 
                      onClick={() => setShowDisclaimer(false)} 
                      className="text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full p-1 transition-colors h-fit shrink-0"
                      title="Dismiss"
                  >
                      <X size={16} />
                  </button>
                </div>
              )}
              <ChatInterface 
                language={language} 
                triggerMessage={triggerMessage}
                onTriggerHandled={() => setTriggerMessage(null)}
              />
          </div>

          {view === 'assessment' && (
            <Assessment 
              language={language} 
              onComplete={handleAssessmentComplete}
              onCancel={() => setView('chat')}
              previousResults={results ? results.result : null}
              onViewResults={() => setView('results')}
            />
          )}

          {view === 'results' && results && (
            <div className="space-y-6 animate-in fade-in duration-500 pb-10">
               <div className="flex justify-between items-center mb-2">
                   <button onClick={() => setView('chat')} className="flex items-center gap-1 text-gray-500 hover:text-primary font-medium p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
                     <ArrowLeft size={16} /> Back to Home
                   </button>
               </div>
               
               {/* Result Summary Card */}
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                 <div className="p-6 md:p-8">
                   <div className="flex flex-col md:flex-row gap-8 items-center">
                      
                      {/* Text Content */}
                      <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                              <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                                  Your Profile: <span className="text-primary">{results.result.topCodes.join('')}</span>
                                </h2>
                                <p className="text-gray-600 mt-2 leading-relaxed">
                                    You are a mix of <strong>{results.result.topCodes.map(c => 
                                      c === 'R' ? 'Realistic' : 
                                      c === 'I' ? 'Investigative' : 
                                      c === 'A' ? 'Artistic' : 
                                      c === 'S' ? 'Social' : 
                                      c === 'E' ? 'Enterprising' : 'Conventional'
                                    ).join(', ')}</strong> traits.
                                </p>
                              </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button 
                                onClick={() => startChatWithContext(`I just completed the assessment and got the RIASEC code ${results.result.topCodes.join('')}. Can you explain what this means for me and my future in Kenya?`)}
                                className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-secondary transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <MessageCircle size={18} />
                                Chat about results
                            </button>
                            
                            <button 
                                onClick={handleShareResults}
                                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm active:bg-gray-100"
                            >
                                <Share2 size={18} />
                                Share
                            </button>
                          </div>
                      </div>

                      {/* Chart Visualization */}
                      <div className="w-full md:w-auto flex justify-center bg-transparent md:bg-gray-50 rounded-2xl md:p-4 md:border border-gray-100">
                          <RiasecChart scores={results.result.scores} />
                      </div>
                   </div>
                 </div>
               </div>

               <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4 px-2">Recommended Careers in Kenya</h3>
               <div className="grid md:grid-cols-2 gap-4">
                  {results.careers.map(career => (
                    <div key={career.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/50 transition-colors flex flex-col h-full group">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">{career.title}</h4>
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold">{career.primary_code}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 flex-grow leading-relaxed">{career.description}</p>
                      
                      <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
                        <div className="flex items-start gap-2">
                          <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-gray-700 font-medium">{career.education_required}</span>
                        </div>
                        <div className="bg-green-50 text-green-800 p-2 rounded text-xs font-medium border border-green-100">
                          <strong>Outlook:</strong> {career.job_outlook}
                        </div>
                        
                        {/* Resources Links */}
                        {career.resources && career.resources.length > 0 && (
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">Helpful Links:</p>
                                <div className="flex flex-wrap gap-2">
                                    {career.resources.map((res, idx) => (
                                        <a 
                                            key={idx}
                                            href={res.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-white hover:bg-primary border border-primary/20 bg-primary/5 px-2 py-1 rounded transition-colors"
                                        >
                                            {res.name} <ExternalLink size={10} />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={() => startChatWithContext(`I'm interested in becoming a ${career.title}. Can you tell me more about the steps to take in Kenya, specifically regarding ${career.education_required}?`)}
                            className="w-full mt-2 py-2.5 border border-primary/30 text-primary rounded-lg text-sm font-semibold hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <MessageCircle size={16} />
                            Ask details
                        </button>
                      </div>
                    </div>
                  ))}
               </div>

               <div className="bg-gradient-to-br from-teal-50 to-white p-6 rounded-xl border border-teal-100 mt-8 shadow-sm">
                 <div className="flex gap-4">
                    <div className="bg-teal-100 p-3 rounded-full h-fit text-teal-600 hidden md:block">
                        <GraduationCap size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-teal-900 mb-2 text-lg">Consider TVET Pathways</h3>
                        <p className="text-teal-800 text-sm mb-4 leading-relaxed max-w-2xl">
                        Technical and Vocational Education and Training (TVET) offers practical skills that are in high demand in Kenya's job market. 
                        Courses like Plumbing, Electrical Engineering, and ICT often lead to faster employment and self-employment opportunities compared to some university degrees.
                        </p>
                        <button 
                            onClick={() => startChatWithContext("Tell me more about TVET options in Kenya. How are they different from University and what are the benefits?")} 
                            className="text-white bg-teal-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm w-fit"
                        >
                            Chat about TVET options <ArrowLeft className="rotate-180 w-4 h-4" />
                        </button>
                    </div>
                 </div>
               </div>
            </div>
          )}

      </main>
    </div>
  );
};

export default App;