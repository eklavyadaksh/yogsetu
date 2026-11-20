import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getPoseName, getPoseSubtitle } from '../lib/poseI18n';
import {
  Calendar,
  Camera,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { EnrichedPose } from '../lib/posesData';

export interface RecommendedItem {
  pose: EnrichedPose;
  sets: number;
  hold_seconds: number;
  rest_seconds: number;
  tip?: string;
}

interface RecommendedPosesSectionProps {
  summary: string;
  items: RecommendedItem[];
  userGoal?: string;
  onOpenSchedule: () => void;
  onReset?: () => void;
}

export const RecommendedPosesSection: React.FC<RecommendedPosesSectionProps> = ({
  summary,
  items,
  userGoal,
  onOpenSchedule,
  onReset,
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleStartPose = (poseId: string) => {
    navigate(`/session/${poseId}?source=self`);
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      {/* Top Banner & Call to Action */}
      <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white border border-teal-800/60 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step 2: AI Clinical Recommendations</span>
            </div>

            {onReset && (
              <button
                onClick={onReset}
                className="text-xs text-slate-300 hover:text-white underline flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Ask another query
              </button>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
            Recommended Yoga Asanas For You
          </h2>

          {userGoal && (
            <p className="text-xs sm:text-sm text-teal-200/90 font-medium">
              Targeting concern: <span className="text-white italic">&ldquo;{userGoal}&rdquo;</span>
            </p>
          )}

          <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed max-w-3xl">
            {summary}
          </p>

          {/* Schedule Classes Call to Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onOpenSchedule}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-teal-500/25 transition transform active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Calendar className="w-5 h-5 text-white" />
              <span>Schedule Yoga Classes For You</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <span className="text-xs text-slate-400 self-center text-center sm:text-left">
              Includes daily free times, designation care, and connected alarm reminder
            </span>
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
        <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-500 mt-0.5" />
        <div>
          <span className="font-bold block">Therapeutic Safety First:</span>
          <span>
            These asanas are designed for gentle mobility and rehabilitation. If you experience sharp or radiating pain, stop immediately and rest in Balasana (Child's Pose).
          </span>
        </div>
      </div>

      {/* Recommended Asana Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900">
            Prescribed Routine ({items.length} Asanas)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Camera-guided posture tracking enabled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(({ pose, sets, hold_seconds, rest_seconds, tip }, idx) => (
            <div
              key={pose.id}
              className="bg-white rounded-3xl border border-sand-200 overflow-hidden shadow-soft hover:shadow-lift transition-all flex flex-col group"
            >
              {/* Pose Image with Overlay Badges */}
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                <img
                  src={pose.image_url || '/poses/tadasana.jpg'}
                  alt={pose.english_name}
                  onError={(e) => {
                    // Graceful fallback to tadasana image if specific image path fails
                    (e.target as HTMLImageElement).src = '/poses/tadasana.jpg';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold">
                  Pose {idx + 1} of {items.length}
                </div>
                {pose.camera_supported && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-teal-600/90 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm">
                    <Camera className="w-3 h-3" />
                    AI Camera
                  </div>
                )}
              </div>

              {/* Pose Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-serif font-bold text-slate-900 text-lg leading-snug">
                        {getPoseName(pose, language)}
                      </h4>
                      <p className="text-xs text-teal-800 font-medium">
                        {getPoseSubtitle(pose, language)}
                      </p>
                    </div>
                  </div>

                  {/* Sets, Hold, and Rest Badges */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-teal-50 border border-teal-100">
                      <span className="text-[10px] text-teal-700 font-bold uppercase block">Hold</span>
                      <span className="text-xs font-black text-teal-900">{hold_seconds}s</span>
                    </div>
                    <div className="p-2 rounded-xl bg-sand-100 border border-sand-200">
                      <span className="text-[10px] text-slate-600 font-bold uppercase block">Sets</span>
                      <span className="text-xs font-black text-slate-900">{sets} sets</span>
                    </div>
                    <div className="p-2 rounded-xl bg-coral-50 border border-coral-100">
                      <span className="text-[10px] text-coral-700 font-bold uppercase block">Break</span>
                      <span className="text-xs font-black text-coral-900">{rest_seconds}s rest</span>
                    </div>
                  </div>

                  {/* Target Muscles */}
                  {pose.target_muscles && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {pose.target_muscles.map((muscle, mIdx) => (
                        <span
                          key={mIdx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                        >
                          {muscle}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Clinical Benefit */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-1">
                    {pose.benefit_en || pose.caution_en}
                  </p>

                  {/* Hinglish tip */}
                  {tip && (
                    <div className="p-2.5 rounded-xl bg-sand-50 border border-sand-100 text-[11px] text-slate-700">
                      <span className="font-bold text-teal-900">Tip: </span>
                      {tip}
                    </div>
                  )}
                </div>

                {/* Practice with Live Camera Button */}
                <button
                  type="button"
                  onClick={() => handleStartPose(pose.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Practice With Camera AI</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Sticky-friendly CTA for mobile */}
      <div className="bg-sand-100 rounded-3xl p-6 border border-sand-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-serif font-bold text-slate-900 text-base sm:text-lg">
            Ready to integrate this into your daily schedule?
          </h4>
          <p className="text-xs sm:text-sm text-slate-600">
            Tell us your free hours, designation, and any injury to set up an alarm-connected environment.
          </p>
        </div>
        <button
          onClick={onOpenSchedule}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          <span>Schedule Yoga Classes For You</span>
        </button>
      </div>
    </section>
  );
};
