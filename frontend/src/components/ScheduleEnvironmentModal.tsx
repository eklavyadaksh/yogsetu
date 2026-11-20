import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Bell,
  Volume2,
  X,
  ShieldAlert,
  Sparkles,
  User,
  Briefcase,
  Play,
  Camera,
  Mail,
  Phone,
  FastForward,
} from 'lucide-react';
import { playChime } from './AlarmModal';
import {
  recommendPosesForProfile,
  PhaseScheduleItem,
} from '../lib/posesData';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getUserSchedule, saveUserSchedule } from '../lib/userStorage';

interface ScheduleEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGoal?: string;
  initialMinutes?: number;
  initialStep?: 'form' | 'environment';
  autoStartWorkout?: boolean;
}

export interface UserScheduleProfile {
  name: string;
  email: string;
  phone: string;
  age: number;
  designation: string;
  freeSlots: string[];
  alarmTime: string;
  alarmEnabled: boolean;
  minutesAvailable: number;
  injuries: string[];
  customInjuryNotes: string;
}

export const ScheduleEnvironmentModal: React.FC<ScheduleEnvironmentModalProps> = ({
  isOpen,
  onClose,
  initialGoal = '',
  initialMinutes = 30,
  initialStep = 'form',
  autoStartWorkout = false,
}) => {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  // Load existing profile from isolated localStorage for this specific user
  const [profile, setProfile] = useState<UserScheduleProfile>(() => {
    const existing = getUserSchedule(user?.identifier);
    if (existing) return existing;
    return {
      name: user?.name || '',
      email: user?.identifier.includes('@') ? user.identifier : '',
      phone: !user?.identifier.includes('@') ? user?.identifier || '' : '',
      age: 28,
      designation: 'Software Engineer / IT',
      freeSlots: ['Morning (7:30 - 9:00 AM)'],
      alarmTime: localStorage.getItem('yogsetu_alarm_time') || '07:30',
      alarmEnabled: localStorage.getItem('yogsetu_alarm_enabled') !== 'false',
      minutesAvailable: initialMinutes || 30,
      injuries: ['None / Healthy'],
      customInjuryNotes: '',
    };
  });

  // Re-sync profile when active logged-in user changes
  useEffect(() => {
    if (isOpen) {
      const existing = getUserSchedule(user?.identifier);
      if (existing) {
        setProfile(existing);
      } else if (user) {
        setProfile((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.identifier.includes('@') ? user.identifier : prev.email,
          phone: !user.identifier.includes('@') ? user.identifier : prev.phone,
        }));
      }
    }
  }, [user, isOpen]);

  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Step state: 'form' | 'environment'
  const [activeStep, setActiveStep] = useState<'form' | 'environment'>('form');

  // Generated Environment Data (Warmup + Exercise + Relax)
  const [environmentData, setEnvironmentData] = useState<{
    summary: string;
    phases: {
      warmup: PhaseScheduleItem[];
      exercise: PhaseScheduleItem[];
      relax: PhaseScheduleItem[];
    };
    allPoses: PhaseScheduleItem[];
  }>({
    summary: '',
    phases: { warmup: [], exercise: [], relax: [] },
    allPoses: [],
  });

  // Active Phase Filter in Environment view: 'all' | 'warmup' | 'exercise' | 'relax'
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<'all' | 'warmup' | 'exercise' | 'relax'>('all');

  // Workout Player State
  const [isPlayingWorkout, setIsPlayingWorkout] = useState(false);
  const [currentPoseIdx, setCurrentPoseIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isRestPhase, setIsRestPhase] = useState(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null); // 3s prep before exercise
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [chimeNotice, setChimeNotice] = useState<string | null>(null);

  // Designation options
  const designationOptions = [
    '💻 Software Engineer / IT',
    '🏢 Desk / Corporate Worker',
    '🎓 Student',
    '🩺 Healthcare / Doctor / Nurse',
    '🏫 Teacher / Academic',
    '🏡 Homemaker',
    '🏃 Athlete / Fitness Trainer',
    '🌿 Senior Citizen',
  ];

  // Free times options
  const freeSlotOptions = [
    '🌅 Early Morning (6:00 - 7:30 AM)',
    '☀️ Morning (7:30 - 9:00 AM)',
    '🥗 Lunch Break (1:00 - 2:00 PM)',
    '🌆 Evening (5:30 - 7:00 PM)',
    '🌙 Night Before Bed (8:30 - 10:00 PM)',
  ];

  // Injuries options
  const injuryOptions = [
    'None / Healthy',
    'Lower Back Pain / Sciatica',
    'Cervical / Neck Stiffness',
    'Knee Pain / Ligament Strain',
    'Wrist / Carpal Tunnel',
    'Shoulder Strain',
    'High Blood Pressure',
  ];

  const handleTestChime = () => {
    playChime();
    setChimeNotice('🔔 Singing bowl chime sounded! This gentle acoustic chord will ring for your reminder.');
    setTimeout(() => setChimeNotice(null), 4500);
  };

  const handleRequestNotification = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('YogSetu Reminder Active', {
          body: `Daily yoga classes scheduled for ${profile.alarmTime}!`,
          icon: '/favicon.ico',
        });
      }
    }
  };

  const handleGenerateEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();

    const primaryIdentifier = (profile.email || profile.phone || 'guest@yogsetu.local').trim();

    // 1. Register / login in the database as primary key
    try {
      await api.login({
        identifier: primaryIdentifier,
        name: profile.name || primaryIdentifier.split('@')[0],
        role: 'user',
      });
      login({
        identifier: primaryIdentifier,
        name: profile.name || primaryIdentifier.split('@')[0],
        role: 'user',
      });
    } catch (err) {
      console.warn('Backend login registration notice:', err);
    }

    // 2. Persist strictly isolated to this user's primary key
    saveUserSchedule(profile, primaryIdentifier);

    // 3. Run 3-phase recommendation engine (Warmup + Exercise + Relax)
    const selectedInjury = profile.injuries.filter((i) => i !== 'None / Healthy').join(', ') || 'None';
    const result = recommendPosesForProfile({
      query: initialGoal,
      designation: profile.designation,
      injury: selectedInjury,
      minutesAvailable: profile.minutesAvailable,
    });

    setEnvironmentData(result);
    setActiveStep('environment');
  };

  // Synchronize modal state with initialStep and autoStartWorkout props
  useEffect(() => {
    if (!isOpen) {
      setIsPlayingWorkout(false);
      setIsRestPhase(false);
      setPrepCountdown(null);
      return;
    }

    if (initialStep === 'environment') {
      const selectedInjury = profile.injuries.filter((i) => i !== 'None / Healthy').join(', ') || 'None';
      const result = recommendPosesForProfile({
        query: initialGoal,
        designation: profile.designation,
        injury: selectedInjury,
        minutesAvailable: profile.minutesAvailable,
      });
      setEnvironmentData(result);
      setActiveStep('environment');

      if (autoStartWorkout && result.allPoses.length > 0) {
        setCurrentPoseIdx(0);
        setCurrentSet(1);
        setIsRestPhase(false);
        setIsPaused(false);
        setIsPlayingWorkout(true);
        setPrepCountdown(3);
        playChime();
      }
    } else {
      setActiveStep('form');
    }
  }, [isOpen, initialStep, autoStartWorkout]);

  // Workout Player: 3-Second Preparation Countdown Timer
  useEffect(() => {
    if (prepCountdown === null || isPaused) return;

    if (prepCountdown <= 1) {
      setPrepCountdown(null);
      const currentItem = environmentData.allPoses[currentPoseIdx];
      if (currentItem) {
        setHoldSecondsLeft(currentItem.hold_seconds);
      }
      playChime();
      return;
    }

    const timer = setTimeout(() => {
      setPrepCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [prepCountdown, isPaused, currentPoseIdx, environmentData.allPoses]);

  // Workout Player: Active Hold Timer & Rest Interval Transition
  useEffect(() => {
    if (!isPlayingWorkout || isPaused || prepCountdown !== null) return;

    // REST PHASE COUNTDOWN
    if (isRestPhase) {
      if (restSecondsLeft <= 0) {
        // Rest is over! Unlock next set / next pose
        playChime();
        setIsRestPhase(false);
        // Start 3-second preparation countdown before next exercise starts!
        setPrepCountdown(3);
        return;
      }

      const restTimer = setInterval(() => {
        setRestSecondsLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(restTimer);
    }

    // ACTIVE EXERCISE HOLD TIMER
    if (holdSecondsLeft <= 0) {
      const currentItem = environmentData.allPoses[currentPoseIdx];
      if (!currentItem) return;

      playChime();

      if (currentSet < currentItem.sets) {
        // More sets remain for this pose -> trigger WHOLE BLACK REST SCREEN
        setCurrentSet((s) => s + 1);
        setIsRestPhase(true);
        setRestSecondsLeft(currentItem.rest_seconds || 20);
      } else {
        // Finished all sets for this pose!
        if (currentPoseIdx + 1 < environmentData.allPoses.length) {
          // Advance to next pose in sequence (Warmup -> Exercise -> Relax)
          setCurrentPoseIdx((idx) => idx + 1);
          setCurrentSet(1);
          setIsRestPhase(true);
          setRestSecondsLeft(30); // 30s rest between different asanas
        } else {
          // Completed full 3-phase session!
          setIsPlayingWorkout(false);
          alert('🎉 Congratulations! You have completed your full scheduled yoga session!');
        }
      }
      return;
    }

    const holdInterval = setInterval(() => {
      setHoldSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(holdInterval);
  }, [
    isPlayingWorkout,
    isPaused,
    prepCountdown,
    isRestPhase,
    restSecondsLeft,
    holdSecondsLeft,
    currentSet,
    currentPoseIdx,
    environmentData.allPoses,
  ]);

  const startGuidedWorkout = () => {
    if (environmentData.allPoses.length === 0) return;
    setCurrentPoseIdx(0);
    setCurrentSet(1);
    setIsRestPhase(false);
    setIsPaused(false);
    setIsPlayingWorkout(true);
    // Start with 3s preparation countdown so user gets into position!
    setPrepCountdown(3);
    playChime();
  };

  const handleSkipRest = () => {
    // End rest immediately and unlock next pose with 3s prep!
    setIsRestPhase(false);
    setRestSecondsLeft(0);
    setPrepCountdown(3);
    playChime();
  };

  const stopGuidedWorkout = () => {
    setIsPlayingWorkout(false);
    setIsPaused(false);
    setIsRestPhase(false);
    setPrepCountdown(null);
  };

  const handleLaunchCamera = (poseId: string) => {
    onClose();
    navigate(`/session/${poseId}?source=self`);
  };

  if (!isOpen) return null;

  const currentItem = environmentData.allPoses[currentPoseIdx];
  const nextItem =
    currentSet < (currentItem?.sets || 1)
      ? currentItem
      : environmentData.allPoses[currentPoseIdx + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
      {/* ============================================================== */}
      {/* WHOLE BLACK SCREEN REST OVERLAY (Requirement from User)        */}
      {/* ============================================================== */}
      {isPlayingWorkout && isRestPhase && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in">
          {/* Calming breathing glow ring */}
          <div className="relative mb-6 flex items-center justify-center">
            <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-teal-500/30 flex items-center justify-center animate-pulse-subtle">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-teal-950/50 border border-teal-400/40 flex flex-col items-center justify-center shadow-2xl">
                <span className="text-xs text-teal-300 font-bold uppercase tracking-widest block">
                  Rest & Recover
                </span>
                <span className="text-5xl sm:text-6xl font-black font-sans tracking-tight text-white mt-1">
                  {restSecondsLeft}s
                </span>
                <span className="text-[11px] text-teal-300/80 mt-1">Breathe deeply</span>
              </div>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mb-2">
            Rest Period • Relax Your Muscles
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed mb-6">
            Inhale calm energy for 4 seconds, exhale and release all tension from your spine.
          </p>

          {/* Next Pose Preview */}
          {nextItem && (
            <div className="mb-8 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="text-teal-400 font-bold block mb-0.5">Next Asana Unlocks After Rest:</span>
              <span className="text-white font-semibold">
                {nextItem.pose.hindi_name} ({nextItem.pose.english_name})
              </span>
              <span className="text-slate-400 text-[11px] ml-1.5">
                • {nextItem.phase.toUpperCase()}
              </span>
            </div>
          )}

          {/* Skip Rest Button */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSkipRest}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-600/30 transition transform active:scale-95 cursor-pointer"
            >
              <FastForward className="w-4 h-4" />
              <span>Skip Rest Time (I'm Ready)</span>
            </button>

            <button
              type="button"
              onClick={stopGuidedWorkout}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              End Workout
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3-SECOND PREPARATION COUNTDOWN OVERLAY                         */}
      {/* ============================================================== */}
      {isPlayingWorkout && prepCountdown !== null && (
        <div className="fixed inset-0 z-[90] bg-slate-950/95 flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">
            Get Ready On Mat!
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-6">
            {currentItem?.pose.hindi_name} • {currentItem?.pose.english_name}
          </h2>
          <div className="w-28 h-28 rounded-full bg-teal-600/30 border-2 border-teal-400 flex items-center justify-center text-6xl font-black text-white shadow-2xl animate-bounce">
            {prepCountdown}
          </div>
          <p className="text-xs text-slate-400 mt-6">
            Prepare your stance. Posture hold begins automatically!
          </p>
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN MODAL CONTAINER                                           */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-sand-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-white leading-tight">
                {activeStep === 'form' ? 'Schedule Yoga Classes For You' : 'Your 3-Phase Yoga Environment'}
              </h3>
              <p className="text-xs text-slate-400">
                {activeStep === 'form'
                  ? 'Warmup + Main Exercise + Relaxation divided automatically'
                  : 'Alarm-connected environment with rest screen & sets'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeStep === 'environment' && (
              <button
                type="button"
                onClick={() => {
                  stopGuidedWorkout();
                  setActiveStep('form');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Edit Details
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================================== */}
          {/* STEP 3A: USER INTAKE & SCHEDULING FORM                     */}
          {/* ========================================================== */}
          {activeStep === 'form' && (
            <form onSubmit={handleGenerateEnvironment} className="space-y-6">
              {chimeNotice && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 flex items-center gap-2 animate-fade-in">
                  <Volume2 className="w-4 h-4 text-teal-700 flex-shrink-0" />
                  <span>{chimeNotice}</span>
                </div>
              )}

              {/* 1. Name & Age with high-contrast jet black input text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="e.g. Gaurav Sharma"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-950 font-bold placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={8}
                    max={100}
                    required
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-950 font-bold placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>
              </div>

              {/* 2. Gmail and Phone (Primary Key for database registration) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
                <div>
                  <label className="block text-xs font-bold text-teal-950 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-teal-700" />
                    Gmail / Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="yourname@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 bg-white text-slate-950 font-bold placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="text-[10px] text-teal-800 mt-1 block">
                    Used as database key so your schedule loads automatically when you log in.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-teal-950 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-700" />
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 bg-white text-slate-950 font-bold placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="text-[10px] text-teal-800 mt-1 block">
                    Supports SMS / WhatsApp reminder integration.
                  </span>
                </div>
              </div>

              {/* 3. Designation / Occupation */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-teal-700" />
                  Designation / Occupation
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {designationOptions.map((desig) => (
                    <button
                      key={desig}
                      type="button"
                      onClick={() => setProfile({ ...profile, designation: desig })}
                      className={`p-2.5 text-xs font-bold rounded-xl border text-left transition ${
                        profile.designation === desig
                          ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                          : 'bg-sand-50 hover:bg-sand-100 text-slate-800 border-sand-200'
                      }`}
                    >
                      {desig}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Amount of Time (30 Min Warmup + Exercise + Relax Division) */}
              <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Amount of Time You Can Give Daily
                  </label>
                  <span className="text-xs text-teal-800 font-bold">
                    Automatically divided: Warmup (20%) + Exercise (60%) + Relax (20%)
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setProfile({ ...profile, minutesAvailable: mins })}
                      className={`py-2.5 text-xs font-bold rounded-xl border transition ${
                        profile.minutesAvailable === mins
                          ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                          : 'bg-white hover:bg-sand-100 text-slate-800 border-sand-300'
                      }`}
                    >
                      {mins} Minutes {mins === 30 ? '⭐ Full' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Times Free & Daily Alarm Reminder */}
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-800" />
                    <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                      Times You Are Free
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-700">Select free slots</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {freeSlotOptions.map((slot) => {
                    const isSelected = profile.freeSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? profile.freeSlots.filter((s) => s !== slot)
                            : [...profile.freeSlots, slot];
                          setProfile({ ...profile, freeSlots: updated });
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                          isSelected
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white text-slate-750 border-teal-200 hover:bg-teal-50'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>

                {/* Alarm connection */}
                <div className="pt-3 border-t border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-teal-950 block">
                      Connect Reminder with In-Tab Acoustic Alarm
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Rings Tibetan singing bowl chime (528Hz) at your scheduled time.
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={profile.alarmTime}
                      onChange={(e) => setProfile({ ...profile, alarmTime: e.target.value })}
                      className="px-3 py-1.5 rounded-xl border border-teal-300 bg-white text-slate-950 font-bold text-xs"
                    />

                    <button
                      type="button"
                      onClick={handleTestChime}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                      title="Test alarm sound"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Test Chime
                    </button>
                  </div>
                </div>

                {/* Browser Notification */}
                {'Notification' in window && (
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      Browser Alerts: {notificationPermission === 'granted' ? '✅ Active' : 'Not yet allowed'}
                    </span>
                    {notificationPermission !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleRequestNotification}
                        className="text-xs text-teal-800 underline font-semibold hover:text-teal-950"
                      >
                        Enable System Alerts
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 6. Any Injury / Condition */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-coral-600" />
                  Any Injuries or Health Concerns?
                </label>
                <div className="flex flex-wrap gap-2">
                  {injuryOptions.map((inj) => {
                    const isSelected = profile.injuries.includes(inj);
                    return (
                      <button
                        key={inj}
                        type="button"
                        onClick={() => {
                          if (inj === 'None / Healthy') {
                            setProfile({ ...profile, injuries: ['None / Healthy'] });
                          } else {
                            const withoutNone = profile.injuries.filter((i) => i !== 'None / Healthy');
                            const updated = isSelected
                              ? withoutNone.filter((i) => i !== inj)
                              : [...withoutNone, inj];
                            setProfile({
                              ...profile,
                              injuries: updated.length > 0 ? updated : ['None / Healthy'],
                            });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
                          isSelected
                            ? 'bg-coral-600 text-white border-coral-600'
                            : 'bg-sand-50 hover:bg-sand-100 text-slate-700 border-sand-200'
                        }`}
                      >
                        {inj}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2.5">
                  <input
                    type="text"
                    value={profile.customInjuryNotes}
                    onChange={(e) => setProfile({ ...profile, customInjuryNotes: e.target.value })}
                    placeholder="Specific notes (e.g. L4-L5 disc stiffness, right knee surgery 2 years ago)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-950 font-bold placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-sand-200 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm shadow-md transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate 3-Phase Environment & Connect Alarm</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================== */}
          {/* STEP 3B: THE CUSTOMIZED YOGA ENVIRONMENT                   */}
          {/* ========================================================== */}
          {activeStep === 'environment' && (
            <div className="space-y-6 animate-fade-in">
              {/* Profile & Alarm Connected Banner */}
              <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 p-6 rounded-3xl text-white border border-teal-800 shadow-lg space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>3-Phase Routine Activated</span>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300 text-xs font-bold">
                    <Bell className="w-3.5 h-3.5 animate-bounce" />
                    <span>Alarm: {profile.alarmTime} Daily</span>
                  </div>
                </div>

                <h3 className="text-2xl font-serif font-black text-white">
                  Namaste {profile.name || 'Yogi'}! ({profile.designation})
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {environmentData.summary}
                </p>

                {/* Account / Primary Key Pill */}
                <div className="pt-1 flex flex-wrap items-center gap-3 text-xs text-teal-200">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    {profile.minutesAvailable} Minutes Divided
                  </span>
                  <span>•</span>
                  <span>Key: {profile.email || profile.phone}</span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleTestChime}
                    className="underline text-teal-300 hover:text-white flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Test Chime
                  </button>
                </div>
              </div>

              {/* Guided Workout Player Launch Bar */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="space-y-1">
                  <span className="text-base font-bold flex items-center gap-2">
                    <Play className="w-4 h-4 fill-white" />
                    Start Guided Practice Environment
                  </span>
                  <p className="text-xs text-teal-100 max-w-lg leading-relaxed">
                    Guides you through Warmup → Exercise → Relax. Features automated hold timers, full-screen dark rest intervals, and a 3-second preparation buffer!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startGuidedWorkout}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-teal-900 font-black text-xs sm:text-sm shadow-md hover:bg-teal-50 transition transform active:scale-95 flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-teal-900" />
                  <span>Start Guided Workout</span>
                </button>
              </div>

              {/* 3-Phase Tabs Filter */}
              <div className="flex items-center gap-2 border-b border-sand-200 pb-2">
                {[
                  { key: 'all', label: `All (${environmentData.allPoses.length})` },
                  { key: 'warmup', label: `1. Warmup (${environmentData.phases.warmup.length})` },
                  { key: 'exercise', label: `2. Main Exercise (${environmentData.phases.exercise.length})` },
                  { key: 'relax', label: `3. Relax (${environmentData.phases.relax.length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedPhaseFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedPhaseFilter === tab.key
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-sand-100 text-slate-700 hover:bg-sand-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Asana List by Phase */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(selectedPhaseFilter === 'all'
                  ? environmentData.allPoses
                  : environmentData.phases[selectedPhaseFilter]
                ).map(({ pose, phase, sets, hold_seconds, rest_seconds, tip }, idx) => (
                  <div
                    key={`${pose.id}-${idx}`}
                    className="p-4 rounded-2xl bg-white border border-sand-200 shadow-xs flex items-center gap-4 hover:shadow-soft transition"
                  >
                    <img
                      src={pose.image_url}
                      alt={pose.english_name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/poses/tadasana.jpg';
                      }}
                      className="w-16 h-16 rounded-xl object-cover border border-sand-200 flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            phase === 'warmup'
                              ? 'bg-amber-100 text-amber-900'
                              : phase === 'exercise'
                              ? 'bg-teal-100 text-teal-900'
                              : 'bg-indigo-100 text-indigo-900'
                          }`}
                        >
                          {phase}
                        </span>
                        <span className="font-serif font-bold text-slate-900 text-sm truncate">
                          {pose.hindi_name} ({pose.english_name})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold">
                          {sets} Sets
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-sand-100 text-slate-700 font-semibold">
                          {hold_seconds}s Hold
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-coral-50 text-coral-700 font-semibold">
                          {rest_seconds}s Rest
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 truncate">{tip}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchCamera(pose.id)}
                      className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition flex-shrink-0"
                      title="Practice with AI Camera"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-sand-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Profile registered under {profile.email || profile.phone}.
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                >
                  Done & Keep Environment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
