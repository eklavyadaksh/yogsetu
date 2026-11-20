import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Camera,
  Stethoscope,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { AiConsultationHero } from '../components/AiConsultationHero';
import {
  RecommendedPosesSection,
  RecommendedItem,
} from '../components/RecommendedPosesSection';
import {
  ScheduleEnvironmentModal,
  UserScheduleProfile,
} from '../components/ScheduleEnvironmentModal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getUserSchedule } from '../lib/userStorage';
import {
  recommendPosesForProfile,
  getPoseById,
} from '../lib/posesData';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingAi, setLoadingAi] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [recommendedItems, setRecommendedItems] = useState<RecommendedItem[]>([]);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleModalStep, setScheduleModalStep] = useState<'form' | 'environment'>('form');
  const [autoStartWorkout, setAutoStartWorkout] = useState(false);

  // Active user schedule profile (isolated per user)
  const [savedProfile, setSavedProfile] = useState<UserScheduleProfile | null>(() =>
    getUserSchedule(user?.identifier)
  );

  // Listen for schedule updates from modal or login
  useEffect(() => {
    const handleUpdate = () => {
      setSavedProfile(getUserSchedule(user?.identifier));
    };
    window.addEventListener('yogsetu_schedule_updated', handleUpdate);
    return () => window.removeEventListener('yogsetu_schedule_updated', handleUpdate);
  }, [user?.identifier]);

  // Re-sync when user identity changes
  useEffect(() => {
    setSavedProfile(getUserSchedule(user?.identifier));
  }, [user?.identifier]);

  // Handle Step 1 Submit (Text or Image or Voice transcribed)
  const handleConsultSubmit = async ({
    text,
    imageFile,
  }: {
    text: string;
    imageFile: File | null;
  }) => {
    setLoadingAi(true);
    const queryDisplay = text || (imageFile ? `Image: ${imageFile.name}` : 'General Wellness');
    setSubmittedQuery(queryDisplay);

    try {
      if (imageFile) {
        // Image-based consultation
        const formData = new FormData();
        formData.append('note_image', imageFile);
        formData.append('minutes_available', '15');
        formData.append('age_group', 'adult');

        try {
          const resp = await api.createPlanFromNote(formData);
          if (resp && resp.plan && resp.plan.length > 0) {
            setAiSummary(resp.summary || 'Analysis complete based on your attached prescription/exercise note.');
            const mapped = resp.plan.map((p) => {
              const fullPose = getPoseById(p.pose_id);
              return {
                pose: fullPose,
                sets: p.sets || 2,
                hold_seconds: p.hold_seconds || fullPose.default_hold_seconds,
                rest_seconds: fullPose.recommended_rest_seconds || 15,
                tip: p.tip,
              };
            });
            setRecommendedItems(mapped);
          } else {
            fallbackLocalRecommendation(text);
          }
        } catch {
          // If backend isn't reachable, smoothly fallback to rich local recommendation engine!
          fallbackLocalRecommendation(text);
        }
      } else {
        // Text-based consultation
        try {
          const resp = await api.createSelfPlan({
            goal_or_concern: text,
            minutes_available: 15,
            age_group: 'adult',
          });

          if (resp && resp.plan && resp.plan.length > 0) {
            setAiSummary(resp.summary || `Prescribed customized routine for "${text}".`);
            const mapped = resp.plan.map((p) => {
              const fullPose = getPoseById(p.pose_id);
              return {
                pose: fullPose,
                sets: p.sets || fullPose.recommended_sets,
                hold_seconds: p.hold_seconds || fullPose.default_hold_seconds,
                rest_seconds: fullPose.recommended_rest_seconds || 15,
                tip: p.tip,
              };
            });
            setRecommendedItems(mapped);
          } else {
            fallbackLocalRecommendation(text);
          }
        } catch {
          // If backend is booting or offline, fallback cleanly
          fallbackLocalRecommendation(text);
        }
      }
    } finally {
      setLoadingAi(false);
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const fallbackLocalRecommendation = (query: string) => {
    const result = recommendPosesForProfile({
      query: query || 'Gentle mobility and spine alignment',
      minutesAvailable: 15,
    });
    setAiSummary(result.summary);
    setRecommendedItems(result.allPoses);
  };

  const handleResetQuery = () => {
    setAiSummary(null);
    setRecommendedItems([]);
    setSubmittedQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-slate-100 selection:bg-teal-500 selection:text-white">
      {/* Subdued Banner If User Has an Active Schedule */}
      {savedProfile && (
        <div className="bg-gradient-to-r from-teal-950/80 via-emerald-950/70 to-teal-950/80 border-b border-teal-800/50 py-2.5 px-4 text-xs text-teal-200 text-center flex flex-wrap items-center justify-center gap-2 sm:gap-4 transition animate-fade-in shadow-xs">
          <span>
            ✨ Welcome back, <strong className="text-white font-bold">{savedProfile.name || user?.name || 'Yogi'}</strong>! Today's {savedProfile.minutesAvailable || 30}-min routine is ready.
          </span>
          <div className="flex items-center gap-2">
            <Link
              to="/workout"
              className="px-3.5 py-1 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-[11px] shadow-sm flex items-center gap-1 transition cursor-pointer"
            >
              <span>▶ Start Today's Session</span>
            </Link>
            <Link
              to="/dashboard"
              className="font-bold underline text-teal-300 hover:text-white text-[11px] transition ml-1"
            >
              Go to My Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* STEP 1: DARK SLEEK AI HERO (Directly matching user screenshot) */}
      <section
        id="consultation-hero"
        className="relative w-full border-b border-slate-800/80 bg-gradient-to-b from-[#0b0e14] via-[#0f141d] to-[#121924] py-8 sm:py-16"
      >
        <AiConsultationHero onSubmit={handleConsultSubmit} isLoading={loadingAi} />
      </section>

      {/* STEP 2: ANSWER PART - RECOMMENDED YOGA ASANA */}
      <div id="results-section">
        {loadingAi && (
          <div className="py-16 px-4 max-w-3xl mx-auto text-center space-y-4 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 mx-auto flex items-center justify-center animate-spin">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white">
              Consulting Gemma AI for your personalized yoga therapy...
            </h3>
            <p className="text-sm text-slate-400">
              Evaluating safe biomechanics, sets, hold durations, and rest breaks.
            </p>
          </div>
        )}

        {aiSummary && recommendedItems.length > 0 && !loadingAi && (
          <div className="bg-[#fbf9f5] dark:bg-[#0c1017] text-slate-900 dark:text-white py-12 transition-colors">
            {!user && (
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-teal-900 dark:text-teal-200">
                    <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    <span>
                      <strong>Save your routine & progress:</strong> Sign in with Gmail or Phone to sync your daily routine, lock in camera AI tracking, and connect alarm reminders.
                    </span>
                  </div>
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold whitespace-nowrap shadow-xs transition"
                  >
                    Sign In / Create Profile →
                  </Link>
                </div>
              </div>
            )}

            <RecommendedPosesSection
              summary={aiSummary}
              items={recommendedItems}
              userGoal={submittedQuery}
              onOpenSchedule={() => {
                if (!user) {
                  navigate('/login');
                  return;
                }
                setScheduleModalStep('form');
                setAutoStartWorkout(false);
                setIsScheduleOpen(true);
              }}
              onReset={handleResetQuery}
            />
          </div>
        )}
      </div>

      {/* STEP 3 MODAL: SCHEDULE YOGA CLASSES & ENVIRONMENT */}
      <ScheduleEnvironmentModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        initialGoal={submittedQuery}
        initialMinutes={savedProfile?.minutesAvailable || 30}
        initialStep={scheduleModalStep}
        autoStartWorkout={autoStartWorkout}
      />

      {/* Clinical Bridge & 3 Pillars Section (Always available below) */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-slate-200">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            Doctor-Supervised Rehabilitation System
          </div>

          <h2 className="text-3xl sm:text-5xl font-serif font-black text-white tracking-tight leading-[1.15]">
            We do not replace the therapist.{' '}
            <span className="text-teal-400 underline decoration-sand-400 decoration-wavy decoration-2">
              We show the therapist what happens at home.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-400 font-sans leading-relaxed">
            YogSetu connects doctors with patients during home rehabilitation. Assign routines from prescription photos, track hold times with on-device camera feedback, and see real 14-day adherence.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-base shadow-lift transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              Access Doctor & Patient Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 3 Pillars Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#141b26] rounded-3xl p-7 border border-slate-800 shadow-soft space-y-4 hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white">1. Doctor Assigns</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upload a prescription note or enter clinical concerns. Gemma 4 drafts a personalized routine. Doctors fine-tune holds and sets before assigning to Gmail or Phone.
            </p>
          </div>

          <div className="bg-[#141b26] rounded-3xl p-7 border border-slate-800 shadow-soft space-y-4 hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white">2. Patient Does at Home</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time MediaPipe AI tracks posture angles. The hold timer ticks only when the pose is aligned. A friendly Hinglish voice coach guides corrections in real time.
            </p>
          </div>

          <div className="bg-[#141b26] rounded-3xl p-7 border border-slate-800 shadow-soft space-y-4 hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-2xl bg-coral-500/20 text-coral-400 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white">3. Closed-Loop Progress</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              At the next appointment, the doctor sees verified facts: days done, skipped, pain reports, angle improvements, and a factual Gemma summary.
            </p>
          </div>
        </div>

        {/* Traditional vs YogSetu Comparison */}
        <div className="mt-16 bg-[#141b26] rounded-3xl p-8 border border-slate-800 shadow-soft">
          <h3 className="text-2xl font-serif font-bold text-white text-center mb-6">
            The Missing Bridge in Home Therapy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Without YogSetu
              </span>
              <p className="text-sm text-slate-400">
                Doctor asks: <em>&ldquo;Did you do your exercises?&rdquo;</em> Patient nods yes. Neither knows if the angle was correct, if pain occurred, or which days were skipped.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-teal-950/40 border border-teal-800/60 space-y-3">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">
                With YogSetu
              </span>
              <p className="text-sm text-teal-100 font-medium">
                Doctor opens verified 14-day logs: 82% adherence, Tadasana spine angle improved from 166° to 176°, one pain stoppage on Day 9. Clinical decisions backed by truth.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
