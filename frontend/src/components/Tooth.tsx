import React from 'react';

export type FaceType = 'T' | 'B' | 'L' | 'R' | 'C';

export function getFaceName(number: number, face: FaceType) {
  const isUpper = number >= 11 && number <= 28;
  const isRightSide = (number >= 11 && number <= 18) || (number >= 41 && number <= 48); // Patient's right side (left on screen)
  
  if (face === 'C') return 'Oclusal/Incisal';
  
  if (isUpper) {
    if (face === 'T') return 'Vestibular';
    if (face === 'B') return 'Palatina';
  } else {
    if (face === 'B') return 'Vestibular';
    if (face === 'T') return 'Lingual';
  }

  if (isRightSide) {
    if (face === 'R') return 'Mesial';
    if (face === 'L') return 'Distal';
  } else {
    if (face === 'L') return 'Mesial';
    if (face === 'R') return 'Distal';
  }
  
  return face;
}

export function getToothRegionName(toothId: string) {
  if (!toothId.includes('-')) return `Dente ${toothId} (Geral)`;
  const [num, face] = toothId.split('-');
  return `Dente ${num} - ${getFaceName(parseInt(num), face as FaceType)}`;
}

interface ToothProps {
  number: number;
  faceColors: Record<FaceType, string>;
  selectedFace: FaceType | null;
  onFaceClick: (face: FaceType) => void;
  hasGeneralProcedure?: boolean;
  generalColor?: string;
  isSelected?: boolean; // If the whole tooth is selected for a general procedure
  onToothClick?: () => void;
}

export function Tooth({ 
  number, 
  faceColors, 
  selectedFace, 
  onFaceClick, 
  hasGeneralProcedure, 
  generalColor,
  isSelected,
  onToothClick
}: ToothProps) {
  const isUpper = number >= 11 && number <= 28;
  
  const defaultFill = 'white';
  const defaultStroke = '#cbd5e1';
  const selectedStroke = 'var(--primary-color)';

  const getStroke = (face: FaceType) => selectedFace === face ? selectedStroke : defaultStroke;
  const getStrokeWidth = (face: FaceType) => selectedFace === face ? 2 : 1;

  const isMolar = [16,17,18, 26,27,28, 36,37,38, 46,47,48].includes(number);
  const isPremolar = [14,15, 24,25, 34,35, 44,45].includes(number);
  
  // Simple shapes for roots/crowns
  let rootPathUpper = "M 12 20 C 12 10, 15 0, 20 0 C 25 0, 28 10, 28 20 Z"; // improved root
  if (isMolar) rootPathUpper = "M 10 20 C 10 5, 15 0, 20 15 C 25 0, 30 5, 30 20 Z";
  else if (isPremolar) rootPathUpper = "M 12 20 C 12 5, 17 0, 20 15 C 23 0, 28 5, 28 20 Z";

  let rootPathLower = "M 12 0 C 12 10, 15 20, 20 20 C 25 20, 28 10, 28 0 Z"; // improved root
  if (isMolar) rootPathLower = "M 10 0 C 10 15, 15 20, 20 5 C 25 20, 30 15, 30 0 Z";
  else if (isPremolar) rootPathLower = "M 12 0 C 12 15, 17 20, 20 5 C 23 20, 28 15, 28 0 Z";

  const rootFill = hasGeneralProcedure ? (generalColor || '#3b82f6') : 'white';
  const toothContainerStyle: React.CSSProperties = {
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    gap: '2px',
    padding: '2px',
    borderRadius: '4px',
    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    border: isSelected ? '1px solid var(--primary-color)' : '1px solid transparent',
    transition: 'all 0.2s'
  };

  return (
    <div style={toothContainerStyle}>
      {/* Upper tooth drawing */}
      {isUpper && (
        <svg width="34" height="18" viewBox="0 0 40 20" onClick={onToothClick} style={{ cursor: 'pointer' }}>
          <path d={rootPathUpper} fill={rootFill} stroke={defaultStroke} />
        </svg>
      )}
      
      {/* Number for upper teeth (below root, above faces) */}
      {isUpper && (
        <span 
          style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-main)', margin: '1px 0', cursor: 'pointer' }} 
          onClick={onToothClick}
        >
          {number}
        </span>
      )}

      {/* Faces box */}
      <svg width="34" height="34" viewBox="0 0 40 40" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.05))' }}>
        <polygon 
          points="0,0 40,0 30,10 10,10" 
          fill={faceColors['T'] || defaultFill} 
          stroke={getStroke('T')} 
          strokeWidth={getStrokeWidth('T')}
          onClick={(e) => { e.stopPropagation(); onFaceClick('T'); }}
          style={{ cursor: 'pointer', transition: 'all 0.1s' }}
        />
        <polygon 
          points="40,0 40,40 30,30 30,10" 
          fill={faceColors['R'] || defaultFill} 
          stroke={getStroke('R')} 
          strokeWidth={getStrokeWidth('R')}
          onClick={(e) => { e.stopPropagation(); onFaceClick('R'); }}
          style={{ cursor: 'pointer', transition: 'all 0.1s' }}
        />
        <polygon 
          points="0,40 40,40 30,30 10,30" 
          fill={faceColors['B'] || defaultFill} 
          stroke={getStroke('B')} 
          strokeWidth={getStrokeWidth('B')}
          onClick={(e) => { e.stopPropagation(); onFaceClick('B'); }}
          style={{ cursor: 'pointer', transition: 'all 0.1s' }}
        />
        <polygon 
          points="0,0 0,40 10,30 10,10" 
          fill={faceColors['L'] || defaultFill} 
          stroke={getStroke('L')} 
          strokeWidth={getStrokeWidth('L')}
          onClick={(e) => { e.stopPropagation(); onFaceClick('L'); }}
          style={{ cursor: 'pointer', transition: 'all 0.1s' }}
        />
        <rect 
          x="10" y="10" width="20" height="20" 
          fill={faceColors['C'] || defaultFill} 
          stroke={getStroke('C')} 
          strokeWidth={getStrokeWidth('C')}
          onClick={(e) => { e.stopPropagation(); onFaceClick('C'); }}
          style={{ cursor: 'pointer', transition: 'all 0.1s' }}
        />
      </svg>

      {/* Number for lower teeth (above root, below faces) */}
      {!isUpper && (
        <span 
          style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-main)', margin: '1px 0', cursor: 'pointer' }} 
          onClick={onToothClick}
        >
          {number}
        </span>
      )}

      {/* Lower tooth drawing */}
      {!isUpper && (
        <svg width="34" height="18" viewBox="0 0 40 20" onClick={onToothClick} style={{ cursor: 'pointer' }}>
          <path d={rootPathLower} fill={rootFill} stroke={defaultStroke} />
        </svg>
      )}
    </div>
  );
}
