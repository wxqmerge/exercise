const KEY_STORAGE = 'exercise-key'

export const getApiKey = () => localStorage.getItem(KEY_STORAGE) || ''

export const setApiKey = (key) => localStorage.setItem(KEY_STORAGE, key)

export const clearApiKey = () => localStorage.removeItem(KEY_STORAGE)

export const apiFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), 'X-App-Key': getApiKey() },
  })

export const getKeyFromUrl = () => {
  const base = (import.meta.env.BASE_URL || '/').split('/').filter(Boolean)
  const path = window.location.pathname.split('/').filter(Boolean)
  const extra = path.slice(base.length)
  return extra.length === 1 ? extra[0] : ''
}
