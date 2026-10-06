export let cache: { data: unknown; at: number } | null = null

export function setCache(data: unknown) {
  cache = { data, at: Date.now() }
}

export function clearCache() {
  cache = null
}
