import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, Users, Hospital, HardDrive, RefreshCw, CheckCircle,
  AlertTriangle, Search, Lock, UserCheck, Stethoscope, ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../utils/audio';

export const AdminDashboardPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'HEALTHCARE_WORKER' | 'DOCTOR' | 'ADMIN'>('ALL');
  const [syncStatus, setSyncStatus] = useState<any>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [userList, sync] = await Promise.all([
        api.getAdminUsers().catch(() => []),
        api.getSyncStatus().catch(() => null)
      ]);
      setUsers(userList);
      setSyncStatus(sync);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (roleFilter !== 'ALL' && (u.role || '').toUpperCase() !== roleFilter) return false;
    return true;
  });

  const hcwCount = users.filter((u) => (u.role || '').toUpperCase().includes('HEALTHCARE') || (u.role || '').toUpperCase().includes('ASHA')).length;
  const docCount = users.filter((u) => (u.role || '').toUpperCase() === 'DOCTOR').length;
  const adminCount = users.filter((u) => (u.role || '').toUpperCase() === 'ADMIN').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 mb-1">
            <Link to="/dashboard" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-slate-500">Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-teal-600" />
            <span>Hospital Administration & User Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage authorized clinical users, strict data isolation boundaries, and regional facility credentials.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 self-start sm:self-center font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Authorized Users</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{users.length}</div>
          <div className="text-[11px] text-teal-600 font-medium mt-1">Verified Clinical Accounts</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Field Healthcare Workers</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{hcwCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">ASHA & Vision Technicians</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Attending Ophthalmologists</span>
            <Stethoscope className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-700">{docCount}</div>
          <div className="text-[11px] text-cyan-600 font-medium mt-1">Doctor Adjudicators</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">System Administrators</span>
            <Lock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-700">{adminCount}</div>
          <div className="text-[11px] text-indigo-600 font-medium mt-1">Full Privileges</div>
        </div>
      </div>

      {/* Privacy Architecture Notice */}
      <div className="card p-4 bg-slate-900 text-white border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Strict Row-Level Privacy & User Isolation Active</h4>
            <p className="text-[11px] text-slate-400">
              Healthcare workers can only access screenings created within their authorized session. Doctor reviews preserve immutable AI vs Clinician audit trails.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'HEALTHCARE_WORKER', 'DOCTOR', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                sound.playClick();
                setRoleFilter(r);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                roleFilter === r
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email or ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* User Directory Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-base font-bold text-slate-900">Registered Users Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Showing {filteredUsers.length} authorized users</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 text-xs uppercase font-bold tracking-wider">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Hospital ID</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No users match the search filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-800">
                      USR-{u.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {u.full_name}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        (u.role || '').toUpperCase() === 'DOCTOR'
                          ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                          : ((u.role || '').toUpperCase() === 'ADMIN'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-teal-50 text-teal-800 border border-teal-200')
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                      {u.hospital_id || 'HOSP-DEFAULT'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="badge-success text-[11px]">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
