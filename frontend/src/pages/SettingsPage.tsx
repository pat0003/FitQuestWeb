import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiPatch } from '../api/client';
import { User } from '../types';

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [bodyWeightKg, setBodyWeightKg] = useState(String(user?.body_weight_kg ?? 75));
  const [weeklyGoal, setWeeklyGoal] = useState(String(user?.weekly_goal ?? 3));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const bw = parseFloat(bodyWeightKg);
    const goal = parseInt(weeklyGoal, 10);
    if (Number.isNaN(bw) || bw <= 0 || bw > 300) {
      setError('Peso non valido (1-300 kg)');
      setSubmitting(false);
      return;
    }
    if (Number.isNaN(goal) || goal < 1 || goal > 7) {
      setError('Obiettivo settimanale deve essere tra 1 e 7');
      setSubmitting(false);
      return;
    }

    try {
      await apiPatch<{ user: User }>('/user/profile', {
        bodyWeightKg: bw,
        weeklyGoal: goal,
      });
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary text-text-primary p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">⚙️ Impostazioni</h1>
          <Link to="/" className="text-text-secondary hover:text-text-primary text-sm">
            ← Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-5 border border-gray-800 space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Peso corporeo (kg)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="300"
              value={bodyWeightKg}
              onChange={(e) => setBodyWeightKg(e.target.value)}
              className="w-full bg-primary border border-gray-700 rounded px-3 py-2"
              required
            />
            <p className="text-xs text-text-secondary mt-1">
              Usato dalle formule XP per esercizi a corpo libero, isometrici e cardio.
            </p>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Obiettivo settimanale (workout/settimana)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="7"
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(e.target.value)}
              className="w-full bg-primary border border-gray-700 rounded px-3 py-2"
              required
            />
            <p className="text-xs text-text-secondary mt-1">
              Determina quando la streak avanza. Le modifiche valgono dalla{' '}
              <span className="text-accent">settimana successiva</span> (anti-exploit).
            </p>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}
          {success && <p className="text-success text-sm">✅ Profilo aggiornato</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-white rounded py-2 hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Salvataggio…' : 'Salva'}
          </button>
        </form>
      </div>
    </div>
  );
}
