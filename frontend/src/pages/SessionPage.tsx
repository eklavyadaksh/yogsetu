import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { api, Pose } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { evaluatePose, PoseEvaluation } from '../lib/poseRules';
import { voiceCoach } from '../lib/speech';
import { SkeletonOverlay } from '../components/SkeletonOverlay';
import { AccuracyGauge } from '../components/AccuracyGauge';
import { getPoseCaution, getPoseName, getPoseSteps, getPoseSubtitle } from '../lib/poseI18n';
import { getPoseById } from '../lib/posesData';
import {
  Volume2,
  VolumeX,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Bug,
} from 'lucide-react';

export const SessionPage: React.FC = () => {
  const { poseId } = useParams<{ poseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const assignmentId = searchParams.get('assignmentId')
    ? Number(searchParams.get('assignmentId'))
    : null;
  const source = (searchParams.get('source') as 'doctor' | 'self') || 'self';
  const isDebug = searchParams.get('debug') === '1';

  const [pose, setPose] = useState<Pose | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [muted, setMuted] = useState(false);

  // Video & Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Pose evaluation states
  const [evaluation, setEvaluation] = useState<PoseEvaluation>({
    isCorrect: false,
    accuracy: 0,
    feedback: language === 'hi'
      ? 'फ्रेम में आकर आसन शुरू करें।'
      : language === 'en'
      ? 'Step into frame and begin the pose.'
      : 'Frame mein khade hokar aasan shuru karein.',
    primaryAngle: 0,
    angles: {},
  });
  const [landmarks, setLandmarks] = useState<any[] | null>(null);
  const [bestAngle, setBestAngle] = useState<number | null>(null);

  // Hold Timer and Sets
  const targetHold = pose?.default_hold_seconds || 20;
  const [holdTimer, setHoldTimer] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const totalSets = 2;
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(10);

  // Pain Modal State
  const [painModalOpen, setPainModalOpen] = useState(false);
  const [painNote, setPainNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load pose details with immediate offline fallback
  useEffect(() => {
    api
      .getPoses()
      .then((poses) => {
        const found = poses.find((p) => p.id === poseId);
        if (found) {
          setPose(found);
        } else {
          setPose(getPoseById(poseId || 'tadasana'));
        }
        setLoading(false);
      })
      .catch(() => {
        setPose(getPoseById(poseId || 'tadasana'));
        setLoading(false);
      });
  }, [poseId]);

  // Voice coach sync
  useEffect(() => {
    voiceCoach.setMuted(muted);
    return () => {
      voiceCoach.stop();
    };
  }, [muted]);

  // Initialize MediaPipe PoseLandmarker if camera supported
  useEffect(() => {
    if (!pose || !pose.camera_supported) return;

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
      } catch (e) {
        console.warn('Failed to load GPU MediaPipe, falling back to CPU:', e);
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
        } catch (cpuError) {
          console.error('MediaPipe initialization completely failed:', cpuError);
        }
      }
    }

    initMediaPipe();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [pose]);

  // Start webcam
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
      console.warn('Webcam permission not granted or camera not found:', err);
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

  // Video processing loop
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

            const evalResult = evaluatePose(pose?.id || '', rawLandmarks, language);
            setEvaluation(evalResult);

            if (evalResult.isCorrect) {
              setBestAngle((prev) =>
                prev === null ? evalResult.primaryAngle : Math.max(prev, evalResult.primaryAngle)
              );
            }

            // Speak feedback correction (debounced)
            if (evalResult.feedback) {
              voiceCoach.speak(evalResult.feedback);
            }
          } else {
            // Nobody in frame
            setLandmarks(null);
            setEvaluation({
              isCorrect: false,
              accuracy: 0,
              feedback:
                language === 'en'
                  ? 'Step into frame and begin the pose.'
                  : language === 'hi'
                  ? 'फ्रेम में आकर आसन शुरू करें।'
                  : 'Frame mein khade hokar aasan shuru karein.',
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

  // Timer Ticker: runs ONLY when evaluation.isCorrect is true for camera poses!
  useEffect(() => {
    if (isResting) {
      const restInterval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            setHoldTimer(0);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(restInterval);
    }

    const interval = setInterval(() => {
      // For camera poses, hold timer advances only while posture is correct!
      // For non-camera poses (e.g. Balasana), timer advances continuously.
      const shouldTick = pose?.camera_supported ? evaluation.isCorrect : true;

      if (shouldTick) {
        setHoldTimer((prev) => {
          const next = prev + 1;
          if (next >= targetHold) {
            voiceCoach.speak('Set complete! Aaram karein.');
            if (currentSet < totalSets) {
              setIsResting(true);
              setCurrentSet((s) => s + 1);
            }
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [evaluation.isCorrect, isResting, targetHold, currentSet, pose?.camera_supported]);

  const handleFinishSession = async (status: 'done' | 'skipped' | 'pain', note?: string) => {
    if (!user) {
      navigate('/');
      return;
    }
    setSubmitting(true);
    try {
      await api.logSession({
        patient_identifier: user.identifier,
        assignment_id: assignmentId,
        date: new Date().toISOString().split('T')[0],
        pose_id: pose?.id || 'tadasana',
        status: status,
        best_angle: bestAngle,
        hold_seconds: holdTimer,
        note: note || null,
        source: source,
      });

      if (source === 'doctor') {
        navigate('/assigned');
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      alert('Failed to log session: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePainStop = () => {
    setPainModalOpen(true);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-slate-400">
        {language === 'hi' ? 'आसन गाइड लोड हो रहा है...' : language === 'en' ? 'Loading posture guide...' : 'Aasan guide load ho raha hai...'}
      </div>
    );
  }

  if (!pose) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-sm font-bold text-slate-700">
          {language === 'hi' ? 'आसन नहीं मिला।' : language === 'en' ? 'Pose not found.' : 'Aasan nahi mila.'}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-teal-700 text-white rounded-xl text-xs"
        >
          {language === 'hi' ? 'वापस जाएं' : language === 'en' ? 'Go Back' : 'Wapas Jayein'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'hi' ? 'सेशन समाप्त करें' : language === 'en' ? 'End Session' : 'Session Khatam Karein'}
        </button>

        <div className="flex items-center gap-2">
          {isDebug && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-amber-100 text-amber-900 rounded-lg">
              <Bug className="w-3 h-3" /> DEBUG MODE
            </span>
          )}

          <button
            onClick={() => setMuted(!muted)}
            className="p-2 rounded-xl border border-sand-200 text-slate-600 hover:bg-sand-100 transition"
            title={muted ? 'Unmute Hinglish voice coach' : 'Mute voice coach'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-coral-600" /> : <Volume2 className="w-4 h-4 text-teal-700" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Session Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Camera / Skeleton Display */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 aspect-4/3 flex items-center justify-center shadow-xl border border-sand-200">
            {pose.camera_supported ? (
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

                {/* Overlaid Accuracy Ring */}
                <div className="absolute top-4 right-4 bg-slate-900/70 backdrop-blur-md rounded-2xl p-2.5 border border-slate-700 shadow-md">
                  <AccuracyGauge accuracy={evaluation.accuracy} isCorrect={evaluation.isCorrect} />
                </div>

                {/* Live Hinglish Voice Feedback Pill */}
                <div className="absolute bottom-4 inset-x-4 flex justify-center">
                  <div
                    role="status"
                    aria-live="polite"
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold text-center shadow-lg backdrop-blur-md transition-all ${
                      evaluation.isCorrect
                        ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-500/50'
                        : 'bg-amber-900/90 text-amber-100 border border-amber-500/50'
                    }`}
                  >
                    🗣️ {evaluation.feedback}
                  </div>
                </div>

                {cameraActive && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    AI Camera Active
                  </div>
                )}

                {/* Raw Debug Overlay (?debug=1) */}
                {isDebug && evaluation.rawDebug && (
                  <div className="absolute top-4 left-4 p-3 bg-black/85 text-[10px] text-green-400 font-mono rounded-xl border border-green-500/30 max-w-[200px]">
                    <div>Pose: {pose.id}</div>
                    <div>Accuracy: {evaluation.accuracy}%</div>
                    {Object.entries(evaluation.rawDebug).map(([k, v]) => (
                      <div key={k}>
                        {k}: {typeof v === 'number' ? v.toFixed(1) : String(v)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Non-Camera Pose Visual Guide */
              <div className="p-8 text-center text-white space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-3xl bg-teal-800 text-sand-100 flex items-center justify-center mx-auto shadow-lg">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold">{getPoseName(pose, language)}</h3>
                  <span className="text-teal-300 text-sm font-medium">{getPoseSubtitle(pose, language)}</span>
                </div>
                <div className="space-y-2 text-left bg-slate-800/80 p-4 rounded-2xl text-xs text-slate-200 border border-slate-700">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                    {language === 'hi' ? 'कैसे करें (Steps):' : language === 'en' ? 'How to do (Steps):' : 'Kaise Karein (Steps):'}
                  </span>
                  {getPoseSteps(pose, language).map((step, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {idx + 1}. {step}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Done / Skip / Pain Stopped */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleFinishSession('done')}
              disabled={submitting}
              className="py-3.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t.markDone}
            </button>

            <button
              onClick={() => handleFinishSession('skipped')}
              disabled={submitting}
              className="py-3.5 px-4 rounded-2xl bg-sand-200 hover:bg-sand-300 text-slate-700 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              {t.skipPose}
            </button>

            <button
              onClick={handlePainStop}
              disabled={submitting}
              className="py-3.5 px-4 rounded-2xl bg-coral-50 hover:bg-coral-100 border border-coral-300 text-coral-800 font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <AlertTriangle className="w-4 h-4 text-coral-600" />
              {t.painStopped}
            </button>
          </div>
        </div>

        {/* Right Column: Telemetry & Pose Guide */}
        <div className="space-y-4">
          {/* Clinical Demonstration Reference Photo */}
          <div className="bg-surface rounded-3xl p-5 border border-sand-200 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
                📸 {language === 'hi' ? 'क्लिनिकल प्रदर्शन गाइड' : 'Clinical Pose Guide'}
              </span>
              {pose.target_angles_text && (
                <span className="text-[10px] font-semibold text-slate-500">
                  🎯 {pose.target_angles_text.split('|')[0]}
                </span>
              )}
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-slate-100 border border-sand-200 shadow-xs">
              <img
                src={pose.image_url || `/poses/${pose.id}.jpg`}
                alt={getPoseName(pose, language)}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/poses/tadasana.jpg';
                }}
              />
              <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] text-white font-medium flex items-center justify-between">
                <span>{getPoseName(pose, language)}</span>
                <span className="text-teal-300 text-[10px]">{getPoseSubtitle(pose, language)}</span>
              </div>
            </div>

            {(pose.benefit_en || pose.benefit_hi) && (
              <div className="p-3 bg-teal-50/80 border border-teal-200/70 rounded-xl text-xs text-teal-950">
                <span className="font-bold block text-[11px] text-teal-800 mb-0.5">
                  🩺 {language === 'hi' ? 'चिकित्सीय लाभ:' : 'Clinical Benefit:'}
                </span>
                {language === 'hi' ? (pose.benefit_hi || pose.benefit_en) : (pose.benefit_en || pose.benefit_hi)}
              </div>
            )}
          </div>

          {/* Hold Timer Card */}
          <div className="bg-surface rounded-3xl p-6 border border-sand-200 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {language === 'hi' ? 'होल्ड प्रगति' : language === 'en' ? 'Hold Progress' : 'Hold Progress'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">
                {language === 'hi' ? `सेट ${currentSet} / ${totalSets}` : language === 'en' ? `Set ${currentSet} of ${totalSets}` : `Set ${currentSet} of ${totalSets}`}
              </span>
            </div>

            <div className="text-center py-2" role="status" aria-live="polite">
              <div className="text-5xl font-serif font-black text-slate-850 tracking-tight">
                {isResting ? restTimer : holdTimer}
                <span className="text-xl font-sans text-slate-400 font-medium">/{targetHold}s</span>
              </div>
              <span className="text-xs font-medium text-slate-500 mt-1 block">
                {isResting
                  ? language === 'hi' ? '🛌 आराम करें... अगला सेट शुरू होगा' : language === 'en' ? '🛌 Rest timer... Next set starting' : '🛌 Rest timer... Agla set shuru ho raha hai'
                  : pose.camera_supported
                  ? evaluation.isCorrect
                    ? language === 'hi' ? '🟢 सही आसन! टाइमर चल रहा है' : language === 'en' ? '🟢 Correct pose! Timer running' : '🟢 Sahi aasan! Timer chal raha hai'
                    : language === 'hi' ? '🟡 आसन सुधारें, टाइमर चलाने के लिए' : language === 'en' ? '🟡 Adjust posture to run timer' : '🟡 Aasan theek karein, timer chalane ke liye'
                  : language === 'hi' ? 'आसन आराम से पकड़े हुए हैं' : language === 'en' ? 'Holding pose comfortably' : 'Aasan aaram se pakde hue hain'}
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-sand-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isResting ? 'bg-amber-500' : 'bg-teal-600'
                }`}
                style={{ width: `${Math.min(100, (holdTimer / targetHold) * 100)}%` }}
              />
            </div>
          </div>

          {/* Pose Steps & Caution Card */}
          <div className="bg-surface rounded-3xl p-6 border border-sand-200 shadow-soft space-y-3">
            <h3 className="text-base font-serif font-bold text-slate-850">
              {getPoseName(pose, language)}
              <span className="text-sm font-sans font-normal text-slate-500 ml-2">{getPoseSubtitle(pose, language)}</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-600">
              <span className="font-bold text-slate-700 block">
                {language === 'hi' ? 'कैसे करें:' : language === 'en' ? 'How to do:' : 'Kaise Karein:'}
              </span>
              <ul className="space-y-1.5 list-disc list-inside">
                {getPoseSteps(pose, language).map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {getPoseCaution(pose, language) && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{getPoseCaution(pose, language)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pain Confirmation Modal */}
      {painModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-coral-200 space-y-4">
            <div className="flex items-center gap-3 text-coral-700 font-serif font-bold text-xl">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              {language === 'hi' ? 'दर्द रिपोर्ट करें और रुकें' : language === 'en' ? 'Report Pain & Stop' : 'Dard Report Karein & Rukein'}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'hi'
                ? 'दर्द होने पर तुरंत आसन रोकना सही फैसला है। यह जानकारी आपके डॉक्टर की रिपोर्ट में लाल निशान के साथ दर्ज होगी।'
                : language === 'en'
                ? "Stopping when in pain is the right decision. This will be flagged as a red alert in your doctor's report."
                : 'Dard hone par turant aasan rokna bilkul sahi faisla hai. Yeh jaankari aapke doctor ki report mein laal nishaan ke saath darj ki jayegi.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'hi'
                  ? 'कृपया दर्द का स्थान या कैसा महसूस हुआ लिखें:'
                  : language === 'en'
                  ? 'Describe where and how the pain felt:'
                  : 'Kripya dard ka sthan ya kaisa mehsoos hua likhein:'}
              </label>
              <textarea
                rows={3}
                value={painNote}
                onChange={(e) => setPainNote(e.target.value)}
                placeholder={
                  language === 'hi'
                    ? 'जैसे: बाएं घुटने में अचानक तेज खिंचाव महसूस हुआ...'
                    : language === 'en'
                    ? 'e.g., Sudden sharp pull felt in left knee...'
                    : 'e.g., Baayein ghutne mein achanak tez khinchaav mehsoos hua...'
                }
                className="w-full p-3 rounded-xl border border-sand-200 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPainModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-sand-100 rounded-xl"
              >
                {language === 'hi' ? 'रद्द करें' : language === 'en' ? 'Cancel' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleFinishSession('pain', painNote)}
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-coral-600 hover:bg-coral-700 rounded-xl transition shadow-md"
              >
                {language === 'hi' ? 'दर्द दर्ज करें और समाप्त करें' : language === 'en' ? 'Log Pain & End' : 'Dard Log Karein & Khatam Karein'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

