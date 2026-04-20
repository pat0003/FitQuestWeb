import { useEffect, useMemo, useState } from 'react';
import {
  Exercise,
  ExerciseCategory,
  MuscleGroup,
  MUSCLE_GROUPS,
  EXERCISE_CATEGORIES,
} from '../types';
import { listExercises } from '../api/exercises';

interface Props {
  onPick: (exercise: Exercise) => void;
}

// Selettore esercizi con filtri live (muscle group, categoria, testo).
// Carica tutti i 125 esercizi al mount e filtra lato client.
export function ExerciseSelector({ onPick }: Props) {
  const [all, setAll] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<MuscleGroup | ''>('');
  const [category, setCategory] = useState<ExerciseCategory | ''>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listExercises()
      .then((rows) => setAll(rows))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((e) => {
      if (group && e.muscle_group !== group) return false;
      if (category && e.category !== category) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, group, category, search]);

  return (
    <div className="bg-card rounded-2xl p-4 border border-gray-800">
      <h2 className="text-lg font-semibold mb-3">Aggiungi esercizio</h2>

      <div className="space-y-2 mb-3">
        <input
          type="text"
          placeholder="Cerca per nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-primary border border-gray-700 rounded px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as MuscleGroup | '')}
            className="flex-1 bg-primary border border-gray-700 rounded px-2 py-2 text-sm"
          >
            <option value="">Tutti i gruppi</option>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExerciseCategory | '')}
            className="flex-1 bg-primary border border-gray-700 rounded px-2 py-2 text-sm"
          >
            <option value="">Tutte le categorie</option>
            {EXERCISE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-text-secondary text-sm">Caricamento…</p>}
      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="max-h-96 overflow-y-auto divide-y divide-gray-800">
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center justify-between py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{e.name}</p>
              <p className="text-xs text-text-secondary">
                {e.muscle_group} · {e.category} · diff. {e.difficulty}
              </p>
            </div>
            <button
              onClick={() => onPick(e)}
              className="ml-2 px-3 py-1 bg-accent text-white text-sm rounded hover:opacity-90"
            >
              +
            </button>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-text-secondary text-sm py-4 text-center">
            Nessun esercizio trovato
          </p>
        )}
      </div>
    </div>
  );
}
