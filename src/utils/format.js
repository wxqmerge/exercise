export const joinValues = (values) => {
  const arr = Array.isArray(values) ? values : [values];
  return arr.filter(v => v !== '' && v != null).join(' / ') || '—';
};

export const formatSets = (reps = [], weights = []) => {
  const normalize = (v) => Array.isArray(v) ? v : [v];
  const repsArr = normalize(reps);
  const weightsArr = normalize(weights);
  const r0 = repsArr[0] ?? '';
  const w0 = weightsArr[0] ?? '';
  if (!r0 && !w0) return '0/0/0/0/0/0';
  return `${w0 || 0}/${r0 || 0}`;
};

export const formatEntry = (entry) => {
  const reps = entry?.reps ?? '';
  const weights = entry?.weights ?? '';
  return formatSets(reps, weights);
};
