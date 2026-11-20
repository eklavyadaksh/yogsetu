import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Pose, PlanItem } from '../api/client';
import { validateIdentifier } from '../lib/identity';
import {
  Upload,
  Sparkles,
  ListPlus,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const NewAssignmentPage: React.FC = () => {
  const navigate = useNavigate();

  // Step 1: Patient Details
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [weeks, setWeeks] = useState(2);

  // Mode Selection: 'photo' | 'prompt' | 'manual'
  const [creationMode, setCreationMode] = useState<'photo' | 'prompt' | 'manual'>('prompt');

  // Input states
  const [promptText, setPromptText] = useState('');
  const [minutesAvailable, setMinutesAvailable] = useState(15);
  const [ageGroup, setAgeGroup] = useState('adult');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Library & Draft Plan
  const [availablePoses, setAvailablePoses] = useState<Pose[]>([]);
  const [draftPlan, setDraftPlan] = useState<PlanItem[]>([]);
  const [draftSummary, setDraftSummary] = useState('');
  const [notCovered, setNotCovered] = useState<string[]>([]);
  const [needsDoctorAlert, setNeedsDoctorAlert] = useState<string | null>(null);

  const [loadingAi, setLoadingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPoses().then((poses) => {
      setAvailablePoses(poses);
      // Pre-populate manual with 2 default poses
      if (draftPlan.length === 0 && poses.length >= 2) {
        setDraftPlan([
          { pose_id: 'tadasana', hold_seconds: 25, sets: 2, days: [...DAYS_OF_WEEK], tip: 'Keep spine straight' },
          { pose_id: 'marjaryasana_bitilasana', hold_seconds: 30, sets: 2, days: [...DAYS_OF_WEEK], tip: 'Gentle spinal wave' },
        ]);
      }
    });
  }, []);

  const handleGenerateFromText = async () => {
    if (!promptText.trim()) {
      setError('Please enter a clinical goal or concern.');
      return;
    }
    setError(null);
    setLoadingAi(true);
    setNeedsDoctorAlert(null);
    try {
      const resp = await api.createSelfPlan({
        goal_or_concern: promptText,
        minutes_available: minutesAvailable,
        age_group: ageGroup,
      });

      if (resp.needs_doctor) {
        setNeedsDoctorAlert(resp.summary);
      } else {
        setDraftPlan(resp.plan);
        setDraftSummary(resp.summary);
        setNotCovered(resp.not_covered);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate plan.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGenerateFromPhoto = async () => {
    if (!selectedFile) {
      setError('Please select a photo of the prescription or exercise sheet.');
      return;
    }
    setError(null);
    setLoadingAi(true);
    setNeedsDoctorAlert(null);
    try {
      const formData = new FormData();
      formData.append('note_image', selectedFile);
      formData.append('minutes_available', String(minutesAvailable));
      formData.append('age_group', ageGroup);

      const resp = await api.createPlanFromNote(formData);
      if (resp.needs_doctor) {
        setNeedsDoctorAlert(resp.summary);
      } else {
        setDraftPlan(resp.plan);
        setDraftSummary(resp.summary);
        setNotCovered(resp.not_covered);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to parse prescription image.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAddPose = (poseId: string) => {
    if (draftPlan.some((p) => p.pose_id === poseId)) return;
    const poseObj = availablePoses.find((p) => p.id === poseId);
    setDraftPlan([
      ...draftPlan,
      {
        pose_id: poseId,
        hold_seconds: poseObj?.default_hold_seconds || 25,
        sets: 2,
        days: [...DAYS_OF_WEEK],
        tip: poseObj?.how_to[0] || 'Gentle hold',
      },
    ]);
  };

  const handleRemovePose = (index: number) => {
    setDraftPlan(draftPlan.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, field: keyof PlanItem, value: PlanItem[keyof PlanItem]) => {
    const updated = [...draftPlan];
    updated[index] = { ...updated[index], [field]: value };
    setDraftPlan(updated);
  };

  const toggleDay = (index: number, day: string) => {
    const item = draftPlan[index];
    const exists = item.days.includes(day);
    const newDays = exists ? item.days.filter((d) => d !== day) : [...item.days, day];
    handleUpdateItem(index, 'days', newDays);
  };

  const handleAssign = async () => {
    setError(null);
    if (!patientId.trim() || !validateIdentifier(patientId)) {
      setError('Please provide a valid patient Gmail or phone number.');
      return;
    }
    if (draftPlan.length === 0) {
      setError('Please include at least one pose in the routine.');
      return;
    }

    setSubmitting(true);
    try {
      await api.assignRoutine({
        patient_identifier: patientId.trim(),
        patient_name: patientName.trim() || undefined,
        plan: {
          needs_doctor: false,
          summary: draftSummary || 'Prescribed home therapeutic routine.',
          plan: draftPlan,
          total_minutes: minutesAvailable,
          disclaimer: 'Yeh doctor ki salah nahi hai. Dard ho to rukein.',
        },
        weeks: weeks,
      });

      alert(`Routine assigned successfully to ${patientName || patientId}!`);
      navigate('/doctor');
    } catch (err: any) {
      setError(err?.message || 'Failed to assign routine.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/doctor')}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-sand-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-850">
            Create Patient Assignment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Nothing reaches the patient until you review and click Assign.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-coral-600 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Patient Identifier Form */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-soft space-y-4">
        <h2 className="text-lg font-serif font-bold text-slate-850 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs flex items-center justify-center font-sans">
            1
          </span>
          Patient Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Patient Gmail or Phone Number *
            </label>
            <input
              type="text"
              placeholder="e.g., patient@gmail.com or 9876543210"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 text-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Duration (Weeks)
            </label>
            <select
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-sand-200 text-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {[1, 2, 3, 4, 6, 8].map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? 'Week' : 'Weeks'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Patient Full Name <span className="font-normal text-slate-400">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Rajesh Sharma"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-sand-200 text-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Routine Source Selector */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-soft space-y-6">
        <h2 className="text-lg font-serif font-bold text-slate-850 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs flex items-center justify-center font-sans">
            2
          </span>
          Choose How to Build Routine
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setCreationMode('prompt')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              creationMode === 'prompt'
                ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/30'
                : 'border-sand-200 hover:border-sand-300'
            }`}
          >
            <Sparkles className="w-5 h-5 text-teal-700 mb-2" />
            <div className="font-bold text-slate-850 text-xs">Type Clinical Goal</div>
            <div className="text-[11px] text-slate-500">Gemma drafts plan</div>
          </button>

          <button
            type="button"
            onClick={() => setCreationMode('photo')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              creationMode === 'photo'
                ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/30'
                : 'border-sand-200 hover:border-sand-300'
            }`}
          >
            <Upload className="w-5 h-5 text-teal-700 mb-2" />
            <div className="font-bold text-slate-850 text-xs">Prescription Photo</div>
            <div className="text-[11px] text-slate-500">Gemma OCR & mapping</div>
          </button>

          <button
            type="button"
            onClick={() => setCreationMode('manual')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              creationMode === 'manual'
                ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/30'
                : 'border-sand-200 hover:border-sand-300'
            }`}
          >
            <ListPlus className="w-5 h-5 text-teal-700 mb-2" />
            <div className="font-bold text-slate-850 text-xs">Pick Manually</div>
            <div className="text-[11px] text-slate-500">From pose library</div>
          </button>
        </div>

        {/* Prompt Input Form */}
        {creationMode === 'prompt' && (
          <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Clinical Goal / Diagnosis Note
            </label>
            <textarea
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g., Posture correction and spinal decompression for lumbar stiffness, 15 min morning holds..."
              className="w-full p-3 rounded-xl border border-sand-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Minutes</label>
                <select
                  value={minutesAvailable}
                  onChange={(e) => setMinutesAvailable(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-sand-200 text-xs bg-white text-slate-850"
                >
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={20}>20 Minutes</option>
                  <option value={30}>30 Minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Patient Age Group</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-sand-200 text-xs bg-white text-slate-850"
                >
                  <option value="adult">Adult (18-59)</option>
                  <option value="senior">Senior (60+)</option>
                  <option value="child">Child (Under 18)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Picks only clinically verified poses from the library.
              </span>
              <button
                type="button"
                onClick={handleGenerateFromText}
                disabled={loadingAi}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loadingAi ? 'Gemma drafting...' : 'Draft with Gemma 4'}
              </button>
            </div>
          </div>
        )}

        {/* Photo Upload Form */}
        {creationMode === 'photo' && (
          <div className="p-5 rounded-2xl bg-sand-50 border border-dashed border-sand-300 space-y-3 text-center">
            <input
              type="file"
              accept="image/*"
              id="prescription-file"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="prescription-file"
              className="cursor-pointer inline-flex flex-col items-center justify-center p-4"
            >
              <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-850">
                {selectedFile ? selectedFile.name : 'Click to upload prescription or exercise note photo'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, or WEBP (Max 6MB)</span>
            </label>

            {selectedFile && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateFromPhoto}
                  disabled={loadingAi}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 mx-auto disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loadingAi ? 'Analyzing image...' : 'Read Note & Draft Plan'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Pose Picker */}
        {creationMode === 'manual' && (
          <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 space-y-3">
            <label className="block text-xs font-bold text-slate-700">Add Pose from Library</label>
            <div className="flex flex-wrap gap-2">
              {availablePoses.map((p) => {
                const isAdded = draftPlan.some((d) => d.pose_id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddPose(p.id)}
                    disabled={isAdded}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                      isAdded
                        ? 'bg-sand-200 text-slate-400 border-sand-300'
                        : 'bg-white text-slate-700 border-sand-300 hover:border-teal-500'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    {p.english_name} ({p.hindi_name})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {needsDoctorAlert && (
        <div className="p-5 rounded-2xl bg-coral-50 border border-coral-200 text-coral-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs text-coral-700">
            <AlertCircle className="w-4 h-4 text-coral-600" />
            Safety Alert
          </div>
          <p className="text-xs leading-relaxed">{needsDoctorAlert}</p>
        </div>
      )}

      {/* Step 3: Doctor Plan Customizer & Final Review */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-soft space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-sand-100">
          <h2 className="text-lg font-serif font-bold text-slate-850 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs flex items-center justify-center font-sans">
              3
            </span>
            Review & Fine-Tune Routine ({draftPlan.length} Poses)
          </h2>
          <span className="text-xs text-slate-500 font-medium">Doctor Confirmation Required</span>
        </div>

        {draftSummary && (
          <p className="text-xs text-slate-600 bg-sand-50 p-3 rounded-xl border border-sand-100">
            <strong>Gemma Draft Summary:</strong> {draftSummary}
          </p>
        )}

        {notCovered.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
            ⚠️ <strong>Excluded Items (Not in Pose Library):</strong> {notCovered.join(', ')}
          </div>
        )}

        {draftPlan.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No poses added yet. Use Gemma AI or manual picker above.
          </div>
        ) : (
          <div className="space-y-4">
            {draftPlan.map((item, idx) => {
              const poseObj = availablePoses.find((p) => p.id === item.pose_id);
              return (
                <div
                  key={`${item.pose_id}-${idx}`}
                  className="p-4 rounded-2xl border border-sand-200 bg-white space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-850">
                        {poseObj?.english_name || item.pose_id}
                      </h4>
                      <span className="text-xs text-teal-700 font-medium">
                        {poseObj?.hindi_name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePose(idx)}
                      className="p-1.5 text-slate-400 hover:text-coral-600 rounded-lg transition"
                      title="Remove pose"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">
                        Hold (Seconds)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={item.hold_seconds}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'hold_seconds', Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-sand-200 text-slate-850"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Sets</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={item.sets}
                        onChange={(e) => handleUpdateItem(idx, 'sets', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-sand-200 text-slate-850"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-slate-500 font-medium mb-1">Doctor Tip</label>
                      <input
                        type="text"
                        value={item.tip}
                        onChange={(e) => handleUpdateItem(idx, 'tip', e.target.value)}
                        placeholder="Clinical cue for patient..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-sand-200 text-slate-850 text-xs"
                      />
                    </div>
                  </div>

                  {/* Day Toggles */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">
                      Days of Week:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {DAYS_OF_WEEK.map((day) => {
                        const active = item.days.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(idx, day)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                              active
                                ? 'bg-teal-700 text-white'
                                : 'bg-sand-100 text-slate-600 hover:bg-sand-200'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-sand-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/doctor')}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-sand-100 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAssign}
            disabled={submitting || draftPlan.length === 0}
            className="px-8 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Assigning...' : 'Assign to Patient'}
          </button>
        </div>
      </div>
    </div>
  );
};
