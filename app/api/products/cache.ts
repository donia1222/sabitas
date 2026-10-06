declare global {
  // eslint-disable-next-line no-var
  var _productsCache: Map<string, { data: unknown; at: number }> | undefined
}

if (!globalThis._productsCache) {
  globalThis._productsCache = new Map()
}

export const cache = globalThis._productsCache!

export function clearCache() {
  globalThis._productsCache?.clear()
}
