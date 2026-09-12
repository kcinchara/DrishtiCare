import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Calendar, MapPin, Phone, ShieldCheck, ArrowRight, ArrowLeft, Save } from 'lucide-react';
import { api } from '../services/api';
import { ScreeningStepper } from '../components/ScreeningStepper';

export const PatientNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const screeningIdParam = searchParams.get('screening_id');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingScreeningId, setExistingScreeningId] = useState<string | null>(screeningIdParam);
  const [existingPatientId, setExistingPatientId] = useState<number | null>(null);

  const initialPatientId = `RET-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  const [formData, setFormData] = useState({
    patient_id: initialPatientId,
    full_name: '',
    age: '',
    gender: 'Female',
    diabetes_duration: '5 years',
    diabetes_type: 'Type 2',
    language: 'Hindi / English',
    screening_location: 'PHC Rampur, Rural District',
    contact_number: '',
    previous_dr_history: 'None reported',
    previous_eye_exam: 'More than 2 years ago',
    last_screening_date: '',
    blood_glucose: '',
    hba1c: '',
    treatment_info: 'Metformin 500mg daily'
  });

  // Restore draft or existing screening patient details on mount
  useEffect(() => {
    if (screeningIdParam) {
      api.getScreeningDetail(screeningIdParam).then((detail) => {
        if (detail?.patient) {
          const p = detail.patient;
          setExistingPatientId(p.id);
          setExistingScreeningId(screeningIdParam);
          setFormData((prev) => ({
            ...prev,
            patient_id: p.patient_id || prev.patient_id,
            full_name: p.full_name || prev.full_name,
            age: p.age ? String(p.age) : prev.age,
            gender: (p.gender as any) || prev.gender,
            diabetes_duration: p.diabetes_duration || prev.diabetes_duration,
            diabetes_type: p.diabetes_type || prev.diabetes_type,
            language: p.language || prev.language,
            screening_location: p.screening_location || prev.screening_location,
            contact_number: p.contact_number || prev.contact_number,
            previous_dr_history: p.previous_dr_history || prev.previous_dr_history,
            previous_eye_exam: p.previous_eye_exam || prev.previous_eye_exam,
            last_screening_date: p.last_screening_date || prev.last_screening_date,
            blood_glucose: p.blood_glucose || prev.blood_glucose,
            hba1c: p.hba1c || prev.hba1c,
            treatment_info: p.treatment_info || prev.treatment_info
          }));
        }
      }).catch((e) => console.warn('Could not load existing screening patient:', e));
    } else {
      // Check session draft
      try {
        const draft = sessionStorage.getItem('drishticare_patient_draft');
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed && typeof parsed === 'object') {
            setFormData((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch {
        // ignore
      }
    }
  }, [screeningIdParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const updated = {
      ...formData,
      [e.target.name]: e.target.value
    };
    setFormData(updated);
    try {
      sessionStorage.setItem('drishticare_patient_draft', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleQuickFill = () => {
    const filled = {
      patient_id: initialPatientId,
      full_name: 'Shanti Devi Sharma',
      age: '56',
      gender: 'Female',
      diabetes_duration: '7 years',
      diabetes_type: 'Type 2',
      language: 'Hindi',
      screening_location: 'Primary Health Centre Rampur, Block 3',
      contact_number: '+91 98765 11223',
      previous_dr_history: 'Mild blurriness in right eye',
      previous_eye_exam: 'Never had dilated eye exam',
      last_screening_date: '2024-05-12',
      blood_glucose: '178 mg/dL',
      hba1c: '8.2%',
      treatment_info: 'Oral anti-hyperglycemic (Glimepiride + Metformin)'
    };
    setFormData(filled);
    sessionStorage.setItem('drishticare_patient_draft', JSON.stringify(filled));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.age) {
      alert('Please fill in the patient name and age');
      return;
    }

    setIsSubmitting(true);
    try {
      const patientPayload = {
        patient_id: formData.patient_id,
        full_name: formData.full_name,
        age: parseInt(formData.age, 10),
        gender: formData.gender as any,
        diabetes_duration: formData.diabetes_duration,
        diabetes_type: formData.diabetes_type,
        language: formData.language,
        screening_location: formData.screening_location,
        contact_number: formData.contact_number,
        previous_dr_history: formData.previous_dr_history,
        previous_eye_exam: formData.previous_eye_exam,
        last_screening_date: formData.last_screening_date,
        blood_glucose: formData.blood_glucose,
        hba1c: formData.hba1c,
        treatment_info: formData.treatment_info
      };

      if (existingPatientId && existingScreeningId) {
        // Update existing patient record
        await api.updatePatient(existingPatientId, patientPayload);
        sessionStorage.setItem('drishticare_patient_draft', JSON.stringify(formData));
        navigate(`/screening/${existingScreeningId}/image`);
      } else {
        // 1. Save new patient
        const savedPatient = await api.createPatient(patientPayload);

        // 2. Initialize screening record
        const screening = await api.createScreening(savedPatient.id, 'Right Eye', 'Fundus Camera');
        sessionStorage.setItem('drishticare_active_screening_id', String(screening.id));
        sessionStorage.setItem('drishticare_patient_draft', JSON.stringify(formData));

        // 3. Move to Step 2: Image Acquisition
        navigate(`/screening/${screening.id}/image`);
      }
    } catch (err: any) {
      alert('Failed to save patient: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <ScreeningStepper currentStep={1} screeningId={existingScreeningId || undefined} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="card shadow-sm border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {existingScreeningId ? 'Edit Patient Information' : 'Patient Information'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Step 1 of 8 — Register patient demographics for Diabetic Retinopathy screening
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleQuickFill}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Auto-fill Demo Patient
              </button>
              <div className="badge-info text-xs font-mono">
                {formData.patient_id}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Primary Demographics */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                <span>Primary Demographics</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="e.g. Shanti Devi Sharma"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Age <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    required
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="e.g. 56"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Preferred Language</label>
                  <input
                    type="text"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    placeholder="+91 98765 00000"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Screening Location */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Screening Centre / Location</label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="screening_location"
                  value={formData.screening_location}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Diabetes & Ophthalmic History */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Diabetes Profile & Eye History</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Diabetes Type</label>
                  <select
                    name="diabetes_type"
                    value={formData.diabetes_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    <option value="Type 2">Type 2 Diabetes Mellitus</option>
                    <option value="Type 1">Type 1 Diabetes Mellitus</option>
                    <option value="Gestational">Gestational Diabetes</option>
                    <option value="Pre-diabetic">Pre-diabetic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Duration of Diabetes</label>
                  <input
                    type="text"
                    name="diabetes_duration"
                    value={formData.diabetes_duration}
                    onChange={handleChange}
                    placeholder="e.g. 7 years"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Previous Eye Exam</label>
                  <input
                    type="text"
                    name="previous_eye_exam"
                    value={formData.previous_eye_exam}
                    onChange={handleChange}
                    placeholder="e.g. Never / 2 years ago"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Known Retinopathy History / Visual Symptoms</label>
                  <input
                    type="text"
                    name="previous_dr_history"
                    value={formData.previous_dr_history}
                    onChange={handleChange}
                    placeholder="e.g. None / occasional floaters / blurriness"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Optional Glycemic Markers */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Glycemic Markers & Medications (Optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Random Blood Glucose</label>
                  <input
                    type="text"
                    name="blood_glucose"
                    value={formData.blood_glucose}
                    onChange={handleChange}
                    placeholder="e.g. 178 mg/dL"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">HbA1c Level (%)</label>
                  <input
                    type="text"
                    name="hba1c"
                    value={formData.hba1c}
                    onChange={handleChange}
                    placeholder="e.g. 8.2%"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Current Treatment</label>
                  <input
                    type="text"
                    name="treatment_info"
                    value={formData.treatment_info}
                    onChange={handleChange}
                    placeholder="e.g. Metformin / Insulin"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Offline notification and Submit */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Patient record is saved to local encrypted IndexedDB immediately.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary py-2.5 px-6 font-bold shadow-md inline-flex items-center gap-2"
              >
                <span>{isSubmitting ? 'Saving...' : 'SAVE & CONTINUE TO IMAGE'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
