import { BossSummary, MuscleGroup } from '../types';

interface Props {
  boss: BossSummary;
  muscleGroup: MuscleGroup;
}

// Card boss con barra HP rossa.
// Visibile solo quando isActive (rank_sub == 3 && !defeated).
export function BossCard({ boss, muscleGroup }: Props) {
  const safeMax = boss.max_hp > 0 ? boss.max_hp : 1;
  const pct = Math.max(0, Math.min(100, Math.round((boss.current_hp / safeMax) * 100)));

  return (
    <div className="bg-card border border-danger/40 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">⚔️</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{boss.boss_name}</p>
            <p className="text-xs text-text-secondary capitalize">
              Tier {boss.tier} · {muscleGroup}
            </p>
          </div>
        </div>
        <span className="text-xs text-danger font-mono">
          {boss.current_hp.toLocaleString()} / {boss.max_hp.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-gray-800 rounded-full overflow-hidden h-2">
        <div
          className="h-full bg-danger rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
