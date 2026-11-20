import React from 'react';
import {
  Bell,
  Play,
  Sparkles,
} from 'lucide-react';
import { UserScheduleProfile } from './ScheduleEnvironmentModal';
import { recommendPosesForProfile } from '../lib/posesData';

interface UserScheduledDashboardProps {
  profile: UserScheduleProfile;
  onStartExercise: () => void;
  onOpenScheduleModal: () => void;
  onScrollToHero: () => void;
}

export const UserScheduledDashboard: React.FC<UserScheduledDashboardProps> = ({
  profile,
  onStartExercise,
  onOpenScheduleModal,
  onScrollToHero,
}) => {
  // Pre-calculate 3-phase breakdown for dashboard preview
  const selectedInjury = profile.injuries.filter((i) => i !== 'None / Healthy').join(', ') || 'None';
  const plan = recommendPosesForProfile({
    designation: profile.designation,
    injury: selectedInjury,
    minutesAvailable: profile.minutesAvailable || 30,
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      <div className="bg-gradient-to-br from-[#121926] via-[#162032] to-[#0f1722] rounded-3xl p-6 sm:p-8 border border-teal-500/30 shadow-2xl relative overflow-hidden text-white">
        {/* Subtle ambient aura */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 space-y-6">
          {/* Top Status & Alarm Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Your Daily Active Plan</span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-bold">
              <Bell className="w-3.5 h-3.5 animate-bounce" />
              <span>Alarm Active: {profile.alarmTime || '07:30'} Daily</span>
            </div>
          </div>

          {/* User Name & Routine Title */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-white tracking-tight">
              Welcome back, {profile.name || 'Yogi'}!
            </h2>
            <p className="text-xs sm:text-sm text-teal-200/90 font-sans">
              Personalized {profile.minutesAvailable || 30}-Minute Routine for{' '}
              <span className="font-bold text-white">{profile.designation}</span>
              {selectedInjury !== 'None' && (
                <span className="text-amber-300 ml-1 font-semibold">
                  • Safeguarded for {selectedInjury}
                </span>
              )}
            </p>
          </div>

          {/* 3-Phase Breakdown Visual Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Phase 1: Warmup */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>1. Warmup Phase</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20">~20%</span>
              </div>
              <div className="text-sm font-black text-white">
                {plan.phases.warmup.length} Asanas
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {plan.phases.warmup.map((p) => p.pose.english_name).join(', ')}
              </p>
            </div>

            {/* Phase 2: Main Exercise */}
            <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-teal-300">
                <span>2. Main Therapy</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-400/20">~60%</span>
              </div>
              <div className="text-sm font-black text-white">
                {plan.phases.exercise.length} Asanas
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {plan.phases.exercise.map((p) => p.pose.english_name).join(', ')}
              </p>
            </div>

            {/* Phase 3: Relaxation */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                <span>3. Cool-down</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-400/20">~20%</span>
              </div>
              <div className="text-sm font-black text-white">
                {plan.phases.relax.length} Asanas
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {plan.phases.relax.map((p) => p.pose.english_name).join(', ')}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={onStartExercise}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-base shadow-xl shadow-teal-500/30 transition transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Start Today's {profile.minutesAvailable || 30}-Min Workout</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenScheduleModal}
                className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-bold border border-slate-700 transition"
              >
                View Full Routine & Settings
              </button>

              <button
                type="button"
                onClick={onScrollToHero}
                className="px-3.5 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition"
                title="Ask a new question"
              >
                Ask New
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
