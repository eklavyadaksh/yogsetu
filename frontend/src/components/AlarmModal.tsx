import React, { useState } from 'react';
import { Bell, Volume2, X, Check } from 'lucide-react';

interface AlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Gentle singing bowl chime chord: 528Hz (Love/Healing freq) & 660Hz
    const now = ctx.currentTime;
    [528, 660, 792].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 2.6);
    });
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

export const AlarmModal: React.FC<AlarmModalProps> = ({ isOpen, onClose }) => {
  const [alarmTime, setAlarmTime] = useState(() => {
    return localStorage.getItem('yogsetu_alarm_time') || '07:30';
  });
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem('yogsetu_alarm_enabled') === 'true';
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('yogsetu_alarm_time', alarmTime);
    localStorage.setItem('yogsetu_alarm_enabled', enabled ? 'true' : 'false');
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-sand-200">
        <div className="flex items-center justify-between pb-4 border-b border-sand-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold text-slate-850">Daily Yoga Reminder</h3>
              <p className="text-xs text-slate-500">In-tab acoustic reminder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-sand-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-sand-50 rounded-2xl border border-sand-100">
            <div>
              <span className="text-sm font-semibold text-slate-800 block">Enable In-Tab Alarm</span>
              <span className="text-xs text-slate-500">Chimes gently while this tab is open</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Select Reminder Time
            </label>
            <input
              type="time"
              value={alarmTime}
              onChange={(e) => setAlarmTime(e.target.value)}
              className="w-full text-2xl font-serif font-bold text-teal-900 bg-teal-50/50 border border-teal-200 rounded-2xl p-4 text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="button"
            onClick={playChime}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-teal-700 bg-sand-100 hover:bg-sand-200 rounded-xl transition"
          >
            <Volume2 className="w-4 h-4" />
            Test Temple Bell Chime
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-sand-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition shadow-md flex items-center gap-1.5"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" /> Saved!
              </>
            ) : (
              'Save Reminder'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
