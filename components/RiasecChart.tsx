import React, { useState, useEffect } from 'react';
import { RIASECCode } from '../types';
import { X, Info } from 'lucide-react';

interface Props {
  scores: Record<RIASECCode, number>;
}

const TRAIT_CONFIG: Record<RIASECCode, { title: string; desc: string; color: string; lightColor: string }> = {
  R: { 
    title: "Realistic (Doers)", 
    desc: "You prefer practical, hands-on activities and working with tools, machines, or nature. You like seeing tangible results.",
    color: "#EA580C", // Orange-600
    lightColor: "#FFF7ED" // Orange-50
  },
  I: { 
    title: "Investigative (Thinkers)", 
    desc: "You enjoy analyzing complex problems, conducting research, and understanding how things work through observation and logic.",
    color: "#2563EB", // Blue-600
    lightColor: "#EFF6FF" // Blue-50
  },
  A: { 
    title: "Artistic (Creators)", 
    desc: "You value self-expression, creativity, and unstructured environments where you can design, perform, or write originally.",
    color: "#9333EA", // Purple-600
    lightColor: "#FAF5FF" // Purple-50
  },
  S: { 
    title: "Social (Helpers)", 
    desc: "You like helping, teaching, and counseling others. You are empathetic, team-oriented, and skilled in interpersonal communication.",
    color: "#DB2777", // Pink-600
    lightColor: "#FDF2F8" // Pink-50
  },
  E: { 
    title: "Enterprising (Persuaders)", 
    desc: "You enjoy leading, persuading others, and taking risks to achieve organizational or economic goals. You are energetic and ambitious.",
    color: "#CA8A04", // Yellow-600 (Darker for text)
    lightColor: "#FEFCE8" // Yellow-50
  },
  C: { 
    title: "Conventional (Organizers)", 
    desc: "You appreciate structure, rules, and organizing data. You are detail-oriented, systematic, and prefer clear expectations.",
    color: "#059669", // Emerald-600
    lightColor: "#ECFDF5" // Emerald-50
  }
};

