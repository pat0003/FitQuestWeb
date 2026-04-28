import { RankInfo } from '../types';

interface Props {
  rankInfo: RankInfo;
  size?: 'sm' | 'md';
}

// Pillola colorata che mostra il rango (es. "Bronzo 2").
export function RankBadge({ rankInfo, size = 'md' }: Props) {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`inline-block rounded-full font-semibold text-white ${padding}`}
      style={{ backgroundColor: rankInfo.color }}
    >
      {rankInfo.displayName}
    </span>
  );
}
