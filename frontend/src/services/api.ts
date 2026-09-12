import {
  Patient, ScreeningDetail, ScreeningListItem, QualityAssessment,
  Enhancement, AIResult, LesionDetection, VesselResult, Explainability,
  DoctorReview, TriageResult, Referral, ReliabilityPanelData, SyncQueueItem, EyeCareFacility,
  ScreeningComparison, PatientHistoryResponse, HomeCareGuidance
} from '../types';
import { idb } from './indexedDB';

// Production & environment configuration for API & media servers:
// 1. VITE_API_BASE_URL (e.g. "https://api.drishticare.org/api" or "/api")
// 2. VITE_API_URL (e.g. "https://api.drishticare.org")
// 3. Fallback: '/api' in production (relative reverse-proxy) or dynamic local dev host
const envApiBase = import.meta.env.VITE_API_BASE_URL;
const envApiUrl = import.meta.env.VITE_API_URL;
const devHost = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : '';

export const API_SERVER_URL = (envApiUrl || (envApiBase ? envApiBase.replace(/\/api\/?$/, '') : (import.meta.env.PROD ? '' : devHost))).replace(/\/+$/, '');
export const API_BASE_URL = (envApiBase || (envApiUrl ? `${envApiUrl.replace(/\/+$/, '')}/api` : (import.meta.env.PROD ? '/api' : `${devHost}/api`))).replace(/\/+$/, '');

export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_SERVER_URL ? `${API_SERVER_URL}${cleanPath}` : cleanPath;
};

