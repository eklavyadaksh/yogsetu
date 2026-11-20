import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { evaluatePose, PoseEvaluation } from '../lib/poseRules';
import { voiceCoach } from '../lib/speech';
import { SkeletonOverlay } from '../components/SkeletonOverlay';
import { AccuracyGauge } from '../components/AccuracyGauge';
import { getPoseName, getPoseSteps, getPoseSubtitle } from '../lib/poseI18n';
import { playChime } from '../components/AlarmModal';
import { getUserSchedule } from '../lib/userStorage';
import {
  recommendPosesForProfile,
  PhaseScheduleItem,
} from '../lib/posesData';
import {
  Volume2,
  VolumeX,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  FastForward,
  Sparkles,
  Trophy,
  Home,
  Pause,
  Play,
} from 'lucide-react';

export const WorkoutRunnerPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();

  // Load schedule strictly for this user
  const profile = getUserSchedule(user?.identifier);

  // Video & Landmarker refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Plan sequence
  const [sequence, setSequence] = useState<PhaseScheduleItem[]>([]);
  const [poseIndex, setPoseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);

  // States: 'prep' (3s) | 'active' | 'rest' (black screen) | 'completed'
  const [sessionState, setSessionState] = useState<'prep' | 'active' | 'rest' | 'completed'>('prep');
  const [prepCountdown, setPrepCountdown] = useState(3);
  const [holdTimer, setHoldTimer] = useState(0);
  const [restTimer, setRestTimer] = useState(15);
  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Session aggregate stats
  const [totalHoldAccumulated, setTotalHoldAccumulated] = useState(0);
  const [posesCompletedCount, setPosesCompletedCount] = useState(0);

  // MediaPipe pose tracking evaluation
  const [evaluation, setEvaluation] = useState<PoseEvaluation>({
    isCorrect: false,
    accuracy: 0,
    feedback: 'Step into frame and begin your posture.',
    primaryAngle: 0,
    angles: {},
  });
  const [landmarks, setLandmarks] = useState<any[] | null>(null);

  // Pain modal
  const [painModalOpen, setPainModalOpen] = useState(false);
  const [painNote, setPainNote] = useState('');

  // Refs for the tracking loop to always read latest values (avoids stale closures)
  const currentPoseIdRef = useRef<string>('tadasana');
  const languageRef = useRef(language);
  const sessionStateRef = useRef<string>(sessionState);

  // 1. Build routine sequence from user schedule
  useEffect(() => {
    const selectedInjury =
      profile?.injuries?.filter((i) => i !== 'None / Healthy').join(', ') || 'None';
    const plan = recommendPosesForProfile({
      designation: profile?.designation,
      injury: selectedInjury,
      minutesAvailable: profile?.minutesAvailable || 30,
    });

    if (plan.allPoses.length > 0) {
      setSequence(plan.allPoses);
      setPoseIndex(0);
      setCurrentSet(1);
      setSessionState('prep');
      setPrepCountdown(3);
      playChime();
    }
  }, [user?.identifier]);

  // Voice coach mute sync
  useEffect(() => {
    voiceCoach.setMuted(muted);
    return () => voiceCoach.stop();
  }, [muted]);

  const currentItem: PhaseScheduleItem | undefined = sequence[poseIndex];
  const targetHold = currentItem?.hold_seconds || 20;
  const totalSets = currentItem?.sets || 2;

  // Next item preview for rest screen
  const isLastSetOfPose = currentSet >= totalSets;
  const nextItem: PhaseScheduleItem | undefined = isLastSetOfPose
    ? sequence[poseIndex + 1]
    : currentItem;
  const nextSet = isLastSetOfPose ? 1 : currentSet + 1;

  // Keep tracking-loop refs in sync with React state (placed after currentItem is defined)
  useEffect(() => {
    currentPoseIdRef.current = currentItem?.pose.id || 'tadasana';
  }, [currentItem?.pose.id]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  // Reset evaluation when pose or set changes — camera must re-validate from scratch
  useEffect(() => {
    setEvaluation({
      isCorrect: false,
      accuracy: 0,
      feedback: language === 'en' ? 'Step into frame and begin your posture.'
        : language === 'hi' ? 'फ्रेम में आकर आसन शुरू करें।'
        : 'Frame mein aakar aasan shuru karein.',
      primaryAngle: 0,
      angles: {},
    });
  }, [poseIndex, currentSet]);

  // 2. Initialize Camera & MediaPipe
  useEffect(() => {
    let isMounted = true;

    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks('/wasm');
        if (!isMounted) return;

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          startCamera();
        }
      } catch {
        try {
          const vision = await FilesetResolver.forVisionTasks('/wasm');
          const landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/pose_landmarker_lite.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          });
          if (isMounted) {
            landmarkerRef.current = landmarker;
            startCamera();
          }
        } catch (err) {
          console.warn('MediaPipe fallback failed:', err);
        }
      }
    }

    initMediaPipe();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          startTrackingLoop();
        };
      }
    } catch (err) {
      console.warn('Webcam permission not granted:', err);
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const startTrackingLoop = () => {
    let lastVideoTime = -1;
    const render = () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (video && landmarker && video.readyState >= 2 && !video.paused) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const results = landmarker.detectForVideo(video, performance.now());

          if (results && results.landmarks && results.landmarks.length > 0) {
            const rawLandmarks = results.landmarks[0];
            setLandmarks(rawLandmarks);

            const activePoseId = currentPoseIdRef.current;
            const evalResult = evaluatePose(activePoseId, rawLandmarks, languageRef.current);
            setEvaluation(evalResult);

            if (evalResult.feedback && sessionStateRef.current === 'active') {
              voiceCoach.speak(evalResult.feedback);
            }
          } else {
            // Nobody detected in frame - immediately reset evaluation and halt timer
            setLandmarks(null);
            setEvaluation({
              isCorrect: false,
              accuracy: 0,
              feedback:
                languageRef.current === 'en'
                  ? 'Step into camera frame to begin posture.'
                  : languageRef.current === 'hi'
                  ? 'आसन शुरू करने के लिए कैमरे के सामने आएं।'
                  : 'Camera ke samne aakar frame mein aasan shuru karein.',
              primaryAngle: 0,
              angles: {},
            });
          }
        }
      }
      animFrameIdRef.current = requestAnimationFrame(render);
    };
    animFrameIdRef.current = requestAnimationFrame(render);
  };

  // 3. STEP A: 3-Second Preparation Countdown Timer
  useEffect(() => {
    if (sessionState !== 'prep' || isPaused) return;

    if (prepCountdown <= 1) {
      // Prep finished -> automatically start active exercise!
      setSessionState('active');
      setHoldTimer(0);
      playChime();
      if (currentItem) {
        const poseName = getPoseName(currentItem.pose, language);
        voiceCoach.speak(`Begin ${poseName}, set ${currentSet}.`);
      }
      return;
    }

    const timer = setTimeout(() => {
      setPrepCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [sessionState, prepCountdown, isPaused, currentItem, currentSet, language]);

  // 4. STEP B: Active Hold Timer Ticker
  useEffect(() => {
    if (sessionState !== 'active' || isPaused || !currentItem) return;

    // Advance hold timer
    const interval = setInterval(() => {
      // If camera supported, requires good posture or advances smoothly
      const shouldAdvance = currentItem.pose.camera_supported
        ? evaluation.isCorrect || evaluation.accuracy >= 65
        : true;

      if (shouldAdvance) {
        setHoldTimer((prev) => {
          const next = prev + 1;
          setTotalHoldAccumulated((t) => t + 1);

          if (next >= targetHold) {
            // SET COMPLETED! Automatically transition to Whole Black Rest Screen
            handleSetCompleted();
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState, isPaused, evaluation.isCorrect, evaluation.accuracy, currentItem, targetHold]);

  // Set Completed Handler -> Transitions to WHOLE BLACK SCREEN REST
  const handleSetCompleted = () => {
    playChime();
    setPosesCompletedCount((c) => c + 1);

    if (currentSet < totalSets) {
      // More sets remaining for this pose
      setRestTimer(currentItem?.rest_seconds || 20);
      setSessionState('rest');
      voiceCoach.speak('Set complete! Rest and breathe.');
    } else {
      // All sets done for this pose!
      if (poseIndex + 1 < sequence.length) {
        // Transition to next pose after break
        setRestTimer(25); // 25s break between different asanas
        setSessionState('rest');
        voiceCoach.speak('Pose complete! Relax your body.');
      } else {
        // Entire routine complete!
        handleRoutineFinished();
      }
    }
  };

  // 5. STEP C: Whole Jet-Black Screen Rest Timer
  useEffect(() => {
    if (sessionState !== 'rest' || isPaused) return;

    if (restTimer <= 1) {
      // Rest over! Automatically advance to next set or next pose with 3s prep!
      advanceAfterRest();
      return;
    }

    const interval = setInterval(() => {
      setRestTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState, restTimer, isPaused]);

  // Skip or auto-end rest
  const advanceAfterRest = () => {
    playChime();
    setHoldTimer(0);
    setEvaluation({
      isCorrect: false,
      accuracy: 0,
      feedback:
        language === 'en'
          ? 'Step into camera frame to begin posture.'
          : language === 'hi'
          ? 'आसन शुरू करने के लिए कैमरे के सामने आएं।'
          : 'Camera ke samne aakar frame mein aasan shuru karein.',
      primaryAngle: 0,
      angles: {},
    });

    if (currentSet < totalSets) {
      setCurrentSet((s) => s + 1);
      setPrepCountdown(3);
      setSessionState('prep');
    } else {
      if (poseIndex + 1 < sequence.length) {
        setPoseIndex((idx) => idx + 1);
        setCurrentSet(1);
        setPrepCountdown(3);
        setSessionState('prep');
      } else {
        handleRoutineFinished();
      }
    }
  };

  const handleSkipRest = () => {
    advanceAfterRest();
  };

  // Skip current pose manually if user wants
  const handleSkipPose = () => {
    playChime();
    setHoldTimer(0);
    setEvaluation({
      isCorrect: false,
      accuracy: 0,
      feedback:
        language === 'en'
          ? 'Step into camera frame to begin posture.'
          : language === 'hi'
          ? 'आसन शुरू करने के लिए कैमरे के सामने आएं।'
          : 'Camera ke samne aakar frame mein aasan shuru karein.',
      primaryAngle: 0,
      angles: {},
    });
    if (poseIndex + 1 < sequence.length) {
      setPoseIndex((idx) => idx + 1);
      setCurrentSet(1);
      setPrepCountdown(3);
      setSessionState('prep');
    } else {
      handleRoutineFinished();
    }
  };

  // Finish routine completely
  const handleRoutineFinished = async () => {
    setSessionState('completed');
    playChime();
    voiceCoach.speak('Congratulations! You have completed today\'s yoga session!');

    // Log complete session to backend if user is logged in
    if (user?.identifier) {
      try {
        await api.logSession({
          patient_identifier: user.identifier,
          assignment_id: null,
          date: new Date().toISOString().split('T')[0],
          pose_id: currentItem?.pose.id || 'routine_complete',
          status: 'done',
          best_angle: 90,
          hold_seconds: totalHoldAccumulated,
          note: `Daily routine completed (${profile?.minutesAvailable || 30} mins)`,
          source: 'self',
        });
      } catch (err) {
        console.warn('Session logging note:', err);
      }
    }
  };

  const handlePainStop = () => {
    setIsPaused(true);
    setPainModalOpen(true);
  };

  const handleSubmitPainReport = async () => {
    if (user?.identifier && currentItem) {
      try {
        await api.logSession({
          patient_identifier: user.identifier,
          assignment_id: null,
          date: new Date().toISOString().split('T')[0],
          pose_id: currentItem.pose.id,
          status: 'pain',
          best_angle: null,
          hold_seconds: holdTimer,
          note: painNote || 'Discomfort/pain experienced during pose hold.',
          source: 'self',
        });
      } catch {
        // ignore
      }
    }
    setPainModalOpen(false);
    navigate('/dashboard');
  };

  // If no poses in sequence, show loading or fallback
  if (sequence.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center p-6 text-center">
        <Sparkles className="w-12 h-12 text-teal-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold font-serif">Preparing Today's Yoga Routine...</h2>
        <p className="text-xs text-slate-400 mt-2">Setting up Warmup, Main Therapy, and Cool-down sequence.</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: SESSION COMPLETED CELEBRATION
  // =========================================================================
  if (sessionState === 'completed') {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0b0e14] flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in font-sans">
        <div className="max-w-md w-full bg-[#121926] border border-teal-500/40 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-teal-500/30">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
              Daily Goal Accomplished
            </span>
            <h2 className="text-3xl font-serif font-black text-white">
              Outstanding Practice!
            </h2>
            <p className="text-xs text-slate-400">
              You completed today's entire {profile?.minutesAvailable || 30}-minute therapeutic routine.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 py-2 border-y border-slate-800">
            <div className="p-3 rounded-2xl bg-slate-900/80">
              <span className="text-[10px] text-slate-400 block">Sets Completed</span>
              <span className="text-xl font-black text-teal-300">{posesCompletedCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80">
              <span className="text-[10px] text-slate-400 block">Total Hold</span>
              <span className="text-xl font-black text-teal-300">{totalHoldAccumulated}s</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80">
              <span className="text-[10px] text-slate-400 block">Est. Cal</span>
              <span className="text-xl font-black text-amber-300">~120</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 transition transform active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>Return to My Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ACTIVE WORKOUT WITH 3S PREP BUFFER & CAMERA
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* WHOLE JET-BLACK SCREEN REST INTERVAL OVERLAY (keeps camera mounted & streaming in background) */}
      {sessionState === 'rest' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-white text-center font-sans select-none animate-fade-in">
          {/* Subtle breathing relaxation ring */}
          <div className="relative mb-8 flex items-center justify-center">
            <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-teal-500/20 flex items-center justify-center animate-pulse-subtle">
              <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-teal-950/40 border border-teal-400/30 flex flex-col items-center justify-center shadow-2xl">
                <span className="text-xs text-teal-300 font-bold uppercase tracking-widest block">
                  Rest & Recover
                </span>
                <span className="text-6xl sm:text-7xl font-black font-sans tracking-tight text-white mt-1">
                  {restTimer}s
                </span>
                <span className="text-[11px] text-teal-200/80 mt-1">Deep slow breaths</span>
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white mb-2">
            Rest Break • Rejuvenate Your Spine
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed mb-6">
            Inhale deeply through your nose for 4 seconds, exhale and release all tension from your joints.
          </p>

          {/* Up Next Preview */}
          {nextItem && (
            <div className="mb-8 px-5 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 max-w-sm">
              <span className="text-teal-400 font-bold block mb-1">
                Next Asana Unlocks After Rest:
              </span>
              <span className="text-white font-bold text-sm">
                {nextItem ? getPoseName(nextItem.pose, language) : ''}
              </span>
              <span className="text-slate-400 text-xs ml-2">
                (Set {nextSet} of {nextItem.sets})
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSkipRest}
              className="px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm flex items-center gap-2 shadow-xl shadow-teal-600/30 transition transform active:scale-95 cursor-pointer"
            >
              <FastForward className="w-4 h-4" />
              <span>Skip Rest Time (I'm Ready)</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800"
            >
              End Workout
            </button>
          </div>
        </div>
      )}

      {/* 3-SECOND PREPARATION COUNTDOWN OVERLAY */}
      {sessionState === 'prep' && (
        <div className="fixed inset-0 z-[90] bg-slate-950/95 flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">
            Get Ready On Mat!
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white mb-2">
            {currentItem ? getPoseName(currentItem.pose, language) : ''}
          </h2>
          <span className="text-xs text-slate-400 mb-6 block">
            Phase: <strong className="text-teal-300 uppercase">{currentItem?.phase}</strong> • Set{' '}
            {currentSet} of {totalSets}
          </span>

          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-6xl sm:text-7xl font-black shadow-2xl shadow-teal-500/40 animate-ping-slow">
            {prepCountdown}
          </div>

          <p className="text-xs text-slate-400 mt-6">
            Position yourself in front of camera. Session begins in {prepCountdown}s...
          </p>
        </div>
      )}

      {/* PAIN MODAL */}
      {painModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121926] border border-coral-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 text-white">
            <div className="flex items-center gap-3 text-coral-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Safety Discomfort Check</h3>
            </div>
            <p className="text-xs text-slate-300">
              Yoga therapy should never cause sharp or pinching pain. Where did you feel discomfort?
            </p>
            <textarea
              value={painNote}
              onChange={(e) => setPainNote(e.target.value)}
              placeholder="e.g. Sharp pinch in right lower back, knee tenderness..."
              rows={3}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-xs text-white focus:outline-none focus:border-teal-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPainModalOpen(false);
                  setIsPaused(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel & Resume
              </button>
              <button
                type="button"
                onClick={handleSubmitPainReport}
                className="px-4 py-2 rounded-xl bg-coral-600 hover:bg-coral-500 text-white text-xs font-bold"
              >
                Save & Stop Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="border-b border-slate-800/80 bg-[#0c1017]/95 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Dashboard</span>
        </button>

        {/* Phase & Pose Progress Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-teal-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span>
              Pose {poseIndex + 1} of {sequence.length}
            </span>
            <span className="text-slate-400 font-normal">
              • {currentItem?.phase.toUpperCase()}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300">
            Set {currentSet} of {totalSets}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1"
            title={isPaused ? 'Resume Workout' : 'Pause Workout'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setMuted(!muted)}
            className="p-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"
            title={muted ? 'Unmute Hinglish coach' : 'Mute coach'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-coral-400" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
          </button>
        </div>
      </header>

      {/* MAIN WORKOUT VIEWPORT */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT 2 COLS: CAMERA & REAL-TIME SKELETON */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 aspect-4/3 flex items-center justify-center border border-slate-800 shadow-2xl">
            {currentItem?.pose.camera_supported ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <SkeletonOverlay
                  landmarks={landmarks}
                  width={640}
                  height={480}
                  isCorrect={evaluation.isCorrect}
                />

                {/* Accuracy Gauge Ring */}
                <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md rounded-2xl p-2.5 border border-slate-700 shadow-xl">
                  <AccuracyGauge accuracy={evaluation.accuracy} isCorrect={evaluation.isCorrect} />
                </div>

                {/* AI Camera Pill */}
                {cameraActive && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>AI Posture Tracking Active</span>
                  </div>
                )}

                {/* Live Hinglish/English Voice Feedback Banner */}
                <div className="absolute bottom-4 inset-x-4 flex justify-center">
                  <div
                    role="status"
                    aria-live="polite"
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold text-center shadow-2xl backdrop-blur-md transition-all max-w-md ${
                      evaluation.isCorrect
                        ? 'bg-emerald-950/90 text-emerald-100 border border-emerald-500/50'
                        : 'bg-amber-950/90 text-amber-100 border border-amber-500/50'
                    }`}
                  >
                    🗣️ {evaluation.feedback}
                  </div>
                </div>
              </>
            ) : (
              /* Non-Camera Pose Guide (e.g. Balasana, Shavasana) */
              <div className="p-8 text-center text-white space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-3xl bg-teal-800 text-teal-100 flex items-center justify-center mx-auto shadow-lg">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-black">{currentItem ? getPoseName(currentItem.pose, language) : ''}</h3>
                  <span className="text-teal-300 text-sm font-medium">{currentItem ? getPoseSubtitle(currentItem.pose, language) : ''}</span>
                </div>
                <div className="space-y-2 text-left bg-slate-800/80 p-4 rounded-2xl text-xs text-slate-200 border border-slate-700">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                    Execution Steps:
                  </span>
                  {getPoseSteps(currentItem?.pose, language).map((step, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {idx + 1}. {step}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS (Done / Skip / Pain Stopped) */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleSetCompleted}
              className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Done (Next)</span>
            </button>

            <button
              onClick={handleSkipPose}
              className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Skip Pose</span>
            </button>

            <button
              onClick={handlePainStop}
              className="py-3.5 px-4 rounded-2xl bg-coral-950/60 hover:bg-coral-900/80 border border-coral-700 text-coral-200 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-coral-400" />
              <span>Pain, I stopped</span>
            </button>
          </div>
        </div>

        {/* RIGHT COL: HOLD TELEMETRY & POSE DETAILS */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* HOLD PROGRESS CARD */}
            <div className="bg-[#121926] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 text-center">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="uppercase tracking-wider">Hold Duration</span>
                <span className="text-teal-400">
                  Set {currentSet} of {totalSets}
                </span>
              </div>

              <div className="py-2" role="status" aria-live="polite">
                <div className="text-6xl font-serif font-black text-white tracking-tight">
                  {holdTimer}
                  <span className="text-2xl font-sans text-slate-400 font-medium">/{targetHold}s</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-teal-300">
                  {evaluation.isCorrect ? '✅ Holding posture accurately' : 'Adjusting posture...'}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (holdTimer / targetHold) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* CLINICAL POSE REFERENCE CARD */}
            {currentItem && (
              <div className="bg-[#121926] rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-800">
                    Clinical Demo Guide
                  </span>
                  {currentItem.pose.target_angles_text && (
                    <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px]">
                      🎯 {currentItem.pose.target_angles_text.split('|')[0]}
                    </span>
                  )}
                </div>

                <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-slate-900 border border-slate-800">
                  <img
                    src={currentItem.pose.image_url || `/poses/${currentItem.pose.id}.jpg`}
                    alt={currentItem.pose.english_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/poses/tadasana.jpg';
                    }}
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-white font-medium flex items-center justify-between">
                    <span className="font-bold">{getPoseName(currentItem.pose, language)}</span>
                    <span className="text-teal-300 text-[11px]">{getPoseSubtitle(currentItem.pose, language)}</span>
                  </div>
                </div>

                {currentItem.pose.benefit_en && (
                  <div className="p-3 bg-teal-950/50 border border-teal-900/60 rounded-xl text-xs text-teal-200">
                    <span className="font-bold block text-[11px] text-teal-400 mb-0.5">
                      🩺 Therapeutic Benefit:
                    </span>
                    {currentItem.pose.benefit_en}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
