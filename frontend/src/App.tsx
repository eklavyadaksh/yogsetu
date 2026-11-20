import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DoctorDashboardPage = lazy(() => import('./pages/DoctorDashboardPage').then(m => ({ default: m.DoctorDashboardPage })));
const NewAssignmentPage = lazy(() => import('./pages/NewAssignmentPage').then(m => ({ default: m.NewAssignmentPage })));
const PatientReportPage = lazy(() => import('./pages/PatientReportPage').then(m => ({ default: m.PatientReportPage })));
const AssignedDashboardPage = lazy(() => import('./pages/AssignedDashboardPage').then(m => ({ default: m.AssignedDashboardPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const SessionPage = lazy(() => import('./pages/SessionPage').then(m => ({ default: m.SessionPage })));
const ProgressPage = lazy(() => import('./pages/ProgressPage').then(m => ({ default: m.ProgressPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const WorkoutRunnerPage = lazy(() => import('./pages/WorkoutRunnerPage').then(m => ({ default: m.WorkoutRunnerPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh] p-8 text-teal-700 dark:text-teal-300" role="status" aria-label="Loading page">
    <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-600 rounded-full animate-spin" />
  </div>
);

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: 'doctor' | 'user';
  allowGuest?: boolean;
}> = ({ children, requiredRole, allowGuest }) => {
  const { user } = useAuth();
  if (!user && !allowGuest) {
    return <Navigate to="/login" replace />;
  }
  if (user && requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'doctor' ? '/doctor' : '/assigned'} replace />;
  }
  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isSessionScreen =
    location.pathname.startsWith('/session') || location.pathname === '/workout';

  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-[#0b0e14] text-slate-850 dark:text-slate-100 selection:bg-teal-500 selection:text-white transition-colors">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-600 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      {!isSessionScreen && <Navbar />}
      <main id="main-content" className="flex-1">
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* User Personalized Schedule Dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/my-dashboard" element={<Navigate to="/dashboard" replace />} />

            {/* Automated Hands-Free Sequential Workout Runner */}
            <Route path="/workout" element={<WorkoutRunnerPage />} />

            {/* Doctor Protected Routes */}
            <Route
              path="/doctor"
              element={
                <ProtectedRoute requiredRole="doctor">
                  <DoctorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/assign"
              element={
                <ProtectedRoute requiredRole="doctor">
                  <NewAssignmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/report/:identifier"
              element={
                <ProtectedRoute requiredRole="doctor">
                  <PatientReportPage />
                </ProtectedRoute>
              }
            />

            {/* Patient / Normal User Routes */}
            <Route
              path="/assigned"
              element={
                <ProtectedRoute>
                  <AssignedDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/session/:poseId"
              element={
                <ProtectedRoute allowGuest>
                  <SessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/progress"
              element={
                <ProtectedRoute>
                  <ProgressPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {!isSessionScreen && <Footer />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
