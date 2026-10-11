/**
 * Un fetch que no se puede quedar colgado para siempre.
 *
 * Nacio el 11/10/2026 persiguiendo el fallo de subir fotos desde el iPhone.
 * Se queda porque resolvio algo aparte del fallo: sin tope, cuando una
 * peticion no vuelve, el boton de guardar gira hasta que ella cierra la
 * pagina y nadie sabe si se guardo o no. Con tope, al menos deja de girar y
 * sale un aviso.
 *
 * El error que lanza al agotarse se llama «AbortError»; quien lo recoja puede
 * distinguirlo y decir «se agoto el tiempo» en vez de un error cualquiera.
 */
export async function fetchConTope(
  url: string,
  opciones: RequestInit,
  segundos = 45,
): Promise<Response> {
  const corte = new AbortController()
  const reloj = setTimeout(() => corte.abort(), segundos * 1000)
  try {
    return await fetch(url, { ...opciones, signal: corte.signal })
  } finally {
    clearTimeout(reloj)
  }
}
