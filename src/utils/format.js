export const joinValues = (values) => {
  return values ? String(values) : '—';
};

export const formatSets = (reps = '', weights = '') => {
  const r = String(reps ?? '');
  const w = String(weights ?? '');
  if (!r && !w) return '0 / 0';
  return `${r || 0} / ${w || 0}`;
};

export const formatEntry = (entry) => {
  const reps = entry?.reps ?? '';
  const weights = entry?.weights ?? '';
  return formatSets(reps, weights);
};
