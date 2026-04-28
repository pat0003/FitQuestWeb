import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listProgress } from '../api/progression';
import { listWorkouts } from '../api/workouts';
import { getStreak } from '../api/streak';
import { MuscleGroupProgress, StreakSummary, Workout } from '../types';
import { XPBar } from '../components/XPBar';
import { RankBadge } from '../components/RankBadge';
import { BossCard } from '../components/BossCard';
import { StreakBadge } from '../components/StreakBadge';

const GROUP_LABEL: Record<string, string> = {
  petto: 'Petto',
  schiena: 'Schiena',
  spalle: 'Spalle',
  braccia: 'Braccia',
  gambe: 'Gambe',
  core: 'Core',
  cardio: 'Cardio',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [progress, setProgress] = useState<MuscleGroupProgress[]>([]);
  const [streak, setStreak] = useState<StreakSummary | null>(null);
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    listProgress().then(setProgress).catch(() => {});
    getStreak().then(setStreak).catch(() => {});
    listWorkouts(1, 0)
      .then((arr) => {
        // Mostra solo workout completati
        const completed = arr.find((w) => w.completed_at !== null);
        if (completed) setLastWorkout(completed);
      })
      .catch(() => {});
  }, []);

  const activeBossGroups = progress.filter(
    (p) => p.isAtRankUp && p.boss && !p.boss.defeated,
  );
  const topProgress = [...progress].sort((a, b) => b.total_xp - a.total_xp).slice(0, 3);

  return (
    <div className="min-h-screen bg-primary text-text-primary p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-accent">⚔️ FitQuest Web</h1>
            <p className="text-text-secondary text-sm mt-1">
              Benvenuto,{' '}
              <span className="text-text-primary font-semibold">{user?.username}</span>!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/settings"
              className="text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              ⚙️ Impostazioni
            </Link>
            <button
              onClick={logout}
              className="text-text-secondary hover:text-danger text-sm transition-colors"
            >
              Esci
            </button>
          </div>
        </div>

        {/* Streak */}
        {streak && (
          <div className="mb-6">
            <StreakBadge streak={streak} />
          </div>
        )}

        {/* CTA workout */}
        <Link
          to="/workout"
          className="block bg-accent text-white rounded-2xl p-6 text-center hover:opacity-90 transition-opacity mb-6"
        >
          🏋️ Inizia nuovo workout
        </Link>

        {/* Boss attivi */}
        {activeBossGroups.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">⚔️ Boss attivi</h2>
            <div className="space-y-2">
              {activeBossGroups.map(
                (p) =>
                  p.boss && (
                    <BossCard
                      key={p.muscle_group}
                      boss={p.boss}
                      muscleGroup={p.muscle_group}
                    />
                  ),
              )}
            </div>
          </section>
        )}

        {/* Progressione (top 3) */}
        <section className="bg-card rounded-2xl p-5 border border-gray-800 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Progressione</h2>
            <Link to="/progression" className="text-sm text-accent hover:underline">
              Vedi tutti →
            </Link>
          </div>

          {topProgress.length === 0 && (
            <p className="text-text-secondary text-sm text-center py-4">
              Nessun workout completato ancora. Inizia il primo!
            </p>
          )}

          <div className="space-y-3">
            {topProgress.map((p) => (
              <div key={p.muscle_group}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {GROUP_LABEL[p.muscle_group] ?? p.muscle_group}
                    </span>
                    <RankBadge rankInfo={p.rankInfo} size="sm" />
                  </div>
                  <span className="text-xs text-text-secondary">
                    {p.total_xp.toLocaleString()} XP
                  </span>
                </div>
                {p.isMaxRank ? (
                  <p className="text-xs text-accent">🏆 Rango massimo</p>
                ) : (
                  <XPBar
                    current={p.current_xp}
                    max={p.xpToNext}
                    color={p.rankInfo.color}
                    showLabel={false}
                    height="sm"
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Ultimo workout */}
        {lastWorkout && (
          <section className="bg-card rounded-2xl p-5 border border-gray-800">
            <h2 className="text-lg font-semibold mb-2">Ultimo workout</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">
                  {lastWorkout.completed_at ? formatDate(lastWorkout.completed_at) : '—'}
                </p>
                {lastWorkout.notes && (
                  <p className="text-xs text-text-secondary mt-1">{lastWorkout.notes}</p>
                )}
              </div>
              <span className="text-accent font-semibold">
                {lastWorkout.total_xp.toLocaleString()} XP
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
