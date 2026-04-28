import { StreakSummary } from '../types';
import { XPBar } from './XPBar';

interface Props {
  streak: StreakSummary;
}

// Visualizza la streak settimanale: emoji 🔥, numero settimane,
// tier/bonus, e barra di progresso "workout di questa settimana / goal".
export function StreakBadge({ streak }: Props) {
  const weekLabel = streak.current_streak === 1 ? 'settimana' : 'settimane';
  const bonusColor = streak.streak_tier === 0 ? 'text-text-secondary' : 'text-accent';

  return (
    <div className="bg-card rounded-2xl p-4 border border-gray-800 flex items-center gap-4">
      <span className="text-4xl">🔥</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">
          {streak.current_streak} {weekLabel} di fila
        </p>
        <p className={`text-xs ${bonusColor}`}>
          Tier {streak.streak_tier} · Bonus +{streak.bonus_pct}% XP
          {streak.best_streak > streak.current_streak && (
            <span className="text-text-secondary"> · Record: {streak.best_streak}</span>
          )}
        </p>
        <div className="mt-2">
          <p className="text-xs text-text-secondary mb-1">
            Workout questa settimana: {streak.workouts_this_week}/{streak.weekly_goal}
          </p>
          <XPBar
            current={streak.workouts_this_week}
            max={streak.weekly_goal}
            color="#F59E0B"
            showLabel={false}
            height="sm"
          />
        </div>
      </div>
    </div>
  );
}
