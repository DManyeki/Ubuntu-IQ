import React, { useState, useEffect } from 'react';
import { Phone, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  forceExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export const CrisisBanner: React.FC<Props> = ({ forceExpanded = false, onToggle }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // If forceExpanded changes to true, expand the banner
  useEffect(() => {
    if (forceExpanded) {
      setIsMinimized(false);
    }
  }, [forceExpanded]);

  const toggle = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    if (onToggle) onToggle(!newState);
  };

  return (
    <div className={`bg-kenya-red text-white shadow-lg sticky top-0 z-50 transition-all duration-300 ${isMinimized ? 'p-2' : 'p-3'}`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        
        {/* Left Side: Icon & Text */}
        <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => isMinimized && toggle()}>
          <AlertTriangle className={`h-5 w-5 ${!isMinimized && 'animate-pulse'}`} />
          {isMinimized ? (
            <span className="font-bold text-xs md:text-sm">Emergency Help / Msaada wa Haraka</span>
          ) : (
            <span className="font-bold text-sm md:text-base">In Crisis? Tuko hapa kwa ajili yako (We are here for you).</span>
          )}
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 md:gap-4 pl-2">
          {!isMinimized && (
            <div className="flex flex-col md:flex-row gap-2 text-sm font-bold">
                <a href="tel:0722178177" className="flex items-center gap-1 hover:underline bg-white/20 px-3 py-1 rounded-full whitespace-nowrap">
                <Phone className="h-3 w-3 md:h-4 md:w-4" /> <span className="hidden sm:inline">Befrienders:</span> 0722 178 177
                </a>
                <a href="tel:1199" className="flex items-center gap-1 hover:underline bg-white/20 px-3 py-1 rounded-full whitespace-nowrap">
                <Phone className="h-3 w-3 md:h-4 md:w-4" /> <span className="hidden sm:inline">Red Cross:</span> 1199
                </a>
            </div>
          )}
          
          <button 
            onClick={toggle}
            className="p-1 hover:bg-white/20 rounded-full transition-colors shrink-0"
            aria-label={isMinimized ? "Expand crisis banner" : "Minimize crisis banner"}
          >
            {isMinimized ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};