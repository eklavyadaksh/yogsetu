import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, PatientSummaryItem } from '../api/client';
import {
  Users,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';

export const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await api.getDoctorPatients(user?.identifier);
      setPatients(data);
    } catch (e: any) {
      console.error('Failed to load doctor patients:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [user?.identifier]);

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all demo sessions and restore 14-day preseeded history?')) return;
    try {
      setResetting(true);
      await api.resetSeed();
      setMessage('Demo database successfully reset and re-seeded!');
      setTimeout(() => setMessage(null), 3500);
      await fetchPatients();
    } catch (err: any) {
      alert('Reset failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-soft">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <span>Clinical Rehabilitation Portal</span>
          </div>
          <h1 className="text-3xl font-serif font-black text-slate-850">
            Welcome, {user?.name || 'Doctor'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitoring home adherence, angle improvements, and pain flags across assigned patients.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleResetDemo}
            disabled={resetting}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-sand-300 hover:bg-sand-100 text-xs font-semibold text-slate-600 transition flex items-center justify-center gap-1.5"
            title="Restore default 14-day demo patients and logs"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Resetting...' : 'Reset Demo Data'}
          </button>

          <Link
            to="/doctor/assign"
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-md transition flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            New Assignment
          </Link>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {message}
        </div>
      )}

      {/* Patient List Card */}
      <div className="bg-surface rounded-3xl border border-sand-200 shadow-soft overflow-hidden">
        <div className="p-6 border-b border-sand-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-teal-700" />
            <h2 className="text-xl font-serif font-bold text-slate-850">
              Assigned Patients ({patients.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Last 14-day telemetry</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading clinical records...</div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-sand-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-700">No patients assigned yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Create your first routine from a prescription note or custom goals to begin tracking home rehabilitation.
              </p>
            </div>
            <Link
              to="/doctor/assign"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold"
            >
              <PlusCircle className="w-4 h-4" /> Create First Assignment
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-sand-100">
            {patients.map((p) => (
              <div
                key={p.identifier}
                onClick={() => navigate(`/doctor/report/${encodeURIComponent(p.identifier)}`)}
                className="p-5 hover:bg-sand-50/60 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Patient identity */}
                <div className="flex items-center gap-4 min-w-[240px]">
                  <div className="w-11 h-11 rounded-2xl bg-teal-100/70 text-teal-800 flex items-center justify-center font-serif font-bold text-lg flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-serif font-bold text-slate-850">
                        {p.name}
                      </span>
                      {p.has_pain_flag && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-coral-100 text-coral-700 border border-coral-200 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-coral-600" />
                          Pain Report
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 block">
                      {p.id_type === 'email' ? '✉️' : '📞'} {p.identifier}
                    </span>
                  </div>
                </div>

                {/* Adherence metrics */}
                <div className="flex items-center gap-6 text-xs text-slate-600 w-full sm:w-auto justify-between sm:justify-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      14-Day Adherence
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-16 h-2 rounded-full bg-sand-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            p.adherence_pct >= 75
                              ? 'bg-emerald-500'
                              : p.adherence_pct >= 50
                              ? 'bg-amber-500'
                              : 'bg-coral-500'
                          }`}
                          style={{ width: `${p.adherence_pct}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-850">{p.adherence_pct}%</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Last Active
                    </span>
                    <span className="font-medium text-slate-850 mt-0.5 block">
                      {p.last_active_date || 'No sessions yet'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Sessions
                    </span>
                    <span className="font-medium text-slate-850 mt-0.5 block">
                      {p.done_count} done / {p.skipped_count} skipped
                    </span>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-400 hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