export const RiasecChart: React.FC<Props> = ({ scores }) => {
  const [activeTrait, setActiveTrait] = useState<RIASECCode | null>(null);

  // Adjusted dimensions to maximize chart size while keeping labels visible
  // Size 360 with Radius 105 leaves ~75px margin on sides for labels
  const size = 360; 
  const center = size / 2;
  const radius = 105; 
  const maxScore = 20; 
  const labelOffset = 18; 

  const axes: { code: RIASECCode; label: string; fullLabel: string }[] = [
    { code: 'R', label: 'R', fullLabel: 'Realistic' },
    { code: 'I', label: 'I', fullLabel: 'Investigative' },
    { code: 'A', label: 'A', fullLabel: 'Artistic' },
    { code: 'S', label: 'S', fullLabel: 'Social' },
    { code: 'E', label: 'E', fullLabel: 'Enterprising' },
    { code: 'C', label: 'C', fullLabel: 'Conventional' },
  ];

  // Helper to calculate coordinates
  const getCoordinates = (r: number, index: number) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const points = axes.map((axis, i) => {
    const r = (scores[axis.code] / maxScore) * radius;
    const { x, y } = getCoordinates(r, i);
    return `${x},${y}`;
  }).join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];

  // Handle global clicks to close popup
  useEffect(() => {
    const handleGlobalClick = () => {
        setActiveTrait(null);
    };
    
    if (activeTrait) {
        // Defer adding listener to avoid immediate trigger from the opening click
        const timer = setTimeout(() => document.addEventListener('click', handleGlobalClick), 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleGlobalClick);
        };
    }
  }, [activeTrait]);

  return (
    <div className="flex flex-col items-center justify-center w-full relative select-none">
      
      {/* Interactive Popup Overlay */}
      {activeTrait && (
          <div 
            className="absolute z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Stop click from reaching document listener
          >
             <div 
                className="p-5 pb-3 relative"
                style={{ backgroundColor: TRAIT_CONFIG[activeTrait].lightColor }}
             >
                <button 
                    onClick={() => setActiveTrait(null)} 
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1 bg-white/50 rounded-full transition-colors"
                    aria-label="Close"
                >
                <X size={16} />
                </button>
                
                <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-white shadow-sm"
                    style={{ backgroundColor: TRAIT_CONFIG[activeTrait].color, color: 'white' }}
                >
                    <span className="font-bold text-lg">{activeTrait}</span>
                </div>
                
                <h4 className="font-bold text-lg text-gray-800 mb-1 leading-tight">
                {TRAIT_CONFIG[activeTrait].title}
                </h4>
                
                <div 
                    className="text-2xl font-bold mb-0 flex justify-center items-baseline gap-1"
                    style={{ color: TRAIT_CONFIG[activeTrait].color }}
                >
                    {scores[activeTrait]} <span className="text-xs text-gray-400 font-normal">/ 20</span>
                </div>
             </div>
             
             <div className="p-5 pt-3 bg-white">
                <p className="text-sm text-gray-600 leading-relaxed">
                {TRAIT_CONFIG[activeTrait].desc}
                </p>
             </div>
          </div>
      )}

      <div className="relative w-full max-w-[360px] aspect-square">
        <svg 
            viewBox={`0 0 ${size} ${size}`} 
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid Lines */}
          {gridLevels.map((level, i) => (
            <polygon
              key={i}
              points={axes.map((_, j) => {
                const { x, y } = getCoordinates(radius * level, j);
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray={i === gridLevels.length - 1 ? "0" : "4 2"}
            />
          ))}

          {/* Axes Lines */}
          {axes.map((_, i) => {
            const { x, y } = getCoordinates(radius, i);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}

          {/* Data Polygon */}
          <polygon
            points={points}
            fill="rgba(13, 148, 136, 0.15)" // Keep base fill neutral-teal but light
            stroke="#0D9488"
            strokeWidth="1.5"
            strokeOpacity="0.5"
            className="drop-shadow-sm transition-all duration-500 ease-out"
          />

          {/* Points & Labels */}
          {axes.map((axis, i) => {
            const config = TRAIT_CONFIG[axis.code];
            const scoreR = (scores[axis.code] / maxScore) * radius;
            const point = getCoordinates(scoreR, i);
            const labelPos = getCoordinates(radius + labelOffset, i);
            
            let textAnchor: "middle" | "start" | "end" = "middle";
            let dy = "0.3em";
            
            // Adjustments for specific positions to fit tight bounding box
            if (i === 0) dy = "-0.2em"; // Top
            if (i === 3) dy = "0.8em"; // Bottom
            
            if (i === 1 || i === 2) { // Right side
                textAnchor = "start"; 
                labelPos.x -= 3;
            } 
            if (i === 4 || i === 5) { // Left side
                textAnchor = "end";
                labelPos.x += 3;
            }

            const isActive = activeTrait === axis.code;

            return (
              <g 
                key={axis.code} 
                className="cursor-pointer group"
                onClick={(e) => {
                    e.stopPropagation(); // Stop propagation to prevent immediate close
                    setActiveTrait(axis.code);
                }}
              >
                {/* Invisible larger hit area for easier clicking */}
                <circle cx={point.x} cy={point.y} r="20" fill="transparent" />
                <circle cx={labelPos.x} cy={labelPos.y} r="25" fill="transparent" />

                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive ? "6" : "4"}
                  fill={config.color}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all duration-300 ease-out shadow-sm"
                />
                
                {/* Text Label */}
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor={textAnchor}
                  dy={dy}
                  fill={isActive ? config.color : "#374151"}
                  className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-tight transition-all duration-200 ${isActive ? 'scale-105' : 'group-hover:opacity-80'}`}
                >
                  {axis.fullLabel}
                </text>
                 
                 {/* Score Number */}
                 <text
                  x={point.x}
                  y={point.y - (isActive ? 10 : 8)}
                  textAnchor="middle"
                  fill={config.color}
                  className={`text-[9px] font-bold transition-all duration-200 ${isActive ? 'text-[11px]' : ''}`}
                  style={{ textShadow: '0px 1px 2px rgba(255,255,255,0.9)' }}
                 >
                     {scores[axis.code]}
                 </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="text-[10px] text-gray-400 mt-1 font-medium text-center flex items-center justify-center gap-1">
         <Info size={10} /> Tap on colored points for details
      </div>
    </div>
  );
};
