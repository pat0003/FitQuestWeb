interface Props {
  current: number;
  max: number;
  color?: string;
  showLabel?: boolean;
  height?: 'sm' | 'md';
}

// Barra di progressione XP riusabile.
// Width = (current / max) * 100%, capped al 100%.
export function XPBar({ current, max, color = '#7C3AED', showLabel = true, height = 'md' }: Props) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.round((current / safeMax) * 100));
  const h = height === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div>
      <div className={`w-full bg-gray-800 rounded-full overflow-hidden ${h}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-text-secondary mt-1 text-right">
          {current.toLocaleString()} / {max.toLocaleString()} XP ({pct}%)
        </p>
      )}
    </div>
  );
}
