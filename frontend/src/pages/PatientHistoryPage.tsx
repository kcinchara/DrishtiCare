import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, History, ChevronRight, User, Eye, Calendar,
  HardDrive, Users, Activity, PlusCircle, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { ScreeningListItem, Patient } from '../types';

export const PatientHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [screenings, setScreenings] = useState<ScreeningListItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [eyeFilter, setEyeFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'screenings' | 'patients'>('screenings');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [screenData, patientData] = await Promise.all([
        api.listScreenings(),
        api.getPatients()
      ]);
      setScreenings(screenData);
      setPatients(patientData);
    } catch (e) {
      console.error('Error loading history data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredScreenings = screenings.filter((item) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.patient_name.toLowerCase().includes(q) ||
      item.patient_code.toLowerCase().includes(q) ||
      item.screening_id.toLowerCase().includes(q);

    const matchesRisk =
      riskFilter === 'ALL' ||
      (riskFilter === 'HIGH' && (item.triage_risk === 'HIGH' || item.referable)) ||
      (riskFilter === 'MEDIUM' && item.triage_risk === 'MEDIUM') ||
      (riskFilter === 'LOW' && item.triage_risk === 'LOW');

    const matchesEye =
      eyeFilter === 'ALL' || item.eye.includes(eyeFilter);

    return matchesSearch && matchesRisk && matchesEye;
  });

  const filteredPatients = patients.filter((p) => {
    const q = searchTerm.toLowerCase().trim();
    return (
      !q ||
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.patient_id || '').toLowerCase().includes(q) ||
      (p.contact_number || '').includes(q) ||
      (p.screening_location || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-teal-600" />
            <span>Community Patient & Screening Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Persistent longitudinal history with unique IDs (<span className="font-mono font-bold text-teal-800">PAT-DR-XXXX</span>), multi-encounter progression tracking, and clinical audits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('screenings')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'screenings'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Screening Encounters ({screenings.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'patients'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Registered Patients ({patients.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="card grid grid-cols-1 sm:grid-cols-12 gap-3 py-4">
        {/* Search */}
        <div className={activeTab === 'screenings' ? 'sm:col-span-6 relative' : 'sm:col-span-12 relative'}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Patient ID (e.g. PAT-DR-1001), Name, Phone, or Screening Code..."
            className="w-full pl-10 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {activeTab === 'screenings' && (
          <>
            {/* Risk Filter */}
            <div className="sm:col-span-3">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="ALL">All Risk Categories</option>
                <option value="HIGH">High Risk / Referable</option>
                <option value="MEDIUM">Medium / Borderline</option>
                <option value="LOW">Low Risk / Routine</option>
              </select>
            </div>

            {/* Eye Filter */}
            <div className="sm:col-span-3">
              <select
                value={eyeFilter}
                onChange={(e) => setEyeFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="ALL">All Eyes (OD & OS)</option>
                <option value="Right">Right Eye (OD)</option>
                <option value="Left">Left Eye (OS)</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Tab 1: Screenings Table */}
      {activeTab === 'screenings' && (
        <div className="card p-0 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              Showing {filteredScreenings.length} of {screenings.length} Screening Encounters
            </span>
            <span className="text-slate-500">
              Click row to inspect patient timeline
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Patient Code</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Eye</th>
                  <th className="py-3 px-4">DR Grade</th>
                  <th className="py-3 px-4">DME Risk</th>
                  <th className="py-3 px-4">Doctor Verdict</th>
                  <th className="py-3 px-4">Triage Risk</th>
                  <th className="py-3 px-4 text-right">View History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredScreenings.length > 0 ? (
                  filteredScreenings.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/patient/${row.patient_id}`)}
                      className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-teal-800">
                        {row.patient_code}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {row.patient_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {row.date}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                        {row.eye}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          row.dr_grade.includes('Level 0')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : (row.referable ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200')
                        }`}>
                          {row.dr_grade} • {row.dr_label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {row.dme_risk.includes('Possible') ? (
                          <span className="badge-warning font-semibold">Possible DME</span>
                        ) : (
                          <span className="text-slate-500">Low</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                        {row.doctor_decision}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          row.triage_risk === 'HIGH'
                            ? 'bg-rose-100 text-rose-800'
                            : (row.triage_risk === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                        }`}>
                          {row.triage_risk}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button className="text-teal-700 hover:text-teal-900 font-bold text-xs inline-flex items-center gap-1">
                          <span>Timeline</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                      No matching screening records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Registered Patients Table */}
      {activeTab === 'patients' && (
        <div className="card p-0 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              Showing {filteredPatients.length} of {patients.length} Registered Community Patients
            </span>
            <span className="text-slate-500">
              Unique ID Format: <code className="text-teal-800 font-bold font-mono">PAT-DR-XXXX</code>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Age / Gender</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Diabetes Profile</th>
                  <th className="py-3 px-4">Blood Glucose / HbA1c</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((pt) => (
                    <tr
                      key={pt.id}
                      onClick={() => navigate(`/patient/${pt.id}`)}
                      className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-teal-800">
                        {pt.patient_id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {pt.full_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {pt.age} Yrs / {pt.gender}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                        {pt.contact_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-slate-800">{pt.diabetes_type || 'Type 2'}</span>
                        <span className="text-slate-500 block text-[11px]">{pt.diabetes_duration || 'Duration N/A'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="text-slate-800 font-medium">
                          {pt.blood_glucose ? `${pt.blood_glucose} mg/dL` : 'No glucose'}
                        </span>
                        {pt.hba1c && (
                          <span className="text-slate-500 block text-[11px]">HbA1c: {pt.hba1c}%</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {pt.screening_location || 'Rural PHC'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patient/${pt.id}`);
                          }}
                          className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1 font-bold text-teal-800"
                        >
                          <span>Profile & Timeline</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No matching registered patients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
