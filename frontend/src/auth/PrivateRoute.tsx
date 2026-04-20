import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Protegge le route che richiedono autenticazione.
// Se il token è in fase di verifica → mostra uno spinner.
// Se non autenticato → redirect /login.
// Se autenticato → renderizza la route figlia (Outlet).
export function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
