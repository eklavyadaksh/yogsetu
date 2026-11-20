import React from 'react';

interface AccuracyGaugeProps {
  accuracy: number;
  isCorrect: boolean;
  size?: number;
}

export const AccuracyGauge: React.FC<AccuracyGaugeProps> = ({ accuracy, isCorrect, size = 110 }) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;

  const colorClass = isCorrect
    ? 'text-emerald-500'
    : accuracy > 60
    ? 'text-amber-500'
    : 'text-coral-500';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="text-slate-700/40"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${colorClass} transition-all duration-300 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold font-serif text-white tracking-tight">
          {Math.round(accuracy)}%
        </span>
        <span className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">
          {isCorrect ? 'Holding' : 'Adjusting'}
        </span>
      </div>
    </div>
  );
};
