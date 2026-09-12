import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './utils/i18n';
import { ThemeProvider } from './utils/ThemeContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { WelcomePage } from './pages/WelcomePage';
import { PatientNewPage } from './pages/PatientNewPage';
import { ScreeningImagePage } from './pages/ScreeningImagePage';
import { ScreeningQualityPage } from './pages/ScreeningQualityPage';
import { ScreeningEnhancePage } from './pages/ScreeningEnhancePage';
import { ScreeningAnalysisPage } from './pages/ScreeningAnalysisPage';
import { ScreeningResultsPage } from './pages/ScreeningResultsPage';
import { ScreeningExplainPage } from './pages/ScreeningExplainPage';
import { ScreeningReviewPage } from './pages/ScreeningReviewPage';
import { ScreeningTriagePage } from './pages/ScreeningTriagePage';
import { ScreeningReportPage } from './pages/ScreeningReportPage';
import { PatientHistoryPage } from './pages/PatientHistoryPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { OfflineSyncPage } from './pages/OfflineSyncPage';
import { NearbyHospitalsPage } from './pages/NearbyHospitalsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AshaDashboardPage } from './pages/AshaDashboardPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';

// Layout wrapper that conditionally hides the Navbar on the login route
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200">
      {!isLoginPage && <Navbar />}
      <main className="flex-1">{children}</main>
      {!isLoginPage && (
        <footer className="print:hidden border-t py-6 text-center text-xs transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">{t('app.title', 'DrishtiCare')}</span>
              <span>•</span>
              <span className="text-slate-500 dark:text-slate-400">{t('dash.subtitle', 'Rural Tele-Ophthalmology System')}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              AI Decision Support Only — Clinical Adjudication by Qualified Ophthalmologist
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Clinical Routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/asha"
                element={
                  <ProtectedRoute>
                    <AshaDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/doctor"
                element={
                  <ProtectedRoute allowedRoles={['DOCTOR', 'Doctor', 'ADMIN']}>
                    <DoctorDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/welcome"
                element={
                  <ProtectedRoute>
                    <WelcomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/new"
                element={
                  <ProtectedRoute>
                    <PatientNewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screening/:id/image"
                element={
                  <ProtectedRoute>
                    <ScreeningImagePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screening/:id/quality"
                element={
                  <ProtectedRoute>
                    <ScreeningQualityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screening/:id/enhancement"
                element={
                  <ProtectedRoute>
                    <ScreeningEnhancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screening/:id/analysis"
                element={
                  <ProtectedRoute>
                    <ScreeningAnalysisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screening/:id/results"
                element={
                  <ProtectedRoute>
                    <ScreeningResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screening/:id/explainability"
                element={
                  <ProtectedRoute>
                    <ScreeningExplainPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screening/:id/review"
                element={
                  <ProtectedRoute>
                    <ScreeningReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screening/:id/triage"
                element={
                  <ProtectedRoute>
                    <ScreeningTriagePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screening/:id/report"
                element={
                  <ProtectedRoute>
                    <ScreeningReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <PatientHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/:id"
                element={
                  <ProtectedRoute>
                    <PatientDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nearby-hospitals"
                element={
                  <ProtectedRoute>
                    <NearbyHospitalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/offline"
                element={
                  <ProtectedRoute>
                    <OfflineSyncPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
