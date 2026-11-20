export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface Pose {
  id: string;
  hindi_name: string;
  english_name: string;
  hinglish_name: string;
  /** Hinglish steps (default) */
  how_to: string[];
  /** English steps */
  how_to_en: string[];
  /** Hindi steps */
  how_to_hi: string[];
  default_hold_seconds: number;
  camera_supported: boolean;
  angle_rules?: Record<string, any>;
  /** Hinglish caution (default) */
  caution: string;
  /** English caution */
  caution_en: string;
  /** Hindi caution */
  caution_hi: string;
  /** Reference pose demonstration photo URL */
  image_url?: string;
  /** Reference target angles description */
  target_angles_text?: string;
  /** Clinical/health benefits */
  benefit_en?: string;
  benefit_hi?: string;
}

export interface PlanItem {
  pose_id: string;
  hold_seconds: number;
  sets: number;
  days: string[];
  tip: string;
}

export interface PlanResponse {
  needs_doctor: boolean;
  summary: string;
  plan: PlanItem[];
  total_minutes: number;
  not_covered: string[];
  disclaimer: string;
}

export interface PatientSummaryItem {
  identifier: string;
  name: string;
  id_type: 'email' | 'phone';
  assignment_id: number;
  weeks: number;
  start_date: string;
  status: string;
  adherence_pct: number;
  last_active_date: string | null;
  has_pain_flag: boolean;
  total_sessions: number;
  done_count: number;
  skipped_count: number;
  pain_count: number;
}

export interface AssignmentItem {
  id: number;
  patient_identifier: string;
  doctor_identifier: string;
  doctor_name: string;
  start_date: string;
  weeks: number;
  weeks_left: number;
  status: string;
  plan: {
    needs_doctor?: boolean;
    summary?: string;
    plan: PlanItem[];
    total_minutes?: number;
    disclaimer?: string;
  };
}

export interface ReportData {
  patient: { identifier: string; name: string; id_type: string };
  doctor: { identifier: string; name: string };
  active_assignment: { id: number; start_date: string; weeks: number; status: string; plan: string } | null;
  streak_days: number;
  adherence_pct: number;
  days_grid: Array<{
    date: string;
    done_count: number;
    skipped_count: number;
    pain_count: number;
    poses: Array<{ pose_id: string; status: string; best_angle: number | null; hold_seconds: number; note: string | null }>;
  }>;
  angle_trends: Record<string, Array<{ date: string; best_angle: number }>>;
  pain_reports: string[];
  summary_text: string;
}

function getAuthHeaders(): HeadersInit {
  try {
    const raw = localStorage.getItem('yogsetu_auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        'X-Demo-Identity': parsed.identifier || '',
        'X-Demo-Role': parsed.role || 'user',
      };
    }
  } catch {
    // fallback
  }
  return {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  health: () => request<{ status: string; service: string; demo_mode: boolean }>('/api/health'),

  login: (body: { identifier: string; name?: string; role?: string }) =>
    request<{ identifier: string; name: string; role: string; id_type: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  getPoses: () => request<Pose[]>('/api/poses'),

  createSelfPlan: (body: { goal_or_concern: string; minutes_available: number; age_group: string }) =>
    request<PlanResponse>('/api/plan/self', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  createPlanFromNote: (formData: FormData) =>
    request<PlanResponse>('/api/plan/from-note', {
      method: 'POST',
      body: formData,
    }),

  createDoctorDraft: (formData: FormData) =>
    request<PlanResponse>('/api/doctor/plan-draft', {
      method: 'POST',
      body: formData,
    }),

  assignRoutine: (body: {
    patient_identifier: string;
    patient_name?: string;
    plan: PlanResponse | Record<string, unknown>;
    weeks: number;
  }) =>
    request<{ success: boolean; assignment_id: number; message: string }>('/api/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  getAssignments: (identifier: string) =>
    request<AssignmentItem[]>(`/api/assignments?identifier=${encodeURIComponent(identifier)}`),

  getDoctorPatients: (docId?: string) => {
    const query = docId ? `?doctor_identifier=${encodeURIComponent(docId)}` : '';
    return request<PatientSummaryItem[]>(`/api/doctor/patients${query}`);
  },

  logSession: (body: {
    patient_identifier: string;
    assignment_id?: number | null;
    date: string;
    pose_id: string;
    status: 'done' | 'skipped' | 'pain';
    best_angle?: number | null;
    hold_seconds: number;
    note?: string | null;
    source: 'doctor' | 'self';
  }) =>
    request<{ success: boolean; session_id: number; message: string }>('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  getPatientReport: (patientId: string, docId?: string, days: number = 14) => {
    const query = docId ? `&doctor_identifier=${encodeURIComponent(docId)}` : '';
    return request<ReportData>(`/api/report/${encodeURIComponent(patientId)}?days=${days}${query}`);
  },

  getSummary: (patientIdentifier: string, days: number = 14) =>
    request<{ summary: string }>('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_identifier: patientIdentifier, days }),
    }),

  resetSeed: () =>
    request<{ success: boolean; message: string }>('/api/seed/reset', {
      method: 'POST',
    }),
};
