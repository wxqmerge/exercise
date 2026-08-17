export const safeParse = (value, fallback = {}) => {
  try {
    const parsed = JSON.parse(value || 'null')
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

export const safeParseLocalStorage = (key, fallback = {}) => {
  try {
    const raw = localStorage.getItem(key)
    return safeParse(raw, fallback)
  } catch {
    return fallback
  }
}
