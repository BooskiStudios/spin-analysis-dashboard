const storageKey = 'spin-examiner:auth-token'
const usernameKey = 'spin-examiner:username'

export function getAuthToken() {
  const value = window.localStorage.getItem(storageKey)
  return value && value.trim().length > 0 ? value.trim() : null
}

export function setAuthToken(token: string, username: string) {
  window.localStorage.setItem(storageKey, token.trim())
  window.localStorage.setItem(usernameKey, username.trim())
}

export function clearAuthToken() {
  window.localStorage.removeItem(storageKey)
  window.localStorage.removeItem(usernameKey)
}

export function getUsername() {
  const value = window.localStorage.getItem(usernameKey)
  return value && value.trim().length > 0 ? value.trim() : null
}

