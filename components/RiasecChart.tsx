import React from 'react';
import { RIASECCode } from '../types';

interface Props {
  scores: Record<RIASECCode, number>;
}

export const RiasecChart: React.FC<Props> = ({ scores }) => {
  // Adjusted dimensions to maximize chart size while keeping labels visible
  // Size 360 with Radius 105 leaves ~75px margin on sides for labels
  const size = 360; 
  const center = size / 2;
  const radius = 105; 
  const maxScore = 20; 
  const labelOffset = 15; // Reduced gap between polygon and labels

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

  return (
    <div className="flex flex-col items-center justify-center w-full">
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
            fill="rgba(13, 148, 136, 0.2)"
            stroke="#0D9488"
            strokeWidth="2"
            className="drop-shadow-sm transition-all duration-500 ease-out"
          />

          {/* Points & Labels */}
          {axes.map((axis, i) => {
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

            return (
              <g key={axis.code}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3.5"
                  fill="#0D9488"
                  className="transition-all duration-500 ease-out"
                />
                
                {/* Text Label */}
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor={textAnchor}
                  dy={dy}
                  className="text-[10px] sm:text-[11px] font-bold fill-gray-700 uppercase tracking-tight"
                >
                  {axis.fullLabel}
                </text>
                 
                 {/* Score Number */}
                 <text
                  x={point.x}
                  y={point.y - 7}
                  textAnchor="middle"
                  className="text-[9px] fill-primary font-bold"
                  style={{ textShadow: '0px 1px 2px rgba(255,255,255,0.9)' }}
                 >
                     {scores[axis.code]}
                 </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="text-[10px] text-gray-400 mt-1 font-medium text-center">
         Score Range: 0 - 20
      </div>
    </div>
  );
};