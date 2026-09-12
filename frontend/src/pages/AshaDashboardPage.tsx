import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Search, Camera, History, Clock, AlertTriangle,
  ChevronRight, Calendar, User, Eye, Phone, MapPin, Hospital,
  CheckCircle2, AlertOctagon, RefreshCw, FileText, ArrowRight,
  Stethoscope, HeartHandshake, ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../utils/i18n';
import { sound } from '../utils/audio';
import { ScreeningListItem, Patient } from '../types';

export const AshaDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [screenings, setScreenings] = useState<ScreeningListItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active section tab: 'OVERVIEW' | 'SEARCH' | 'FOLLOW_UP' | 'REFERRALS'
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SEARCH' | 'FOLLOW_UP' | 'REFERRALS'>('OVERVIEW');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const currentUser = api.getCurrentUser();
  const ashaName = currentUser?.full_name || 'ASHA Worker';

  useEffect(() => {
    loadAshaData();
  }, []);

  const loadAshaData = async () => {
    setIsLoading(true);
    try {
      const [scrData, patData] = await Promise.all([
        api.listScreenings(),
        api.getPatients()
      ]);
      setScreenings(scrData || []);
      setPatients(patData || []);
    } catch (e) {
      console.error('Failed to load ASHA dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.searchPatients(query);
      setSearchResults(res || []);
    } catch (e) {
      console.error('Search failed:', e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const startScreeningForPatient = async (patientId: number) => {
    sound.playClick();
    try {
      const scr = await api.createScreening(patientId, 'Right Eye', 'Fundus Camera');
      navigate(`/screening/${scr.id}/image`);
    } catch (e: any) {
      alert('Failed to start screening: ' + e.message);
    }
  };

  // Metrics computation
  const todayStr = new Date().toISOString().split('T')[0];
  const screenedToday = screenings.filter(s => s.date === todayStr).length;
  const referralRequired = screenings.filter(s => s.referable || s.triage_risk === 'HIGH').length;
  const followUpsDue = screenings.filter(s => {
    const g = parseInt((s.dr_grade.match(/\d+/) || ['0'])[0], 10);
    return g === 1 || g === 2;
  }).length;
  const totalPatientsCount = patients.length;

  // Filtered lists for Follow-Up & Referral tabs
  const followUpPatients = screenings.filter(s => {
    const g = parseInt((s.dr_grade.match(/\d+/) || ['0'])[0], 10);
    return g === 1 || (g === 2 && s.doctor_decision !== 'REFERRED');
  });

  const referralPatients = screenings.filter(s => s.referable || s.triage_risk === 'HIGH');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header Banner - Simple Community Welcome */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-bold uppercase tracking-wider">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Frontline Vision Health • ASHA Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {ashaName} 👋
            </h1>
            <p className="text-teal-100/90 text-sm max-w-xl">
              Point-of-care community vision screening for early diabetic retinopathy detection, patient counselling, and hospital referral guidance.
            </p>
          </div>

          {/* Direct Start Screening Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { sound.playClick(); navigate('/patient/new'); }}
              className="px-5 py-3 rounded-2xl bg-white text-teal-900 hover:bg-teal-50 font-extrabold text-sm shadow-md transition-all flex items-center gap-2 transform active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-teal-700" />
              <span>+ Register New Patient</span>
            </button>
            <button
              onClick={() => { sound.playClick(); setActiveTab('SEARCH'); }}
              className="px-5 py-3 rounded-2xl bg-teal-600/60 hover:bg-teal-600 text-white font-bold text-sm border border-teal-400/40 transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Search Patient</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Today's Tasks Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-teal-600 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Patients Screened Today</span>
            <Calendar className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{screenedToday}</span>
            <span className="text-xs text-slate-400">records</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Community screenings today</p>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-500 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Follow-Ups Due</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-700">{followUpsDue}</span>
            <span className="text-xs text-slate-400">due for re-check</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">DR 1 / DR 2 follow-ups</p>
        </div>

        <div className="card p-5 border-l-4 border-l-rose-600 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Referrals Required</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-700">{referralRequired}</span>
            <span className="text-xs text-slate-400">urgent</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Eye specialist needed</p>
        </div>

        <div className="card p-5 border-l-4 border-l-indigo-600 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Registered Patients</span>
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-700">{totalPatientsCount}</span>
            <span className="text-xs text-slate-400">in your area</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total village records</p>
        </div>
      </div>

      {/* 3. Primary Action Navigation Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => { sound.playClick(); setActiveTab('OVERVIEW'); }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors ${
            activeTab === 'OVERVIEW'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Active Worklist ({screenings.length})</span>
        </button>

        <button
          onClick={() => { sound.playClick(); setActiveTab('SEARCH'); }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors ${
            activeTab === 'SEARCH'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Search Patient / Returning Patient</span>
        </button>

        <button
          onClick={() => { sound.playClick(); setActiveTab('FOLLOW_UP'); }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors ${
            activeTab === 'FOLLOW_UP'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Follow-Up Patients ({followUpPatients.length})</span>
        </button>

        <button
          onClick={() => { sound.playClick(); setActiveTab('REFERRALS'); }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors ${
            activeTab === 'REFERRALS'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Specialist Referrals ({referralPatients.length})</span>
        </button>

        <button
          onClick={() => { sound.playClick(); navigate('/history'); }}
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 ml-auto"
        >
          <History className="w-4 h-4 text-teal-600" />
          <span>All Patient Timelines</span>
        </button>
      </div>

      {/* 4. Tab 1: SEARCH & RETURNING PATIENT WORKFLOW */}
      {activeTab === 'SEARCH' && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-teal-600" />
              <span>Search Patient / Check Returning Patient</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Search by Unique Patient ID (e.g. <code>PAT-DR-0001</code>), Patient Name, or Mobile Number.
              If the patient has been screened before, their history will be retrieved automatically.
            </p>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Enter Patient ID (PAT-DR-XXXX), Full Name, or Phone Number..."
              className="w-full pl-12 pr-4 py-3.5 text-sm rounded-2xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-xs"
              autoFocus
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>

          {isSearching && (
            <div className="py-6 text-center text-xs text-slate-500">
              Searching database...
            </div>
          )}

          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div className="p-6 bg-slate-50 rounded-2xl text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">No patient found matching "{searchQuery}"</p>
              <p className="text-xs text-slate-500">This may be a new patient who has not been registered yet.</p>
              <button
                onClick={() => navigate('/patient/new')}
                className="btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register "{searchQuery}" as New Patient</span>
              </button>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Matching Patient Records ({searchResults.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map(p => (
                  <div key={p.id} className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="badge-info text-xs font-mono font-bold">{p.patient_id}</span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">{p.full_name}</h4>
                        <p className="text-xs text-slate-500">{p.age} Years • {p.gender} • {p.screening_location || 'Rural PHC'}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200">
                        {p.diabetes_type || 'Type 2'} ({p.diabetes_duration || '5 yrs'})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                      <div>
                        <span className="text-slate-400">Phone:</span> {p.contact_number || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-400">Blood Sugar:</span> {p.blood_glucose || 'N/A'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => navigate(`/patient/${p.id}`)}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold text-center"
                      >
                        View Timeline
                      </button>
                      <button
                        onClick={() => startScreeningForPatient(p.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold text-center shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Start New Screening</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: FOLLOW-UP PATIENTS LIST */}
      {activeTab === 'FOLLOW_UP' && (
        <div className="card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <span>Follow-Up Patients (Community Re-Screening Worklist)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Patients with early or moderate signs (DR 1 / DR 2) scheduled for periodic monitoring.
              </p>
            </div>
            <span className="badge-warning text-xs font-semibold">{followUpPatients.length} Patients Due</span>
          </div>

          {followUpPatients.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No follow-up patients currently pending re-screening.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {followUpPatients.map(row => (
                <div key={row.id} className="p-5 bg-white rounded-2xl border border-amber-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="badge-info text-xs font-mono font-bold">{row.patient_code}</span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{row.patient_name}</h3>
                      <p className="text-xs text-slate-500">Last Screened: {row.date}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                      {row.dr_grade}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-xs text-amber-900">
                    <span className="font-bold">Next Recommended Action:</span> Scheduled 6-Month Vision & Retinal Fundus Re-Screening.
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => navigate(`/patient/${row.patient_id}`)}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold"
                    >
                      View History
                    </button>
                    <button
                      onClick={() => startScreeningForPatient(row.patient_id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Start New Screening</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Tab 3: REFERRAL REQUIRED LIST */}
      {activeTab === 'REFERRALS' && (
        <div className="card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
                <span>Patients Requiring Specialist Eye Doctor Referral</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Patients with referable retinal lesions (DR 2, DR 3, DR 4) requiring ophthalmologist evaluation.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
              {referralPatients.length} Urgent Referrals
            </span>
          </div>

          {referralPatients.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No urgent referral patients currently in queue.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {referralPatients.map(row => (
                <div key={row.id} className="p-5 bg-white rounded-2xl border border-rose-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="badge-info text-xs font-mono font-bold">{row.patient_code}</span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{row.patient_name}</h3>
                      <p className="text-xs text-slate-500">Screening Date: {row.date} • {row.eye}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-extrabold">
                      {row.dr_grade} • {row.dr_label}
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-900 flex items-center justify-between">
                    <span>Priority: <b>URGENT SPECIALIST REVIEW</b></span>
                    <span className="text-[11px] text-rose-700 font-semibold">{row.dme_risk}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => navigate(`/screening/${row.id}/report`)}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Report</span>
                    </button>
                    <button
                      onClick={() => navigate('/nearby-hospitals')}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Hospital className="w-3.5 h-3.5" />
                      <span>Find Eye Hospital</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Tab 0: OVERVIEW WORKLIST TABLE */}
      {activeTab === 'OVERVIEW' && (
        <div className="card p-0 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Today's Screening Worklist</h2>
              <p className="text-xs text-slate-500 mt-0.5">Point-of-care community vision records</p>
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Total Screenings: {screenings.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Patient Code</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Eye</th>
                  <th className="py-3 px-4">DR Result</th>
                  <th className="py-3 px-4">Doctor Review</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {screenings.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/screening/${s.id}/results`)}
                    className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-teal-800">
                      {s.patient_code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {s.patient_name}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {s.date}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                      {s.eye}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        s.dr_grade.includes('Level 0')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : (s.referable ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200')
                      }`}>
                        {s.dr_grade}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 font-medium">
                      {s.doctor_decision}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/screening/${s.id}/results`);
                        }}
                        className="text-teal-700 hover:text-teal-900 font-bold text-xs inline-flex items-center gap-1"
                      >
                        <span>View Result</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
