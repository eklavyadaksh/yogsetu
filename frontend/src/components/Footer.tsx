import React from 'react';
import { ShieldCheck, HeartHandshake } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-sand-200 bg-surface/60 py-6 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
      <div className="max-w-4xl mx-auto space-y-2">
        <div className="flex items-center justify-center gap-2 text-teal-800 font-semibold text-xs sm:text-sm">
          <HeartHandshake className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span>&ldquo;{t.positioning}&rdquo;</span>
        </div>

        {/* Non-negotiable medical disclaimer */}
        <div className="bg-sand-100/70 py-2 px-4 rounded-xl max-w-xl mx-auto border border-sand-200/80 text-amber-900 font-medium">
          ⚠️ {t.safetyFooter}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11px] text-slate-400 pt-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            100% On-Device Pose Tracking (No video leaves your device)
          </span>
          <span>•</span>
          <span>Demo Prototype with Gemma 4 Vision & Analysis</span>
          <span>•</span>
          <span>Privacy Isolated: Self sessions are never shared</span>
        </div>
      </div>
    </footer>
  );
};
