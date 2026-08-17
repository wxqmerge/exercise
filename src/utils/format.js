export const joinValues = (values) =>
  Array.isArray(values) ? values.filter(v => v !== '').join(' / ') || '—' : '—';

export const formatSets = (reps = [], weights = []) => {
  const repsArr = Array.isArray(reps) && reps.length ? reps : [0,0,0];
  const weightsArr = Array.isArray(weights) && weights.length ? weights : [0,0,0];
  return repsArr.map((r, i) => `${weightsArr[i] || 0}/${r || 0}`).join('/');
};

export const formatEntry = (entry) => formatSets(entry?.reps, entry?.weights);
