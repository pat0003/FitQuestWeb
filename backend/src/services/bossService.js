const BOSS_NAMES_BY_TIER = {
  1: 'Guardiano',
  2: 'Sentinella',
  3: 'Campione',
  4: 'Signore',
  5: 'Titano',
};

const GROUP_LABEL = {
  petto: 'del Petto',
  schiena: 'della Schiena',
  gambe: 'delle Gambe',
  spalle: 'delle Spalle',
  braccia: 'delle Braccia',
  core: 'del Core',
  cardio: 'del Cardio',
};

export function bossNameFor(tier, group) {
  const tierName = BOSS_NAMES_BY_TIER[tier] ?? 'Boss';
  const label = GROUP_LABEL[group];
  return `${tierName} ${label}`;
}
