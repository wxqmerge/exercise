export const selectClass = 'border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-700'

export const makeSelect = (value, onChange, options, ariaLabel) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    aria-label={ariaLabel}
    className={selectClass}
  >
    {options}
  </select>
)
