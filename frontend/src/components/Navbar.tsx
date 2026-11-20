import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../i18n';
import { AlarmModal, playChime } from './AlarmModal';
import {
  Bell,
  LogOut,
  Stethoscope,
  UserCheck,
  Globe,
  Activity,
  ChevronDown,
  Sun,
  Moon,
  LayoutDashboard,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [alarmOpen, setAlarmOpen] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

  // Sync alarm status
  useEffect(() => {
    const isEnabled = localStorage.getItem('yogsetu_alarm_enabled') === 'true';
    setAlarmEnabled(isEnabled);
  }, [alarmOpen]);

  // Click outside listener for language dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // In-page Alarm ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const enabled = localStorage.getItem('yogsetu_alarm_enabled') === 'true';
      const targetTime = localStorage.getItem('yogsetu_alarm_time');
      if (enabled && targetTime) {
        const now = new Date();
        const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const hasChimedMinute = sessionStorage.getItem('yogsetu_chimed_minute');
        if (currentHHMM === targetTime && hasChimedMinute !== currentHHMM) {
          sessionStorage.setItem('yogsetu_chimed_minute', currentHHMM);
          playChime();
          // System notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 YogSetu Daily Reminder', {
              body: 'Time for your guided therapeutic yoga routine!',
              icon: '/favicon.ico',
            });
          }
          alert('🔔 YogSetu Daily Reminder: Time for your guided yoga routine!');
        }
      }
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const languageLabels: Record<Language, string> = {
    hinglish: 'Hinglish',
    hi: 'हिंदी',
    en: 'English',
  };

  const isDashboardActive = location.pathname === '/dashboard';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c1017]/95 backdrop-blur-md border-b border-sand-200 dark:border-slate-800 text-slate-850 dark:text-slate-100 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-600 group-hover:from-teal-600 group-hover:to-emerald-500 text-white flex items-center justify-center transition shadow-md shadow-teal-900/30">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-serif font-black tracking-tight text-slate-900 dark:text-white block leading-tight">
                  YogSetu
                </span>
                <span className="text-[10px] font-sans font-medium text-teal-700 dark:text-teal-400 uppercase tracking-widest block -mt-0.5">
                  योगसेतु Bridge
                </span>
              </div>
            </Link>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* My Dashboard Direct Access Button */}
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                isDashboardActive
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/80'
              }`}
              title="Open My Routine Dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>My Dashboard</span>
            </Link>

            {/* Theme Toggle Button (Dark / Light) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-sand-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-sand-100 dark:hover:bg-slate-700 transition"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-teal-700" />
              )}
            </button>

            {/* Sleek Single Language Selector with Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-sand-100 dark:bg-slate-800 hover:bg-sand-200 dark:hover:bg-slate-700 border border-sand-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                title="Change Language"
                aria-label="Change Language"
                aria-expanded={langMenuOpen}
              >
                <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="hidden sm:inline">{languageLabels[language]}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-2xl bg-white dark:bg-slate-900 border border-sand-200 dark:border-slate-700 shadow-2xl py-1.5 z-50 backdrop-blur-lg animate-fade-in text-slate-850 dark:text-slate-100">
                  {(['hinglish', 'hi', 'en'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLanguage(lang);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-medium transition flex items-center justify-between ${
                        language === lang
                          ? 'bg-teal-700 text-white font-bold'
                          : 'hover:bg-sand-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{languageLabels[lang]}</span>
                      {language === lang && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Daily In-tab Alarm Button */}
            <button
              onClick={() => setAlarmOpen(true)}
              title={t.navAlarm}
              aria-label={t.navAlarm || "Daily Reminder Alarm"}
              className={`p-2 rounded-xl border transition relative ${
                alarmEnabled
                  ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700/80 hover:bg-teal-100 dark:hover:bg-teal-900/80'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-sand-100 dark:hover:bg-slate-800 border-transparent hover:border-sand-200 dark:hover:border-slate-700'
              }`}
            >
              <Bell className="w-4 h-4" />
              {alarmEnabled && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              )}
            </button>

            {/* Role Badge and User info */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-sand-200 dark:border-slate-800">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {user.identifier}
                  </span>
                </div>

                <Link
                  to={user.role === 'doctor' ? '/doctor' : '/dashboard'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    user.role === 'doctor'
                      ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900 transition'
                      : 'bg-sand-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border-sand-200 dark:border-slate-700 hover:bg-sand-200 dark:hover:bg-slate-700 transition'
                  }`}
                  title={user.role === 'doctor' ? 'Open Doctor Portal' : 'Open My Dashboard'}
                >
                  {user.role === 'doctor' ? (
                    <>
                      <Stethoscope className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      Doctor
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Patient
                    </>
                  )}
                </Link>

                <button
                  onClick={handleLogout}
                  title="Sign Out (Return to Landing Page)"
                  aria-label="Sign Out"
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-sand-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl transition shadow-md flex items-center gap-1.5"
              >
                <span>Sign In / Join</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <AlarmModal isOpen={alarmOpen} onClose={() => setAlarmOpen(false)} />
    </>
  );
};
