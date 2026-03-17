export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || ''

export function resolveApiUrl(path: string) {
  if (!API_BASE_URL) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(resolveApiUrl(path))
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return (await response.json()) as T
}

export async function requestJsonWithBody<T>(path: string, method: string, body: unknown): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}
