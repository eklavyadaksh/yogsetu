import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ReportData } from '../api/client';
import {
  ArrowLeft,
  Printer,
  Share2,
  Copy,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  Activity,
  Calendar,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const PatientReportPage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!identifier) return;
    setLoading(true);
    api
      .getPatientReport(identifier)
      .then((data) => setReport(data))
      .catch((err) => console.error('Failed to load patient report:', err))
      .finally(() => setLoading(false));
  }, [identifier]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    if (!report?.summary_text) return;
    navigator.clipboard.writeText(
      `YogSetu Clinical Summary for ${report.patient.name} (${report.patient.identifier}):\n${report.summary_text}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!report) return;
    const phone = report.patient.identifier.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Namaste ${report.patient.name},\nHere is your YogSetu 14-day yoga adherence summary:\n\n${report.summary_text}\n\n- Dr. Aarav Mehta (PT)`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-xs text-slate-400">
        Loading 14-day telemetry and AI clinical report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-sm text-slate-600 font-bold">Report not found.</p>
        <button
          onClick={() => navigate('/doctor')}
          className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isPhone = report.patient.id_type === 'phone' || /^\d+$/.test(report.patient.identifier);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar / Print Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-sand-200 no-print">
        <button
          onClick={() => navigate('/doctor')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patient Roster
        </button>

        <div className="flex items-center gap-2">
          {isPhone ? (
            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              Send on WhatsApp
            </button>
          ) : (
            <button
              onClick={handleCopySummary}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-sand-200 text-slate-700 text-xs font-semibold border border-sand-300 transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Summary'}
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Clinical Header */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sand-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200 mb-2">
              <Activity className="w-3 h-3 text-teal-600" />
              Verified Home Telemetry
            </div>
            <h1 className="text-3xl font-serif font-black text-slate-850">
              {report.patient.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ID: {report.patient.identifier} • Prescribed by {report.doctor.name}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2.5 rounded-2xl bg-teal-50 border border-teal-200">
              <span className="text-2xl font-bold font-serif text-teal-900 block leading-none">
                {report.adherence_pct}%
              </span>
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                14-Day Adherence
              </span>
            </div>

            <div className="text-center px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-2xl font-bold font-serif text-amber-900 block leading-none flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 text-amber-600 inline" />
                {report.streak_days}
              </span>
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Day Streak
              </span>
            </div>
          </div>
        </div>

        {/* Gemma 4 Factual AI Clinical Summary */}
        <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider">
              Gemma 4 Clinical Telemetry Summary
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
            {report.summary_text}
          </p>
          <span className="text-[10px] text-slate-400 block pt-1">
            * Strictly synthesized from recorded session logs. No unverified clinical assertions made.
          </span>
        </div>

        {/* Red Flag Pain Reports */}
        {report.pain_reports && report.pain_reports.length > 0 && (
          <div className="p-5 rounded-2xl bg-coral-50 border border-coral-200 space-y-2">
            <div className="flex items-center gap-2 text-coral-800 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-coral-600" />
              Patient Pain Occurrences ({report.pain_reports.length})
            </div>
            <ul className="space-y-1.5 text-xs text-coral-900 list-disc list-inside">
              {report.pain_reports.map((note, idx) => (
                <li key={idx} className="leading-relaxed">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 14-Day Status Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-700" />
            14-Day Calendar Compliance Grid
          </h3>
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
            {report.days_grid.map((day) => {
              const dateObj = new Date(day.date);
              const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
              const isPain = day.pain_count > 0;
              const isDone = day.done_count > 0 && !isPain;
              const isSkipped = day.skipped_count > 0;

              return (
                <div
                  key={day.date}
                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-between min-h-[64px] ${
                    isPain
                      ? 'bg-coral-50 border-coral-300 text-coral-800'
                      : isDone
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : isSkipped
                      ? 'bg-slate-100 border-slate-300 text-slate-500'
                      : 'bg-sand-50 border-sand-200 text-slate-400'
                  }`}
                  title={`${day.date}: ${isPain ? 'Pain Reported' : isDone ? 'Done' : isSkipped ? 'Skipped' : 'No Log'}`}
                >
                  <span className="text-[10px] font-semibold block">{label}</span>
                  {isPain ? (
                    <AlertTriangle className="w-4 h-4 text-coral-600" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isSkipped ? (
                    <XCircle className="w-4 h-4 text-slate-400" />
                  ) : (
                    <span className="text-[10px] text-slate-400">-</span>
                  )}
                  <span className="text-[9px] font-bold">
                    {isPain ? 'Pain' : isDone ? 'Done' : isSkipped ? 'Skip' : 'Off'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Angle-Over-Time Chart for Camera Poses */}
        <div className="pt-4 border-t border-sand-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-700" />
            Postural Alignment Trends (Camera Verified Angles)
          </h3>

          {Object.keys(report.angle_trends).length === 0 ? (
            <p className="text-xs text-slate-400 p-6 bg-sand-50 rounded-2xl text-center">
              No camera sessions with joint angle tracking recorded yet.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(report.angle_trends).map(([poseId, dataPoints]) => (
                <div
                  key={poseId}
                  className="p-5 rounded-2xl bg-sand-50/70 border border-sand-200 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-850 capitalize">
                      {poseId.replace('_', ' ')} Joint Angle History
                    </span>
                    <span className="text-slate-500">Target Range: 165° - 180° (Straight Alignment)</span>
                  </div>

                  <div className="h-48 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dataPoints}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          tickFormatter={(d) => d.slice(5)}
                        />
                        <YAxis
                          domain={[140, 185]}
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          unit="°"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            border: '1px solid #CBD5E1',
                            fontSize: '11px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="best_angle"
                          name="Best Angle"
                          stroke="#0D5C58"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#0D5C58' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
