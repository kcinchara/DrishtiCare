import React from 'react';

export interface DrishtiCareLogoProps {
  className?: string;
  size?: number | string;
  /**
   * 'color': Full gradient cyan/teal/blue wings with dark fundus core (for light or dark backgrounds)
   * 'white': Crisp white wings (ideal inside gradient buttons/containers)
   * 'standalone': Includes stylized brand name and badge
   */
  variant?: 'color' | 'white' | 'standalone';
  showSubtitle?: boolean;
}

export const DrishtiCareLogo: React.FC<DrishtiCareLogoProps> = ({
  className = '',
  size = 36,
  variant = 'color',
  showSubtitle = false,
}) => {
  const isWhite = variant === 'white';

  const svgContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${className}`}
      aria-label="DrishtiCare Logo"
    >
      <defs>
        {/* Healthcare AI Teal-Cyan-Blue Gradient */}
        <linearGradient id="dc-wing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="45%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>

        {/* Retinal Fundus Core Gradient */}
        <linearGradient id="dc-fundus-core" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        <filter id="dc-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ======================================================== */}
      {/* 1. Dynamic Ocular Swirl Contour: Upper Wing              */}
      {/* ======================================================== */}
      <path
        d="M 18,100 
           C 40,40 70,24 100,24 
           C 134,24 165,44 182,100 
           C 160,60 130,44 100,44 
           C 74,44 54,58 44,76 
           C 58,62 80,54 106,54 
           C 132,54 146,68 141,86 
           C 135,66 116,48 90,48 
           C 60,48 34,70 18,100 Z"
        fill={isWhite ? '#ffffff' : 'url(#dc-wing-grad)'}
      />

      {/* ======================================================== */}
      {/* 2. Dynamic Ocular Swirl Contour: Lower Wing (180 deg)    */}
      {/* ======================================================== */}
      <g transform="rotate(180 100 100)">
        <path
          d="M 18,100 
             C 40,40 70,24 100,24 
             C 134,24 165,44 182,100 
             C 160,60 130,44 100,44 
             C 74,44 54,58 44,76 
             C 58,62 80,54 106,54 
             C 132,54 146,68 141,86 
             C 135,66 116,48 90,48 
             C 60,48 34,70 18,100 Z"
          fill={isWhite ? '#ffffff' : 'url(#dc-wing-grad)'}
        />
      </g>

      {/* ======================================================== */}
      {/* 3. Central Retinal Fundus & Optical Disc Field           */}
      {/* ======================================================== */}
      <circle
        cx="100"
        cy="100"
        r="35"
        fill="url(#dc-fundus-core)"
        stroke={isWhite ? '#38bdf8' : '#0284c7'}
        strokeWidth="0.8"
        strokeOpacity="0.4"
      />

      {/* Optic Disc / Clinical Focal Highlight */}
      <circle
        cx="85"
        cy="83"
        r="8.5"
        fill="#ffffff"
        filter={isWhite ? undefined : 'url(#dc-glow)'}
      />

      {/* ======================================================== */}
      {/* 4. AI Neural Network / Microvascular Interconnections    */}
      {/* ======================================================== */}
      <g stroke="#cbd5e1" strokeWidth="1.3" opacity="0.95">
        <line x1="72" y1="100" x2="85" y2="83" />
        <line x1="85" y1="83" x2="103" y2="76" />
        <line x1="103" y1="76" x2="120" y2="90" />
        <line x1="72" y1="100" x2="101" y2="98" />
        <line x1="101" y1="98" x2="120" y2="90" />
        <line x1="120" y1="90" x2="129" y2="103" />
        <line x1="72" y1="100" x2="84" y2="118" />
        <line x1="84" y1="118" x2="108" y2="115" />
        <line x1="101" y1="98" x2="108" y2="115" />
        <line x1="108" y1="115" x2="129" y2="103" />
        {/* Fine peripheral vascular branches */}
        <line x1="72" y1="100" x2="67" y2="100" />
        <line x1="84" y1="118" x2="74" y2="124" />
        <line x1="108" y1="115" x2="111" y2="133" />
        <line x1="103" y1="76" x2="104" y2="67" />
        <line x1="120" y1="90" x2="132" y2="84" />
        <line x1="129" y1="103" x2="133" y2="106" />
      </g>

      {/* ======================================================== */}
      {/* 5. Neural Synaptic AI Nodes                              */}
      {/* ======================================================== */}
      <g fill="#ffffff">
        <circle cx="72" cy="100" r="3.2" />
        <circle cx="103" cy="76" r="2.8" />
        <circle cx="120" cy="90" r="3.2" />
        <circle cx="101" cy="98" r="3.0" />
        <circle cx="108" cy="115" r="3.0" />
        <circle cx="129" cy="103" r="2.6" />
        <circle cx="84" cy="118" r="2.8" />
        {/* Subtle peripheral vascular anchors */}
        <circle cx="67" cy="100" r="1.6" opacity="0.85" />
        <circle cx="74" cy="124" r="1.6" opacity="0.85" />
        <circle cx="111" cy="133" r="1.6" opacity="0.85" />
        <circle cx="104" cy="67" r="1.6" opacity="0.85" />
        <circle cx="132" cy="84" r="1.6" opacity="0.85" />
        <circle cx="133" cy="106" r="1.6" opacity="0.85" />
      </g>
    </svg>
  );

  if (variant !== 'standalone') {
    return svgContent;
  }

  return (
    <div className="flex items-center gap-3">
      {svgContent}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
            DrishtiCare
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
            Clinical Edition
          </span>
        </div>
        {showSubtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Explainable AI-Assisted Diabetic Retinopathy Screening for Rural Healthcare
          </p>
        )}
      </div>
    </div>
  );
};

export default DrishtiCareLogo;
