import React from 'react';

export const CtcLogo: React.FC<{ className?: string; size?: number; showText?: boolean }> = ({
  className = '',
  size = 40,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Anchor & Compass Rose Insignia */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
      >
        {/* Outer Ring */}
        <circle cx="50" cy="50" r="46" stroke="#0A7AC1" strokeWidth="4" />
        <circle cx="50" cy="50" r="41" stroke="#0B1F4B" strokeWidth="1.5" strokeDasharray="3 2" className="dark:stroke-blue-400" />
        
        {/* Background Medallion */}
        <circle cx="50" cy="50" r="39" fill="#0B1F4B" className="dark:fill-[#0d1c38]" />

        {/* Compass Cardinal Points */}
        <path d="M50 18 L53 38 L50 35 L47 38 Z" fill="#0A7AC1" />
        <path d="M50 82 L53 62 L50 65 L47 62 Z" fill="#0A7AC1" />
        <path d="M18 50 L38 53 L35 50 L38 47 Z" fill="#0A7AC1" />
        <path d="M82 50 L62 53 L65 50 L62 47 Z" fill="#0A7AC1" />

        {/* Traditional Maritime Anchor */}
        {/* Top ring */}
        <circle cx="50" cy="30" r="5" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
        {/* Crossbar */}
        <path d="M41 38 H59" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        {/* Shank */}
        <path d="M50 35 V72" stroke="#FFFFFF" strokeWidth="3.5" />
        {/* Flukes / Curved Arms */}
        <path
          d="M32 58 C34 76 66 76 68 58"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Fluke arrow tips */}
        <polygon points="30,58 35,62 31,66" fill="#FFFFFF" />
        <polygon points="70,58 65,62 69,66" fill="#FFFFFF" />
        {/* Center stock dot */}
        <circle cx="50" cy="50" r="2.5" fill="#0A7AC1" />
      </svg>

      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-[#0B1F4B] dark:text-white">
              CTC
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[#0A7AC1] bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 px-1.5 py-0.5 rounded">
              PANAMA
            </span>
          </div>
          <span className="hidden sm:block text-[11px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight leading-tight mt-0.5 truncate max-w-[180px]">
            Continental Training Center
          </span>
        </div>
      )}
    </div>
  );
};

export const UagLogo: React.FC<{ className?: string; size?: number; showText?: boolean }> = ({
  className = '',
  size = 36,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Shield Crest */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M50 10 L84 22 V54 C84 75 50 92 50 92 C50 92 16 75 16 54 V22 L50 10 Z"
          fill="#0B1F4B"
          stroke="#0A7AC1"
          strokeWidth="3"
        />
        <path
          d="M50 18 L76 28 V52 C76 68 50 82 50 82 C50 82 24 68 24 52 V28 L50 18 Z"
          stroke="#CBD5E1"
          strokeWidth="1.5"
          strokeDasharray="2 2"
          fill="none"
          className="dark:stroke-slate-600"
        />
        {/* Maritime waves in lower shield */}
        <path
          d="M32 64 C38 60 44 68 50 64 C56 60 62 68 68 64"
          stroke="#0A7AC1"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* Monogram UAG */}
        <text
          x="50"
          y="48"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="20"
          fontWeight="800"
          fontFamily="Inter, sans-serif"
          letterSpacing="1"
        >
          UAG
        </text>
      </svg>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-[#0B1F4B] dark:text-slate-200 tracking-tight leading-none">
            United Alliance Group Ltd.
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Maritime Services Division · Panama
          </span>
        </div>
      )}
    </div>
  );
};

export const PanamaOfficialBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 ${className}`}>
      {/* Panama Flag colors ribbon SVG */}
      <svg width="22" height="15" viewBox="0 0 30 20" fill="none" className="rounded-xs shrink-0 shadow-xs">
        <rect width="15" height="10" fill="#FFFFFF" />
        <rect x="15" width="15" height="10" fill="#DA121A" />
        <rect y="10" width="15" height="10" fill="#072357" />
        <rect x="15" y="10" width="15" height="10" fill="#FFFFFF" />
        {/* Blue Star in top-left */}
        <polygon points="7.5,1.5 8.7,4.8 12.2,4.8 9.3,6.8 10.4,10 7.5,8 4.6,10 5.7,6.8 2.8,4.8 6.3,4.8" fill="#072357" transform="scale(0.7) translate(3, 1)" />
        {/* Red Star in bottom-right */}
        <polygon points="7.5,1.5 8.7,4.8 12.2,4.8 9.3,6.8 10.4,10 7.5,8 4.6,10 5.7,6.8 2.8,4.8 6.3,4.8" fill="#DA121A" transform="scale(0.7) translate(24, 15)" />
      </svg>
      <div className="text-[11px] leading-tight text-slate-700 dark:text-slate-300">
        <span className="font-semibold block">Republic of Panama</span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">DGGM Resolution DGGM-CFM-005-2024</span>
      </div>
    </div>
  );
};
