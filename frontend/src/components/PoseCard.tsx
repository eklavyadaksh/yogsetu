import React from 'react';
import { Camera, Clock, Repeat, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PoseCardProps {
  id: string;
  /** Primary display name (language-resolved by parent) */
  primaryName: string;
  /** Subtitle / secondary name shown below */
  subtitleName: string;
  holdSeconds: number;
  sets: number;
  cameraSupported: boolean;
  tip?: string;
  caution?: string;
  onStart: () => void;
  status?: 'done' | 'skipped' | 'pain';
}

export const PoseCard: React.FC<PoseCardProps> = ({
  id,
  primaryName,
  subtitleName,
  holdSeconds,
  sets,
  cameraSupported,
  tip,
  caution,
  onStart,
  status,
}) => {
  const { language, t } = useLanguage();

  const startLabel =
    status === 'done'
      ? language === 'hi' ? 'दोबारा करें' : language === 'en' ? 'Repeat Pose' : 'Dobara Karein'
      : t.startPose;

  return (
    <div
      className={`relative bg-surface rounded-2xl p-5 border transition-all duration-200 shadow-soft hover:shadow-lift ${
        status === 'done'
          ? 'border-emerald-200 bg-emerald-50/20'
          : status === 'pain'
          ? 'border-coral-200 bg-coral-50/20'
          : status === 'skipped'
          ? 'border-slate-200 opacity-70'
          : 'border-sand-200 hover:border-teal-500'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Inline SVG Pose Icon */}
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 stroke-current fill-none stroke-[1.8] stroke-linecap-round stroke-linejoin-round"
            >
              {id === 'tadasana' ? (
                <>
                  <circle cx="12" cy="4" r="2" />
                  <path d="M12 6v10m-3 6l3-6 3 6M8 10l4-2 4 2" />
                </>
              ) : id === 'vrikshasana' ? (
                <>
                  <circle cx="12" cy="4" r="2" />
                  <path d="M12 6v16m-3-12l3-2 3 2m-3 8l3-3v3" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="5" r="2" />
                  <path d="M7 11h10M12 7v7l-4 6m8 0l-4-6" />
                </>
              )}
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-slate-850 leading-tight">
              {primaryName}
            </h3>
            {subtitleName && (
              <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                {subtitleName}
              </span>
            )}
          </div>
        </div>

        {cameraSupported ? (
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200 whitespace-nowrap">
            <Camera className="w-3.5 h-3.5" />
            Live AI
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-sand-100 text-slate-600 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5" />
            {language === 'hi' ? 'टाइमर' : language === 'en' ? 'Timer' : 'Timer'}
          </span>
        )}
      </div>

      {tip && (
        <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed bg-sand-50 p-2.5 rounded-lg border border-sand-100">
          💡 {tip}
        </p>
      )}

      {caution && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-2">{caution}</span>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-sand-100 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            {holdSeconds}s
          </span>
          <span className="flex items-center gap-1">
            <Repeat className="w-3.5 h-3.5 text-teal-600" />
            {sets} {language === 'hi' ? 'सेट' : 'set'}{sets > 1 && language === 'en' ? 's' : ''}
          </span>
        </div>

        <button
          onClick={onStart}
          className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-sm active:scale-95"
        >
          {startLabel}
        </button>
      </div>
    </div>
  );
};
