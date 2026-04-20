import { useState, FormEvent } from 'react';
import { Exercise, ExerciseSet } from '../types';
import { logSet, LogSetBody } from '../api/workouts';

interface Props {
  workoutId: string;
  weId: string;
  exercise: Exercise;
  onSetLogged: (set: ExerciseSet, xpEarned: number) => void;
}

// Form adattivo alla categoria dell'esercizio.
// I campi richiesti variano: pesi → reps+weightKg, corpo_libero → reps+ballastKg, ecc.
export function SetLogger({ workoutId, weId, exercise, onSetLogged }: Props) {
  const [reps, setReps] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [seconds, setSeconds] = useState('');
  const [ballastKg, setBallastKg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastXp, setLastXp] = useState<number | null>(null);

  const reset = () => {
    setReps('');
    setWeightKg('');
    setSeconds('');
    setBallastKg('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const body: LogSetBody = {};
    if (exercise.category === 'pesi') {
      body.reps = parseInt(reps, 10);
      body.weightKg = parseFloat(weightKg);
    } else if (exercise.category === 'corpo_libero') {
      body.reps = parseInt(reps, 10);
      if (ballastKg) body.ballastKg = parseFloat(ballastKg);
    } else if (exercise.category === 'isometrico') {
      body.seconds = parseInt(seconds, 10);
      if (ballastKg) body.ballastKg = parseFloat(ballastKg);
    } else if (exercise.category === 'cardio') {
      body.seconds = parseInt(seconds, 10);
    }

    try {
      const res = await logSet(workoutId, weId, body);
      onSetLogged(res.set, res.xpEarned);
      setLastXp(res.xpEarned);
      reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const numberInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
  ) => (
    <input
      type="number"
      min="0"
      step="0.5"
      required={!placeholder.includes('opz.')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-primary border border-gray-700 rounded px-2 py-1.5 text-sm"
    />
  );

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 bg-primary rounded border border-gray-800">
      <p className="text-xs text-text-secondary mb-2">
        Nuovo set ({exercise.category})
      </p>
      <div className="grid grid-cols-2 gap-2">
        {exercise.category === 'pesi' && (
          <>
            {numberInput(reps, setReps, 'Reps')}
            {numberInput(weightKg, setWeightKg, 'Peso (kg)')}
          </>
        )}
        {exercise.category === 'corpo_libero' && (
          <>
            {numberInput(reps, setReps, 'Reps')}
            {numberInput(ballastKg, setBallastKg, 'Zavorra kg (opz.)')}
          </>
        )}
        {exercise.category === 'isometrico' && (
          <>
            {numberInput(seconds, setSeconds, 'Secondi')}
            {numberInput(ballastKg, setBallastKg, 'Zavorra kg (opz.)')}
          </>
        )}
        {exercise.category === 'cardio' && (
          <>
            {numberInput(seconds, setSeconds, 'Secondi')}
            <div />
          </>
        )}
      </div>

      {error && <p className="text-danger text-xs mt-2">{error}</p>}
      {lastXp !== null && !error && (
        <p className="text-accent text-xs mt-2">+{lastXp} XP</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 w-full bg-accent text-white rounded py-1.5 text-sm hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'Salvataggio…' : 'Registra set'}
      </button>
    </form>
  );
}
