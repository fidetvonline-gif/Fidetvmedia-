import React from 'react';

export const FideTvLogo = ({ className = '' }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg" 
    preserveAspectRatio="xMidYMid meet"
  >
    {/* Outer Triangle */}
    <polygon 
      points="8,16 92,16 56,90 44,90" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinejoin="round" 
    />
    
    {/* Outer boundaries of the cube */}
    <polygon 
      points="50,23 71.65,35.5 71.65,60.5 50,73 28.35,60.5 28.35,35.5" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinejoin="round" 
    />
    
    {/* Inner dividing lines */}
    <line x1="50" y1="48" x2="50" y2="23" stroke="currentColor" strokeWidth="4" />
    <line x1="50" y1="48" x2="71.65" y2="60.5" stroke="currentColor" strokeWidth="4" />
    <line x1="50" y1="48" x2="28.35" y2="60.5" stroke="currentColor" strokeWidth="4" />

    {/* Left Face - Filled */}
    <polygon 
      points="50,48 50,23 28.35,35.5 28.35,60.5" 
      fill="currentColor" 
    />
  </svg>
);

export default FideTvLogo;
