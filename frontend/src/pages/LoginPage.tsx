import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { normalizeIdentifier, validateIdentifier } from '../lib/identity';
import {
  Stethoscope,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  Activity,
  HeartHandshake,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'user' | 'doctor'>('user');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEmail = identifier.includes('@');
  const isPhone = !isEmail && /^\+?[0-9\s-]{4,}$/.test(identifier.trim());
  const detectedLabel = isEmail
    ? 'Gmail / Email'
    : isPhone
    ? 'Phone Number'
    : identifier.trim()
    ? 'Identifier'
    : 'Required';

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your Gmail address or phone number to sign in.');
      return;
    }

    if (!validateIdentifier(identifier)) {
      setError('Please enter a valid email address (e.g. name@gmail.com) or phone number (e.g. 9876543210).');
      return;
    }

    setLoading(true);
    try {
      const { canonical } = normalizeIdentifier(identifier);
      login({
        identifier: canonical,
        name: displayName.trim() || undefined,
        role,
      });

      if (role === 'doctor') {
        navigate('/doctor');
      } else {
        // Check if patient has any active assignment from a doctor
        try {
          const assignments = await api.getAssignments(canonical);
          if (assignments && assignments.length > 0) {
            navigate('/assigned');
            return;
          }
        } catch {
          // fallback to dashboard/home
        }
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (
    demoId: string,
    demoName: string,
    demoRole: 'user' | 'doctor'
  ) => {
    setIdentifier(demoId);
    setDisplayName(demoName);
    setRole(demoRole);
    login({ identifier: demoId, name: demoName, role: demoRole });

    if (demoRole === 'doctor') {
      navigate('/doctor');
    } else {
      setLoading(true);
      try {
        const assigns = await api.getAssignments(demoId);
        setLoading(false);
        if (assigns && assigns.length > 0) {
          navigate('/assigned');
        } else {
          navigate('/dashboard');
        }
      } catch {
        setLoading(false);
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-[#0b0e14] text-slate-850 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans transition-colors relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent blur-3xl rounded-full pointer-events-none -z-10"></div>

      {/* Top back navigation */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-serif font-black text-slate-850 dark:text-white">
            YogSetu • योगसेतु
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Main Card */}
        <div className="bg-white dark:bg-[#121926] rounded-3xl p-6 sm:p-8 border border-sand-200 dark:border-slate-800 shadow-2xl space-y-6 relative">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-teal-500" />
              <span>Personalized Therapy & Doctor Bridge</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-slate-900 dark:text-white">
              Sign In to Your Sanctuary
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Use your Gmail or mobile number. Your routines, AI posture history, and therapist notes are synced to your identifier.
            </p>
          </div>

          {/* Role Selection Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Select Account Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                  role === 'user'
                    ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/60 ring-2 ring-teal-500/30 shadow-sm'
                    : 'border-sand-200 dark:border-slate-800 hover:border-sand-300 dark:hover:border-slate-700 bg-sand-50/50 dark:bg-slate-900/40'
                }`}
              >
                {role === 'user' && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-teal-500"></span>
                )}
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 flex items-center justify-center mb-2.5 shadow-xs">
                  <User className="w-5 h-5" />
                </div>
                <div className="font-serif font-bold text-slate-900 dark:text-white text-sm">
                  Normal User / Patient
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Guided daily yoga, camera AI tracking & personal routines
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('doctor')}
                className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                  role === 'doctor'
                    ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/60 ring-2 ring-teal-500/30 shadow-sm'
                    : 'border-sand-200 dark:border-slate-800 hover:border-sand-300 dark:hover:border-slate-700 bg-sand-50/50 dark:bg-slate-900/40'
                }`}
              >
                {role === 'doctor' && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-teal-500"></span>
                )}
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 flex items-center justify-center mb-2.5 shadow-xs">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div className="font-serif font-bold text-slate-900 dark:text-white text-sm">
                  Doctor / PT
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Assign asanas to patients & monitor adherence & pain flags
                </div>
              </button>
            </div>
          </div>

          {/* Doctor Callout Banner */}
          {role === 'doctor' && (
            <div className="p-3.5 rounded-2xl bg-teal-950/40 border border-teal-800/80 text-teal-200 text-xs flex items-center gap-2.5 animate-fade-in">
              <HeartHandshake className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>
                <strong>Clinical Doctor Access:</strong> You will access the clinical dashboard to prescribe tailored poses and review patient posture history.
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-identifier-input" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  {isPhone ? <Phone className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" /> : <Mail className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />}
                  <span>Gmail or Phone Number</span>
                </label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isEmail || isPhone
                      ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                      : 'bg-sand-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {detectedLabel}
                </span>
              </div>
              <input
                id="login-identifier-input"
                type="text"
                aria-required="true"
                placeholder="e.g. priya@gmail.com or 9876543210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-sand-200 dark:border-slate-700 bg-sand-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-xs"
              />
            </div>

            <div>
              <label htmlFor="login-displayname-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                Display Name <span className="font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
              </label>
              <input
                id="login-displayname-input"
                type="text"
                placeholder={role === 'doctor' ? 'e.g. Dr. Aarav Mehta' : 'e.g. Priya Sharma'}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-sand-200 dark:border-slate-700 bg-sand-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-xs"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-coral-50 dark:bg-coral-950/60 border border-coral-200 dark:border-coral-800 text-coral-700 dark:text-coral-300 text-xs font-semibold animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm shadow-xl shadow-teal-700/25 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Entering Sanctuary...</span>
              ) : (
                <>
                  <span>{role === 'doctor' ? 'Enter Doctor Portal' : 'Continue to My Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Accounts */}
          <div className="pt-4 border-t border-sand-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>1-Click Demo Accounts</span>
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                Pre-seeded data
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('demo@yogsetu.test', 'Dr. Aarav Mehta (PT)', 'doctor')}
                className="p-3 text-left rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800/80 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-900 dark:text-teal-200 text-xs block">
                    🩺 Dr. Demo (PT)
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-200 dark:bg-teal-800 text-teal-900 dark:text-teal-100 font-bold uppercase">
                    Doctor
                  </span>
                </div>
                <span className="text-teal-700 dark:text-teal-400 text-[11px] block mt-0.5">
                  demo@yogsetu.test
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                  Assign poses & monitor 4 patients
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('priya.sharma@example.com', 'Priya Sharma', 'user')}
                className="p-3 text-left rounded-2xl bg-sand-100/70 dark:bg-slate-900/60 hover:bg-sand-200 dark:hover:bg-slate-800 border border-sand-200 dark:border-slate-800 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                    👤 Priya Sharma
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold uppercase">
                    Patient
                  </span>
                </div>
                <span className="text-slate-600 dark:text-slate-400 text-[11px] block mt-0.5">
                  priya.sharma@example.com
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                  Active knee rehab assignment
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('9876543210', 'Rajesh Patel', 'user')}
                className="p-3 text-left rounded-2xl bg-sand-100/70 dark:bg-slate-900/60 hover:bg-sand-200 dark:hover:bg-slate-800 border border-sand-200 dark:border-slate-800 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                    📱 Rajesh Patel
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold uppercase">
                    Phone User
                  </span>
                </div>
                <span className="text-slate-600 dark:text-slate-400 text-[11px] block mt-0.5">
                  +91 98765 43210
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                  14-day tracking history preseeded
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ananya@example.com', 'Ananya Verma', 'user')}
                className="p-3 text-left rounded-2xl bg-sand-100/70 dark:bg-slate-900/60 hover:bg-sand-200 dark:hover:bg-slate-800 border border-sand-200 dark:border-slate-800 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                    🧘 Ananya Verma
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold uppercase">
                    Self Plan
                  </span>
                </div>
                <span className="text-slate-600 dark:text-slate-400 text-[11px] block mt-0.5">
                  ananya@example.com
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                  Independent desk relief routine
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Prototype trust notice */}
        <div className="flex items-center justify-center gap-2 text-center text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Demo Presentation Prototype • Instant 1-click access without password requirements</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 dark:text-slate-500 py-2">
        YogSetu • Therapeutic Yoga Bridge connecting patients, doctors, and real-time AI computer vision.
      </footer>
    </div>
  );
};
