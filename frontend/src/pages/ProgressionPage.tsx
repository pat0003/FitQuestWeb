import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MuscleGroupProgress } from '../types';
import { listProgress } from '../api/progression';
import { XPBar } from '../components/XPBar';
import { RankBadge } from '../components/RankBadge';
import { BossCard } from '../components/BossCard';

const GROUP_LABEL: Record<string, string> = {
  petto: 'Petto',
  schiena: 'Schiena',
  spalle: 'Spalle',
  braccia: 'Braccia',
  gambe: 'Gambe',
  core: 'Core',
  cardio: 'Cardio',
};

export function ProgressionPage() {
  const [data, setData] = useState<MuscleGroupProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProgress()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-primary text-text-primary p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Progressione</h1>
            <p className="text-text-secondary text-sm">
              Avanzamento per gruppo muscolare — 6 fasce × 3 sotto-livelli
            </p>
          </div>
          <Link to="/" className="text-text-secondary hover:text-text-primary text-sm">
            ← Dashboard
          </Link>
        </div>

        {error && <p className="text-danger mb-4">{error}</p>}
        {!data && !error && <p className="text-text-secondary">Caricamento…</p>}

        {data && (
          <div className="grid md:grid-cols-2 gap-4">
            {data.map((p) => (
              <div
                key={p.muscle_group}
                className="bg-card rounded-2xl p-4 border border-gray-800"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">
                    {GROUP_LABEL[p.muscle_group] ?? p.muscle_group}
                  </h2>
                  <RankBadge rankInfo={p.rankInfo} />
                </div>

                {p.isMaxRank ? (
                  <p className="text-sm text-accent">🏆 Rango massimo raggiunto</p>
                ) : p.isAtRankUp && p.boss && !p.boss.defeated ? (
                  // sub == 3 → mostra il boss invece della barra XP normale
                  <div>
                    <p className="text-xs text-text-secondary mb-1">
                      Sconfiggi il boss per fare rank-up
                    </p>
                    <BossCard boss={p.boss} muscleGroup={p.muscle_group} />
                  </div>
                ) : (
                  <XPBar current={p.current_xp} max={p.xpToNext} color={p.rankInfo.color} />
                )}

                <p className="text-xs text-text-secondary mt-2">
                  XP totali: <span className="text-text-primary">{p.total_xp.toLocaleString()}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