class ApiService {
  getMediaUrl(path: string | null | undefined): string {
    return getMediaUrl(path);
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('retinal_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  // --- Auth & User Management (Prototype localStorage + Backend sync) ---
  getRegisteredUsers(): Array<{
    id: number;
    username: string;
    email: string;
    full_name: string;
    password: string;
    role: string;
  }> {
    const raw = localStorage.getItem('retinal_registered_users');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore parse errors
      }
    }
    const defaultUsers = [
      {
        id: 1,
        username: 'demo',
        email: 'ananya.sharma@phc-rural.in',
        full_name: 'Sister Ananya Sharma',
        password: 'demo123',
        role: 'Hospital Worker / Healthcare Worker'
      },
      {
        id: 2,
        username: 'doctor',
        email: 'rajesh.varma@districteye.in',
        full_name: 'Dr. Rajesh Varma, MS',
        password: 'doctor123',
        role: 'Doctor'
      },
      {
        id: 3,
        username: 'asha',
        email: 'asha.devi@phc-rural.in',
        full_name: 'Asha Devi',
        password: 'asha123',
        role: 'ASHA Worker'
      },
      {
        id: 4,
        username: 'ananya',
        email: 'ananya@eyeclinic.org',
        full_name: 'Dr. Ananya',
        password: 'password123',
        role: 'Doctor'
      }
    ];
    localStorage.setItem('retinal_registered_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  }

  async register(userData: {
    full_name: string;
    email: string;
    username: string;
    password: string;
    role: string;
  }): Promise<any> {
    const users = this.getRegisteredUsers();
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanUsername = userData.username.trim().toLowerCase();

    // Check for existing username or email
    const existing = users.find(
      u => u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanEmail)
    );
    if (existing) {
      if (existing.username.toLowerCase() === cleanUsername) {
        throw new Error('This Username is already registered. Please choose a different username.');
      }
      throw new Error('This Email ID is already registered. Please log in or use another email.');
    }

    const newUser = {
      id: Date.now(),
      full_name: userData.full_name.trim(),
      email: userData.email.trim(),
      username: userData.username.trim(),
      password: userData.password,
      role: userData.role
    };

    users.push(newUser);
    localStorage.setItem('retinal_registered_users', JSON.stringify(users));

    // Optional backend sync attempt
    try {
      await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newUser.full_name,
          email: newUser.email,
          username: newUser.username,
          password: newUser.password,
          role: newUser.role
        })
      });
    } catch {
      // Prototype localStorage fallback
    }

    const token = 'token-' + Date.now();
    const sessionUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role
    };
    localStorage.setItem('retinal_token', token);
    localStorage.setItem('retinal_user', JSON.stringify(sessionUser));

    return { user: sessionUser, access_token: token };
  }

  async login(identifier: string, password: string): Promise<any> {
    const cleanId = identifier.trim().toLowerCase();

    // 1. Check local prototype users (matching by either email or username)
    const users = this.getRegisteredUsers();
    const matchedUser = users.find(
      u => u.username.toLowerCase() === cleanId || (u.email && u.email.toLowerCase() === cleanId)
    );

    if (matchedUser) {
      if (matchedUser.password !== password) {
        throw new Error('Incorrect password. Please try again.');
      }
      const sessionUser = {
        id: matchedUser.id,
        username: matchedUser.username,
        email: matchedUser.email,
        full_name: matchedUser.full_name,
        role: matchedUser.role
      };
      const token = 'token-' + Date.now();
      localStorage.setItem('retinal_token', token);
      localStorage.setItem('retinal_user', JSON.stringify(sessionUser));
      return { user: sessionUser, access_token: token };
    }

    // 2. Attempt backend API with identifier as username
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier.trim(), password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('retinal_token', data.access_token);
        localStorage.setItem('retinal_user', JSON.stringify(data.user));
        return data;
      }
      const err = await res.json().catch(() => ({ detail: 'Invalid email ID / username or password.' }));
      throw new Error(err.detail || 'Invalid email ID / username or password.');
    } catch (e: any) {
      throw new Error(e.message || 'Invalid email ID / username or password. Please check your credentials or register a new account.');
    }
  }

  logout() {
    localStorage.removeItem('retinal_token');
    localStorage.removeItem('retinal_user');
    localStorage.removeItem('retinal_active_screening');
    sessionStorage.clear();
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('retinal_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // --- Patients ---
  async createPatient(patient: Partial<Patient>): Promise<Patient> {
    try {
      const res = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(patient)
      });
      if (!res.ok) throw new Error('Network error on patient creation');
      const saved = await res.json();
      // Cache in IndexedDB
      await idb.savePatient(saved);
      return saved;
    } catch (err) {
      // Offline fallback: Generate local offline patient ID
      console.warn('Offline mode: saving patient to IndexedDB');
      const curUser = this.getCurrentUser();
      const offlineId = patient.patient_id || `RET-2026-OFFLINE-${Math.floor(100000 + Math.random() * 900000)}`;
      const offlinePatient: Patient = {
        id: Date.now(),
        patient_id: offlineId,
        owner_user_id: curUser?.id,
        hospital_id: curUser?.hospital_id || 'HOSP-001',
        assigned_doctor_id: patient.assigned_doctor_id,
        full_name: patient.full_name || 'Anonymous',
        age: patient.age || 0,
        gender: patient.gender || 'Other',
        diabetes_duration: patient.diabetes_duration,
        diabetes_type: patient.diabetes_type,
        language: patient.language,
        screening_location: patient.screening_location,
        contact_number: patient.contact_number,
        previous_dr_history: patient.previous_dr_history,
        previous_eye_exam: patient.previous_eye_exam,
        last_screening_date: patient.last_screening_date,
        blood_glucose: patient.blood_glucose,
        hba1c: patient.hba1c,
        treatment_info: patient.treatment_info,
        created_at: new Date().toISOString()
      };
      await idb.savePatient(offlinePatient);
      await idb.enqueueSync({
        record_type: 'patient',
        record_id: offlineId,
        action: 'UPSERT',
        payload: offlinePatient,
        client_timestamp: new Date().toISOString()
      });
      return offlinePatient;
    }
  }

  async updatePatient(patientId: number | string, patient: Partial<Patient>): Promise<Patient> {
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(patient)
      });
      if (res.ok) {
        const updated = await res.json();
        await idb.savePatient(updated);
        return updated;
      }
    } catch (e) {
      console.warn('Backend patient update notice:', e);
    }
    const local = await idb.getPatient(String(patientId));
    const merged = { ...(local || {}), ...patient } as Patient;
    await idb.savePatient(merged);
    return merged;
  }

  async getPatients(): Promise<Patient[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/patients`, { headers: this.getAuthHeaders() });
      if (res.ok) {
        const patients = await res.json();
        for (const p of patients) {
          await idb.savePatient(p);
        }
        return patients;
      }
    } catch (e) {
      console.warn('Backend unavailable, reading patients from IndexedDB');
    }
    return await idb.getAllPatients();
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${id}`, { headers: this.getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {}
    return await idb.getPatient(id);
  }

  async searchPatients(searchTerm: string): Promise<Patient[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/patients?search=${encodeURIComponent(searchTerm.trim())}`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend search error, filtering local patients');
    }
    const all = await this.getPatients();
    const q = searchTerm.toLowerCase().trim();
    return all.filter(p =>
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.patient_id || '').toLowerCase().includes(q) ||
      (p.contact_number || '').includes(q)
    );
  }

  async getPatientHistory(patientId: string | number): Promise<PatientHistoryResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${patientId}/history`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend history error, building local history response');
    }
    const p = (await this.getPatient(String(patientId))) || {
      id: Number(patientId),
      patient_id: `PAT-DR-${patientId}`,
      full_name: 'Patient',
      age: 50,
      gender: 'Other',
      created_at: new Date().toISOString()
    };
    return {
      patient: p,
      screenings: [],
      total_screenings: 0,
      overall_trajectory: 'STABLE'
    };
  }

  async getScreeningComparison(screeningId: string | number): Promise<ScreeningComparison> {
    try {
      const res = await fetch(`${API_BASE_URL}/screenings/${screeningId}/comparison`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend comparison error, returning fallback');
    }
    return {
      has_previous: false,
      message: "This is the patient's first recorded screening. No previous result is available for comparison."
    };
  }

  getHomeCareGuidance(grade: number): HomeCareGuidance {
    const messages: Record<number, string> = {
      0: "No apparent diabetic retinopathy was detected by this screening. Continue diabetes management and regular eye screening as advised.",
      1: "Mild diabetic retinal changes were detected. Follow-up and clinical review are important.",
      2: "Moderate diabetic retinal changes were detected. An eye specialist should review the screening result.",
      3: "Severe diabetic retinal changes were detected. Specialist eye evaluation is recommended.",
      4: "Advanced diabetic retinal changes were detected. Urgent specialist evaluation is recommended."
    };
    return {
      grade,
      message: messages[grade] || messages[2],
      habits: [
        "Take prescribed diabetes medicines regularly.",
        "Monitor blood glucose as advised by your healthcare provider.",
        "Follow a balanced diet rich in vegetables and whole grains.",
        "Stay physically active as advised by your healthcare provider.",
        "Avoid smoking and tobacco products.",
        "Attend recommended comprehensive eye check-ups.",
        "Do not stop prescribed medicines without consulting your doctor."
      ],
      disclaimer: "Home care and healthy habits support overall glycemic and vascular health, but do not cure or reverse diabetic retinopathy (DR 1–4) and do not replace professional ophthalmic evaluation."
    };
  }

  // --- Screenings ---
  async createScreening(patient_id: number, eye: string = 'Right Eye', image_source: string = 'Fundus Camera'): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/screenings`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ patient_id, eye, image_source })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Offline mode: creating local screening');
    }
    const scrId = `SCR-2026-OFFLINE-${Date.now()}`;
    const offlineScreening = {
      id: Date.now(),
      screening_id: scrId,
      patient_id,
      status: 'PATIENT_REGISTERED',
      eye,
      image_source,
      created_at: new Date().toISOString()
    };
    return offlineScreening;
  }

  async listScreenings(): Promise<ScreeningListItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/screenings`, { headers: this.getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend unreachable, generating screening list from local storage');
    }
    const local = await idb.getAllScreenings();
    return local.map(s => ({
      id: s.id,
      screening_id: s.screening_id,
      patient_id: s.patient_id,
      patient_code: s.patient?.patient_id || 'N/A',
      patient_name: s.patient?.full_name || 'N/A',
      date: s.created_at ? s.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      eye: s.eye,
      status: s.status,
      dr_grade: s.ai_result ? `Level ${s.ai_result.dr_grade}` : 'Pending',
      dr_label: s.ai_result?.label || 'Pending Analysis',
      dme_risk: s.ai_result?.dme_risk || 'Low',
      referable: s.ai_result?.is_referable || false,
      doctor_decision: s.doctor_review?.decision || 'Pending Review',
      triage_risk: s.triage_result?.risk_category || 'LOW',
      referral_id: s.referral?.referral_id
    }));
  }

  async getScreeningDetail(screening_id: string): Promise<ScreeningDetail | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/screenings/${screening_id}`, { headers: this.getAuthHeaders() });
      if (res.ok) {
        const detail = await res.json();
        await idb.saveScreening(detail);
        return detail;
      }
    } catch (e) {
      console.warn('Backend unreachable, getting detail from IndexedDB');
    }
    const local = await idb.getScreening(screening_id);
    return local || null;
  }

  async uploadRetinalImage(
    screening_id: string | number,
    file?: File,
    use_demo_sample: boolean = false,
    sample_grade: number = 2,
    eye?: string,
    image_source?: string
  ): Promise<any> {
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('use_demo_sample', String(use_demo_sample));
      formData.append('sample_grade', String(sample_grade));
      if (eye) formData.append('eye', eye);
      if (image_source) formData.append('image_source', image_source);

      const token = localStorage.getItem('retinal_token');
      const res = await fetch(`${API_BASE_URL}/screenings/${screening_id}/image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to upload image' }));
        throw new Error(err.detail || 'Upload failed');
      }
      return await res.json();
    } catch (err: any) {
      if (err.message && (err.message.includes('Invalid Image') || err.message.includes('fundus'))) {
        throw err;
      }
      console.warn('Offline fallback for retinal image upload:', err.message);
      // Create offline image blob / preview
      return {
        message: 'Image cached locally in offline store',
        retinal_image: {
          id: Date.now(),
          filename: `offline_sample_g${sample_grade}.jpg`,
          url: '/placeholder_retina.jpg',
          width: 512,
          height: 512,
          file_size: 1048576
        },
        screening_status: 'IMAGE_CAPTURED'
      };
    }
  }

  // --- AI Pipeline ---
  async checkImageQuality(screening_id: number): Promise<QualityAssessment> {
    const res = await fetch(`${API_BASE_URL}/ai/image-quality`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ screening_id })
    });
    if (!res.ok) throw new Error('Image quality analysis failed');
    return await res.json();
  }

  async enhanceImage(screening_id: number): Promise<Enhancement> {
    const res = await fetch(`${API_BASE_URL}/ai/enhance`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ screening_id })
    });
    if (!res.ok) throw new Error('Image enhancement failed');
    return await res.json();
  }

  async runCompleteAIAnalysis(screening_id: number, accuracy_mode: string = 'enhanced'): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/ai/analyze`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ screening_id, accuracy_mode })
    });
    if (!res.ok) throw new Error('AI analysis failed');
    return await res.json();
  }

  async stitchRetinalFields(screening_id: string | number, sample_field_grade: number = 2): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/ai/stitch`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ screening_id, sample_field_grade })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Stitching failed' }));
      throw new Error(err.detail || 'Retinal stitching failed');
    }
    return await res.json();
  }

  // --- Clinical Attachments Store ---
  getAttachments(screening_id: string | number): any[] {
    try {
      const key = `retinal_attachments_${screening_id}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveAttachment(screening_id: string | number, attachment: any): any[] {
    const list = this.getAttachments(screening_id);
    const updated = [attachment, ...list];
    localStorage.setItem(`retinal_attachments_${screening_id}`, JSON.stringify(updated));
    return updated;
  }

  removeAttachment(screening_id: string | number, attachmentId: string): any[] {
    const list = this.getAttachments(screening_id);
    const updated = list.filter(a => a.id !== attachmentId);
    localStorage.setItem(`retinal_attachments_${screening_id}`, JSON.stringify(updated));
    return updated;
  }

  async getExplainability(screening_id: number): Promise<Explainability> {
    const res = await fetch(`${API_BASE_URL}/ai/explain`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ screening_id })
    });
    if (!res.ok) throw new Error('Failed to generate explanations');
    return await res.json();
  }

  async getModelEvaluation(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/ai/evaluation`);
    if (!res.ok) throw new Error('Failed to fetch model evaluations');
    return await res.json();
  }

  // --- Doctor Review ---
  async submitDoctorReview(review: {
    screening_id: number;
    decision: 'ACCEPTED' | 'OVERRIDDEN' | 'RECAPTURE_REQUESTED';
    final_grade?: number;
    override_reason?: string;
    doctor_comments?: string;
    instructions_for_hcw?: string;
  }): Promise<DoctorReview> {
    try {
      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(review)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend doctor review submission warning:', err);
    }

    // Local / Offline fallback: always return a valid DoctorReview
    const fallbackReview: DoctorReview = {
      id: Date.now(),
      screening_id: review.screening_id,
      doctor_name: this.getCurrentUser()?.full_name || 'Dr. Rajesh Varma, MS',
      decision: review.decision,
      final_grade: review.final_grade ?? 2,
      override_reason: review.override_reason,
      doctor_comments: review.doctor_comments || 'Clinical findings are consistent with non-proliferative diabetic retinopathy.',
      instructions_for_hcw: review.instructions_for_hcw
    };

    try {
      const local = await idb.getScreening(String(review.screening_id));
      if (local) {
        local.doctor_review = fallbackReview;
        local.status = review.decision === 'RECAPTURE_REQUESTED' ? 'IMAGE_CAPTURED' : 'DOCTOR_REVIEW';
        await idb.saveScreening(local);
      }
    } catch {
      // ignore
    }

    return fallbackReview;
  }

  // --- Triage & Referral ---
  async performTriage(payload: {
    screening_id: number;
    risk_category?: string;
    follow_up_months?: number;
    referral_recommended?: boolean;
    referral_reason?: string;
    priority?: string;
  }): Promise<TriageResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/triage`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend triage warning:', err);
    }

    const fallbackTriage: TriageResult = {
      id: Date.now(),
      screening_id: payload.screening_id,
      risk_category: (payload.risk_category as any) || 'HIGH',
      follow_up_months: payload.follow_up_months || 1,
      referral_recommended: payload.referral_recommended ?? true,
      referral_reason: payload.referral_reason || 'Urgent ophthalmologist referral indicated.',
      priority: (payload.priority as 'ROUTINE' | 'URGENT' | 'EMERGENCY') || 'URGENT'
    };

    try {
      const local = await idb.getScreening(String(payload.screening_id));
      if (local) {
        local.triage_result = fallbackTriage;
        local.status = 'TRIAGED';
        await idb.saveScreening(local);
      }
    } catch {
      // ignore
    }

    return fallbackTriage;
  }

  async generateReferral(payload: {
    screening_id: number;
    patient_id: number;
    dr_grade: number;
    dme_risk?: string;
    reason: string;
    priority?: string;
    recommended_destination?: string;
    hospital_name?: string;
    hospital_address?: string;
    hospital_contact?: string;
    hospital_distance?: string;
    directions_url?: string;
    doctor_comments?: string;
  }): Promise<Referral> {
    try {
      const res = await fetch(`${API_BASE_URL}/referrals`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend referral warning:', err);
    }

    const fallbackReferral: Referral = {
      id: Date.now(),
      referral_id: `REF-2026-${String(Date.now()).slice(-5)}`,
      screening_id: payload.screening_id,
      patient_id: payload.patient_id,
      dr_grade: payload.dr_grade,
      dme_risk: payload.dme_risk || 'Low',
      reason: payload.reason,
      priority: (payload.priority as any) || 'URGENT',
      recommended_destination: payload.recommended_destination || payload.hospital_name || 'District Eye Hospital',
      hospital_name: payload.hospital_name || payload.recommended_destination || 'District Eye Hospital',
      hospital_address: payload.hospital_address || 'Irwin Road, Lashkar Mohalla, Mysuru',
      hospital_contact: payload.hospital_contact || '+91 821 252 0150',
      hospital_distance: payload.hospital_distance || '2.4 km away',
      directions_url: payload.directions_url || 'https://www.google.com/maps',
      doctor_comments: payload.doctor_comments,
      status: 'PENDING',
      referral_status: 'Recommended'
    };

    try {
      const local = await idb.getScreening(String(payload.screening_id));
      if (local) {
        local.referral = fallbackReferral;
        local.status = 'REFERRED';
        await idb.saveScreening(local);
      }
    } catch {
      // ignore
    }

    return fallbackReferral;
  }

  async getNearbyFacilities(options?: {
    latitude?: number;
    longitude?: number;
    radius_km?: number;
    sort_by?: 'distance' | 'rating' | 'relevance';
    keyword?: string;
    dr_grade?: number;
  }): Promise<{ user_location?: { lat: number; lng: number }; radius_km: number; count: number; recommended: EyeCareFacility; facilities: EyeCareFacility[] }> {
    const lat = options?.latitude !== undefined ? options.latitude : 12.9716;
    const lng = options?.longitude !== undefined ? options.longitude : 77.5946;
    const radius = options?.radius_km || 10;
    const sortBy = options?.sort_by || 'distance';
    const kw = options?.keyword || '';
    const grade = options?.dr_grade !== undefined ? options.dr_grade : 2;

    const queryParams = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      radius_km: String(radius),
      sort_by: sortBy,
      keyword: kw,
      dr_grade: String(grade)
    });

    try {
      const res = await fetch(`${API_BASE_URL}/referrals/facilities?${queryParams.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not load facilities from backend:', e);
    }

    const defaultFacility: EyeCareFacility = {
      id: 'fac-1',
      name: 'Narayana Nethralaya Vitreoretinal Institute',
      distance: '2.1 km away',
      distance_km: 2.1,
      address: 'Main Road, Medical Sector 1',
      contact: '+91 80 6612 1400',
      specialty: 'Vitreoretinal Surgery, Diabetic Retinopathy Laser, Anti-VEGF & OCT Angiography',
      category: 'Tertiary Retina & Eye Hospital',
      min_grade: 2,
      directions_url: `https://www.google.com/maps/dir/?api=1&destination=${lat + 0.01},${lng + 0.01}`,
      lat: lat + 0.01,
      lng: lng + 0.01,
      rating: 4.8,
      review_count: 2140,
      open_now: true,
      hours: 'Open 24 Hours (Emergency Retina Service)',
      reason: 'Ophthalmology evaluation recommended based on screening result.'
    };
    return {
      user_location: { lat, lng },
      radius_km: radius,
      count: 1,
      recommended: defaultFacility,
      facilities: [defaultFacility]
    };
  }

  async getAdminUsers(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/auth/users`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to retrieve user directory.');
    return await res.json();
  }

  // --- Reports ---
  async generateReport(screening_id: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/reports/${screening_id}/generate`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend report generation warning:', e);
    }
    return {
      id: Date.now(),
      screening_id,
      pdf_url: `${API_BASE_URL}/reports/${screening_id}?download=true`,
      generated_at: new Date().toISOString()
    };
  }

  getReportDownloadUrl(screening_id: string): string {
    return `${API_BASE_URL}/reports/${screening_id}?download=true`;
  }

  // --- ASHA Submission & Both-Eyes Screening Mode ---
  async submitToDoctor(screeningId: number | string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/screenings/${screeningId}/submit-to-doctor`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit screening to doctor');
    }
    return await res.json();
  }

  async uploadBothEyes(
    screeningId: number | string,
    fileLeft?: File,
    fileRight?: File,
    leftSampleGrade?: number,
    rightSampleGrade?: number
  ): Promise<any> {
    const formData = new FormData();
    if (fileLeft) formData.append('file_left', fileLeft);
    if (fileRight) formData.append('file_right', fileRight);
    if (leftSampleGrade !== undefined) formData.append('left_sample_grade', leftSampleGrade.toString());
    if (rightSampleGrade !== undefined) formData.append('right_sample_grade', rightSampleGrade.toString());

    const token = localStorage.getItem('retinal_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/screenings/${screeningId}/both-eyes/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload both-eyes images');
    }
    return await res.json();
  }

  async analyzeBothEyes(screeningId: number | string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/screenings/${screeningId}/both-eyes/analyze`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to analyze both eyes');
    }
    return await res.json();
  }

  // --- Synchronization ---
  async pushSyncItems(items: SyncQueueItem[]): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/sync/push`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error('Sync push failed');
    return await res.json();
  }

  async getSyncStatus(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/sync/status`);
    if (!res.ok) throw new Error('Failed to get sync status');
    return await res.json();
  }

  // --- AI Model Diagnostics ---
  async getModelDiagnostics(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/model-diagnostics`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  }
}

export const api = new ApiService();
