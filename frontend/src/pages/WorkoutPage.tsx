import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Exercise,
  ExerciseSet,
  WorkoutExercise,
  CompleteWorkoutResponse,
} from '../types';
import {
  startWorkout,
  addExerciseToWorkout,
  completeWorkout,
} from '../api/workouts';
import { ExerciseSelector } from '../components/ExerciseSelector';
import { SetLogger } from '../components/SetLogger';

type Status = 'idle' | 'active' | 'completed';

// Enriched WE con `exercise` e `sets` sempre definiti
type EnrichedWE = WorkoutExercise & { exercise: Exercise; sets: ExerciseSet[] };

export function WorkoutPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<EnrichedWE[]>([]);
  const [selectedWeId, setSelectedWeId] = useState<string | null>(null);
  const [summary, setSummary] = useState<CompleteWorkoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    try {
      const { workout } = await startWorkout();
      setWorkoutId(workout.id);
      setStatus('active');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleAddExercise = async (exercise: Exercise) => {
    if (!workoutId) return;
    setError(null);
    try {
      const { workoutExercise } = await addExerciseToWorkout(workoutId, exercise.id);
      const enriched: EnrichedWE = { ...workoutExercise, exercise, sets: [] };
      setExercises((prev) => [...prev, enriched]);
      setSelectedWeId(enriched.id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSetLogged = (weId: string, set: ExerciseSet, xp: number) => {
    setExercises((prev) =>
      prev.map((we) =>
        we.id === weId
          ? { ...we, sets: [...we.sets, set], xp_earned: we.xp_earned + xp }
          : we,
      ),
    );
  };

  const handleComplete = async () => {
    if (!workoutId) return;
    setError(null);
    try {
      const res = await completeWorkout(workoutId);
      setSummary(res);
      setStatus('completed');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // ── UI ─────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="min-h-screen bg-primary text-text-primary p-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Nuovo workout</h1>
          <p className="text-text-secondary mb-6">
            Inizia una sessione di allenamento. Gli XP verranno calcolati automaticamente ad
            ogni set registrato.
          </p>
          {error && <p className="text-danger mb-4">{error}</p>}
          <button
            onClick={handleStart}
            className="bg-accent text-white rounded px-4 py-2 hover:opacity-90"
          >
            🏋️ Inizia workout
          </button>
          <Link
            to="/"
            className="ml-3 text-text-secondary hover:text-text-primary text-sm"
          >
            Torna alla dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'completed' && summary) {
    return (
      <div className="min-h-screen bg-primary text-text-primary p-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">✅ Workout completato</h1>
          <p className="text-accent text-xl mb-4">
            Totale: {summary.xpSummary.totalXp} XP
          </p>

          <div className="bg-card rounded-2xl p-4 border border-gray-800">
            <h2 className="text-sm text-text-secondary mb-3">XP per gruppo muscolare</h2>
            <ul className="space-y-1">
              {Object.entries(summary.xpSummary.perMuscleGroup).map(([g, xp]) => (
                <li key={g} className="flex justify-between text-sm">
                  <span className="capitalize">{g}</span>
                  <span className="text-accent">{xp} XP</span>
                </li>
              ))}
              {Object.keys(summary.xpSummary.perMuscleGroup).length === 0 && (
                <li className="text-text-secondary text-sm">Nessun XP registrato</li>
              )}
            </ul>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              to="/"
              className="text-text-secondary hover:text-text-primary text-sm"
            >
              Dashboard
            </Link>
            <button
              onClick={() => {
                setStatus('idle');
                setWorkoutId(null);
                setExercises([]);
                setSelectedWeId(null);
                setSummary(null);
              }}
              className="ml-auto bg-accent text-white rounded px-3 py-1.5 text-sm hover:opacity-90"
            >
              Nuovo workout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // status === 'active'
  return (
    <div className="min-h-screen bg-primary text-text-primary p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Workout in corso</h1>
          <button
            onClick={handleComplete}
            className="bg-success text-white rounded px-4 py-2 hover:opacity-90"
          >
            Completa workout
          </button>
        </div>

        {error && <p className="text-danger mb-4">{error}</p>}

        <div className="grid md:grid-cols-2 gap-6">
          <ExerciseSelector onPick={handleAddExercise} />

          <div className="bg-card rounded-2xl p-4 border border-gray-800">
            <h2 className="text-lg font-semibold mb-3">Esercizi</h2>
            {exercises.length === 0 && (
              <p className="text-text-secondary text-sm">
                Nessun esercizio ancora. Aggiungine uno dalla colonna di sinistra.
              </p>
            )}
            <ul className="space-y-3">
              {exercises.map((we) => (
                <li key={we.id} className="border border-gray-800 rounded p-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setSelectedWeId(selectedWeId === we.id ? null : we.id)
                    }
                  >
                    <div>
                      <p className="font-medium text-sm">{we.exercise.name}</p>
                      <p className="text-xs text-text-secondary">
                        {we.sets.length} set · {we.xp_earned} XP
                      </p>
                    </div>
                    <span className="text-xs text-accent">
                      {selectedWeId === we.id ? '▲' : '▼'}
                    </span>
                  </div>

                  {we.sets.length > 0 && (
                    <ul className="mt-2 text-xs text-text-secondary space-y-0.5">
                      {we.sets.map((s) => (
                        <li key={s.id}>
                          #{s.set_number}{' '}
                          {s.reps !== null ? `${s.reps} reps` : ''}{' '}
                          {s.weight_kg !== null ? `× ${s.weight_kg}kg` : ''}
                          {s.seconds !== null ? `${s.seconds}s` : ''}
                          {s.ballast_kg ? ` (+${s.ballast_kg}kg zav.)` : ''}
                          {' · '}
                          <span className="text-accent">+{s.xp_earned} XP</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {selectedWeId === we.id && workoutId && (
                    <SetLogger
                      workoutId={workoutId}
                      weId={we.id}
                      exercise={we.exercise}
                      onSetLogged={(set, xp) => handleSetLogged(we.id, set, xp)}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
