// Guard PHP global — mismo patrón: `global` para compartir entre módulos aislados.

declare global {
  var __phpGuard: { blockedUntil: number } | undefined
}

if (!global.__phpGuard) {
  global.__phpGuard = { blockedUntil: 0 }
}

const state = global.__phpGuard

export function isPhpBlocked(): boolean {
  return Date.now() < state.blockedUntil
}

export function reportPhpError(statusCode?: number): void {
  // 429 = rate limit del hosting → 120s. 502/otros = PHP caído → 60s
  const cooldown = statusCode === 429 ? 120_000 : 60_000
  const until = Date.now() + cooldown
  if (until > state.blockedUntil) state.blockedUntil = until
}

export function clearPhpBlock(): void {
  state.blockedUntil = 0
}
