const storageKey = 'spin-examiner:user-email'

export function getUserEmail() {
  const value = window.localStorage.getItem(storageKey)
  return value && value.trim().length > 0 ? value.trim() : null
}

export function setUserEmail(email: string) {
  window.localStorage.setItem(storageKey, email.trim())
}

export function clearUserEmail() {
  window.localStorage.removeItem(storageKey)
}
