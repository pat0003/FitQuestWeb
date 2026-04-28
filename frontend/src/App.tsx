import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { PrivateRoute } from './auth/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { ProgressionPage } from './pages/ProgressionPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Route pubbliche */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Route protette — richiedono JWT valido */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/workout" element={<WorkoutPage />} />
            <Route path="/progression" element={<ProgressionPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
