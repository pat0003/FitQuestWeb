import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Placeholder — verrà completata nella Fase 4
export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-primary text-text-primary p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-accent">
              ⚔️ FitQuest Web
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Benvenuto, <span className="text-text-primary font-semibold">{user?.username}</span>!
            </p>
          </div>
          <button
            onClick={logout}
            className="text-text-secondary hover:text-danger text-sm transition-colors"
          >
            Esci
          </button>
        </div>

        {/* CTA workout */}
        <Link
          to="/workout"
          className="block bg-accent text-white rounded-2xl p-6 text-center hover:opacity-90 transition-opacity mb-4"
        >
          🏋️ Inizia nuovo workout
        </Link>

        {/* Placeholder card */}
        <div className="bg-card rounded-2xl p-6 border border-gray-800">
          <p className="text-text-secondary text-center">
            🚧 Dashboard in costruzione — Fase 4
          </p>
          <p className="text-text-secondary text-center text-sm mt-2">
            Autenticazione ✅ · Workout ✅ · Progressione in arrivo
          </p>
        </div>

      </div>
    </div>
  );
}
