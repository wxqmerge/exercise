export const joinValues = (values) =>
  Array.isArray(values) ? values.filter(v => v !== '').join(' / ') || '—' : '—';

export const formatSets = (reps = [], weights = []) => {
  const repsArr = Array.isArray(reps) && reps.length ? reps : ['', '', ''];
  const weightsArr = Array.isArray(weights) && weights.length ? weights : ['', '', ''];
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
