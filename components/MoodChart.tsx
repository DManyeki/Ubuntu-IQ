import React, { useState } from 'react';
import { MoodResult } from '../types';
import { Info, X } from 'lucide-react';

interface Props {
  result: MoodResult;
}

export const MoodChart: React.FC<Props> = ({ result }) => {
  const [activeInfo, setActiveInfo] = useState<'depression' | 'anxiety' | 'overall' | null>(null);

  const getSeverity = (score: number) => {
    if (score <= 2) return { label: 'Excellent', color: '#22c55e', bg: '#f0fdf4' }; // Green
    if (score <= 3.5) return { label: 'Okay', color: '#eab308', bg: '#fefce8' }; // Yellow
    if (score <= 4.5) return { label: 'Struggling', color: '#f97316', bg: '#fff7ed' }; // Orange
    return { label: 'Crisis', color: '#ef4444', bg: '#fef2f2' }; // Red
  };

  const depression = getSeverity(result.depressionScore);
  const anxiety = getSeverity(result.anxietyScore);
  const overall = getSeverity(result.overallScore);

  // Helper for popup content
  const getContent = (type: 'depression' | 'anxiety' | 'overall') => {
    switch (type) {
        case 'depression':
            return { title: 'Depression Score', desc: 'Measures sadness, hopelessness, and low energy based on your answers.' };
        case 'anxiety':
            return { title: 'Anxiety Score', desc: 'Measures worry, tension, and restlessness based on your answers.' };
        case 'overall':
            return { title: 'Overall Mood', desc: 'An average of your depression and anxiety scores to give a general picture.' };
        default: return { title: '', desc: '' };
    }
  };

  const content = activeInfo ? getContent(activeInfo) : null;

  return (
    <div className="relative w-full bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-6 select-none animate-in fade-in slide-in-from-bottom-2 duration-500">
       
       {/* Popup */}
       {activeInfo && content && (
           <div 
             className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200 border border-gray-200"
             onClick={() => setActiveInfo(null)}
           >
               <button 
                 onClick={() => setActiveInfo(null)}
                 className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full text-gray-400"
               >
                 <X size={18} />
               </button>
               <h4 className="font-bold text-gray-900 text-lg mb-2">{content.title}</h4>
               <p className="text-gray-600 text-sm mb-4 leading-relaxed">{content.desc}</p>
               <div className="text-3xl font-bold" style={{ color: activeInfo === 'depression' ? depression.color : activeInfo === 'anxiety' ? anxiety.color : overall.color }}>
                   {activeInfo === 'depression' ? result.depressionScore.toFixed(1) : activeInfo === 'anxiety' ? result.anxietyScore.toFixed(1) : result.overallScore.toFixed(1)} 
                   <span className="text-sm text-gray-400 font-medium ml-1">/ 6</span>
               </div>
           </div>
       )}

       <div className="flex flex-col gap-6">
          {/* Overall Gauge */}
          <div className="flex items-center justify-between cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => setActiveInfo('overall')}>
              <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                      Overall Mood <Info size={12} />
                  </span>
                  <span className="text-xl font-bold transition-colors" style={{ color: overall.color }}>
                      {overall.label}
                  </span>
              </div>
              <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="#f3f4f6" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="32" cy="32" r="28" 
                        stroke={overall.color} 
                        strokeWidth="6" 
                        fill="transparent" 
                        strokeDasharray={175.9} 
                        strokeDashoffset={175.9 - (175.9 * (result.overallScore / 6))}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                  </svg>
                  <span className="absolute text-sm font-bold text-gray-700">{result.overallScore.toFixed(1)}</span>
              </div>
          </div>

          <div className="h-px bg-gray-100 w-full" />

          {/* Bar Charts */}
          <div className="space-y-5 px-2">
              {/* Depression */}
              <div className="cursor-pointer group" onClick={() => setActiveInfo('depression')}>
                  <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700 flex items-center gap-1">Depression <Info size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400"/></span>
                      <span className="font-bold" style={{ color: depression.color }}>{result.depressionScore.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${(result.depressionScore / 6) * 100}%`, backgroundColor: depression.color }}
                      />
                  </div>
              </div>

              {/* Anxiety */}
              <div className="cursor-pointer group" onClick={() => setActiveInfo('anxiety')}>
                  <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700 flex items-center gap-1">Anxiety <Info size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400"/></span>
                      <span className="font-bold" style={{ color: anxiety.color }}>{result.anxietyScore.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${(result.anxietyScore / 6) * 100}%`, backgroundColor: anxiety.color }}
                      />
                  </div>
              </div>
          </div>
       </div>
    </div>
  );
};