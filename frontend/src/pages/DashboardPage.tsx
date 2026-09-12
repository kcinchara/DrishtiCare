import React from 'react';
import { api } from '../services/api';
import { AshaDashboardPage } from './AshaDashboardPage';
import { DoctorDashboardPage } from './DoctorDashboardPage';
import { AdminDashboardPage } from './AdminDashboardPage';

export const DashboardPage: React.FC = () => {
  const currentUser = api.getCurrentUser();
  const role = (currentUser?.role || '').toUpperCase();

  // Strict role-based dashboard separation
  // 1. Doctors / Ophthalmologists -> Dedicated Clinical Workstation & Severity Queue
  if (role.includes('DOCTOR') || role.includes('OPHTHALMOLOGIST')) {
    return <DoctorDashboardPage />;
  }

  // 2. Administrators -> System & User Administration
  if (role === 'ADMIN') {
    return <AdminDashboardPage />;
  }

  // 3. Primary Frontline Community Workflow: ASHA Worker & Rural Healthcare Worker
  return <AshaDashboardPage />;
};
