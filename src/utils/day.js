export function julianDate(date) {
  const start = Date.UTC(date.getFullYear(), 0, 0)
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((current - start) / 86400000)
}

export function getDayForDate(date, dayMode, days) {
  const doy = julianDate(date)
  if (dayMode === 'numbered') {
    const n = days.length
    return days[((doy - 1) % n + n) % n]
  }
  return doy % 2 === 1 ? days[0] : days[1]
}
