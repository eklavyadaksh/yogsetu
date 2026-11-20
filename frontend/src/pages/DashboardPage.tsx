import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getUserSchedule, UserScheduleProfile } from '../lib/userStorage';
import { recommendPosesForProfile } from '../lib/posesData';
import { getPoseName, getPoseSubtitle } from '../lib/poseI18n';
import { ScheduleEnvironmentModal } from '../components/ScheduleEnvironmentModal';
import {
  Play,
  Calendar,
  Bell,
  Sparkles,
  ArrowRight,
  Settings,
  HelpCircle,
  PlusCircle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Load schedule strictly for this user
  const [profile, setProfile] = useState<UserScheduleProfile | null>(() =>
    getUserSchedule(user?.identifier)
  );

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState<'form' | 'environment'>('form');

  // Listen for schedule updates
  useEffect(() => {
    const handleUpdate = () => {
      setProfile(getUserSchedule(user?.identifier));
    };
    window.addEventListener('yogsetu_schedule_updated', handleUpdate);
    return () => window.removeEventListener('yogsetu_schedule_updated', handleUpdate);
  }, [user?.identifier]);

  // Re-sync when user changes
  useEffect(() => {
    setProfile(getUserSchedule(user?.identifier));
  }, [user?.identifier]);

  // Calculate 3-phase routine if profile exists
  const selectedInjury =
    profile?.injuries?.filter((i: string) => i !== 'None / Healthy').join(', ') || 'None';

  const plan = profile
    ? recommendPosesForProfile({
        designation: profile.designation,
        injury: selectedInjury,
        minutesAvailable: profile.minutesAvailable || 30,
      })
    : null;

  const handleStartWorkout = () => {
    navigate('/workout');
  };

  const handleOpenEdit = () => {
    setModalInitialStep('form');
    setIsScheduleModalOpen(true);
  };

  const handleOpenCreate = () => {
    setModalInitialStep('form');
    setIsScheduleModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-[#0b0e14] text-slate-850 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans transition-colors">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* TOP GREETING BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand-200 dark:border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personal Yoga Therapy Dashboard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-slate-900 dark:text-white">
              {user?.name ? `${user.name}'s Routine` : 'My Yoga Dashboard'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Account Identifier: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.identifier || 'Guest'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-sand-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-sand-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs"
            >
              <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Consult Gemma AI</span>
            </Link>

            {profile && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-sand-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-sand-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Edit Routine</span>
              </button>
            )}
          </div>
        </div>

        {/* STATE A: ACTIVE SCHEDULE AVAILABLE */}
        {profile && plan ? (
          <div className="space-y-8">
            {/* HERO CTA CARD: START TODAY'S SESSION */}
            <div className="bg-gradient-to-br from-[#121926] via-[#162032] to-[#0f1722] rounded-3xl p-6 sm:p-10 border border-teal-500/30 shadow-2xl relative overflow-hidden text-white">
              {/* Subtle ambient aura */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24"></div>

              <div className="relative z-10 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-bold">
                    <Bell className="w-3.5 h-3.5 animate-bounce" />
                    <span>Daily Reminder: {profile.alarmTime || '07:30'} Active</span>
                  </div>

                  <span className="text-xs text-slate-400">
                    Target: <strong className="text-teal-300 font-bold">{profile.minutesAvailable || 30} Minutes</strong> Daily
                  </span>
                </div>

                <div className="space-y-2 max-w-2xl">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-white tracking-tight leading-tight">
                    Today's Guided Therapeutic Yoga Session
                  </h2>
                  <p className="text-xs sm:text-sm text-teal-200/90 leading-relaxed font-sans">
                    Tailored for your role as <span className="font-bold text-white">{profile.designation}</span>
                    {selectedInjury !== 'None' && (
                      <span className="text-amber-300 ml-1 font-semibold">
                        • Safeguarded for {selectedInjury}
                      </span>
                    )}. Runs sequentially from Warmup → Main Therapy → Relaxation with automatic rest intervals.
                  </p>
                </div>

                {/* Primary Launch Action */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <button
                    type="button"
                    onClick={handleStartWorkout}
                    className="px-10 py-5 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-lg shadow-2xl shadow-teal-500/40 transition transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Play className="w-6 h-6 fill-slate-950" />
                    <span>Start Today's Session ({profile.minutesAvailable || 30} Mins)</span>
                  </button>

                  <div className="text-xs text-slate-400 sm:max-w-xs leading-snug">
                    👉 Continuous hands-free flow: includes 3s preparation count & full-screen black rest breaks.
                  </div>
                </div>
              </div>
            </div>

            {/* 3-PHASE BREAKDOWN CARDS */}
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Routine Structure & Asanas</span>
                <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  {plan.allPoses.length} Total Postures
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. WARMUP */}
                <div className="bg-white dark:bg-[#121926] rounded-3xl p-6 border border-amber-200/60 dark:border-amber-500/20 shadow-soft space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                      1. Warmup Phase (~20%)
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {plan.phases.warmup.length} Asanas
                    </span>
                  </div>

                  <div className="space-y-3">
                    {plan.phases.warmup.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-sand-50 dark:bg-slate-900/60 border border-sand-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {getPoseName(item.pose, language)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {getPoseSubtitle(item.pose, language)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-amber-600 dark:text-amber-400 block">
                            {item.sets} × {item.hold_seconds}s
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.rest_seconds}s rest
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. MAIN THERAPY */}
                <div className="bg-white dark:bg-[#121926] rounded-3xl p-6 border border-teal-200/60 dark:border-teal-500/20 shadow-soft space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                      2. Main Therapy (~60%)
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {plan.phases.exercise.length} Asanas
                    </span>
                  </div>

                  <div className="space-y-3">
                    {plan.phases.exercise.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-sand-50 dark:bg-slate-900/60 border border-sand-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {getPoseName(item.pose, language)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {getPoseSubtitle(item.pose, language)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-teal-600 dark:text-teal-400 block">
                            {item.sets} × {item.hold_seconds}s
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.rest_seconds}s rest
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. COOL-DOWN */}
                <div className="bg-white dark:bg-[#121926] rounded-3xl p-6 border border-indigo-200/60 dark:border-indigo-500/20 shadow-soft space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                      3. Cool-down (~20%)
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {plan.phases.relax.length} Asanas
                    </span>
                  </div>

                  <div className="space-y-3">
                    {plan.phases.relax.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-sand-50 dark:bg-slate-900/60 border border-sand-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {getPoseName(item.pose, language)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {getPoseSubtitle(item.pose, language)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
                            {item.sets} × {item.hold_seconds}s
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.rest_seconds}s rest
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STATE B: NO SCHEDULE YET FOR THIS USER */
          <div className="bg-white dark:bg-[#121926] rounded-3xl p-8 sm:p-12 border border-sand-200 dark:border-slate-800 shadow-xl text-center max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-md">
              <Calendar className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 dark:text-white">
                No Active Routine Scheduled Yet
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                Welcome, <strong className="text-teal-700 dark:text-teal-400">{user?.name || user?.identifier || 'Friend'}</strong>! Set up your designation, daily time commitment, and any injury alerts to unlock your personalized Warmup, Exercise, and Relaxation schedule.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm shadow-xl shadow-teal-600/30 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Create My Personalized Routine (1 Min)</span>
              </button>

              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-sand-100 dark:bg-slate-800 hover:bg-sand-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Consult Gemma AI</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* SCHEDULE MODAL */}
      <ScheduleEnvironmentModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        initialMinutes={profile?.minutesAvailable || 30}
        initialStep={modalInitialStep}
      />
    </div>
  );
};
