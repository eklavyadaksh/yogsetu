import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ReportData } from '../api/client';
import { Activity, Flame } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const ProgressPage: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    // Fetch report data for this user
    api
      .getPatientReport(user.identifier)
      .then(setReport)
      .catch((err) => console.error('Failed to load progress data:', err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-slate-400">
        Loading personal progress charts...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-soft space-y-2">
        <h1 className="text-3xl font-serif font-black text-slate-850">
          Your Progress & Telemetry
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Tracking consistency, hold duration, and joint angles across your sessions.
        </p>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface rounded-2xl p-5 border border-sand-200 shadow-soft text-center space-y-1">
              <span className="text-3xl font-serif font-black text-teal-900 block">
                {report.adherence_pct}%
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Consistency
              </span>
            </div>

            <div className="bg-surface rounded-2xl p-5 border border-sand-200 shadow-soft text-center space-y-1">
              <span className="text-3xl font-serif font-black text-amber-700 block flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 text-amber-500 inline" />
                {report.streak_days}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Day Streak
              </span>
            </div>

            <div className="bg-surface rounded-2xl p-5 border border-sand-200 shadow-soft text-center space-y-1">
              <span className="text-3xl font-serif font-black text-emerald-800 block">
                {report.days_grid.reduce((acc, d) => acc + d.done_count, 0)}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Sessions Completed
              </span>
            </div>

            <div className="bg-surface rounded-2xl p-5 border border-sand-200 shadow-soft text-center space-y-1">
              <span className="text-3xl font-serif font-black text-coral-700 block">
                {report.days_grid.reduce((acc, d) => acc + d.pain_count, 0)}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Pain Pauses
              </span>
            </div>
          </div>

          {/* Angle Trends */}
          {Object.keys(report.angle_trends).length > 0 && (
            <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-soft space-y-4">
              <h2 className="text-lg font-serif font-bold text-slate-850 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-700" />
                Posture Angle Progress (Camera Poses)
              </h2>

              <div className="space-y-6">
                {Object.entries(report.angle_trends).map(([poseId, dataPoints]) => (
                  <div key={poseId} className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      {poseId.replace('_', ' ')} Joint Angle
                    </span>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dataPoints}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#64748B' }}
                            tickFormatter={(d) => d.slice(5)}
                          />
                          <YAxis domain={[150, 185]} tick={{ fontSize: 10, fill: '#64748B' }} unit="°" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderRadius: '12px',
                              fontSize: '11px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="best_angle"
                            name="Joint Angle"
                            stroke="#0D5C58"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#0D5C58' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
