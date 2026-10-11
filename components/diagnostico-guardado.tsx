"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Copy, Check, X } from "lucide-react"

/**
 * El cartel que sale cuando guardar falla.
 *
 * PROVISIONAL · 11/10/2026. Esta aqui para cazar un fallo que solo aparece a
 * veces y solo en el movil: se añade una imagen a una categoria o a un
 * producto, se pulsa guardar, y no pasa nada —ni se guarda, ni se cierra el
 * modal, ni se ve ningun error—. En el movil no hay consola donde mirar, asi
 * que el error tiene que salir en la propia pantalla.
 *
 * Se quita en cuanto sepamos que era.
 *
 * No se enseña nunca si todo va bien, asi que Sabrina no lo vera salvo que
 * le falle justo eso que nos falta por entender. Y si le sale, al menos sabra
 * que ha pasado algo en vez de quedarse mirando un boton que gira.
 */
export function DiagnosticoGuardado({
  lineas,
  onCerrar,
}: {
  lineas: string[]
  onCerrar: () => void
}) {
  const [copiado, setCopiado] = useState(false)

  // Traer el cartel a la vista en cuanto aparece: en el movil sale por debajo
  // de lo que se esta mirando y es facil no verlo.
  useEffect(() => {
    if (lineas.length === 0) return
    const t = setTimeout(() => {
      document.getElementById("diag-texto")?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 60)
    return () => clearTimeout(t)
  }, [lineas.length])

  if (lineas.length === 0) return null

  const texto = lineas.join("\n")

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Safari puede negarse si no viene de un gesto directo. Entonces se
      // selecciona el texto y que lo copie a mano.
      const el = document.getElementById("diag-texto")
      if (el) {
        const r = document.createRange()
        r.selectNodeContents(el)
        const s = window.getSelection()
        s?.removeAllRanges()
        s?.addRange(r)
      }
    }
  }

  return (
    <div className="mx-6 mb-3 rounded-xl border-2 border-red-300 bg-red-50 overflow-hidden">
      <div className="flex items-start gap-2 px-3 py-2.5 border-b border-red-200">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-red-900 leading-tight">
            Speichern fehlgeschlagen
          </p>
          <p className="text-[11.5px] text-red-700 leading-snug mt-0.5">
            Bitte diesen Text kopieren und an Roberto schicken.
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Schliessen"
          className="shrink-0 w-6 h-6 rounded-full text-red-400 hover:text-red-700 hover:bg-red-100 flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <pre
        id="diag-texto"
        /* Sin altura maxima a proposito: lo que hace falta leer son las
           ULTIMAS lineas, y con un recorte y una barra interior se quedaban
           escondidas justo las que importan. Que crezca; el modal ya tiene
           su propio scroll. */
        className="px-3 py-2.5 text-[11px] leading-relaxed text-red-900 whitespace-pre-wrap break-words font-mono"
      >
        {texto}
      </pre>

      <div className="px-3 pb-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold px-3 py-1.5"
        >
          {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copiado ? "Kopiert" : "Text kopieren"}
        </button>
        <BotonSonda />
      </div>
    </div>
  )
}

/**
 * Apunta lo que va pasando mientras se guarda, para poder enseñarlo si falla.
 *
 * La gracia esta en que apunta ANTES de cada paso, no despues: si la peticion
 * se queda colgada para siempre, la ultima linea dice exactamente donde se
 * quedo.
 */
export function crearApunte() {
  const t0 = Date.now()
  const lineas: string[] = []
  const apuntar = (texto: string) => {
    lineas.push(`${String(Date.now() - t0).padStart(5, " ")} ms · ${texto}`)
  }
  return { lineas, apuntar }
}

/** Lo que se puede contar de un fichero sin abrirlo. */
export function describirFichero(f: File | null | undefined): string {
  if (!f) return "sin fichero"
  const mb = (f.size / (1024 * 1024)).toFixed(2)
  return `«${f.name}» · ${f.type || "sin tipo"} · ${f.size} bytes (${mb} MB)`
}

/**
 * Un fetch que no se puede quedar colgado para siempre.
 *
 * Sin esto, el boton gira hasta que ella cierra la pagina y no sabemos si la
 * peticion salio, llego o volvio.
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

/**
 * Lo que de verdad va dentro del formulario, campo por campo.
 *
 * Añadido el 11/10/2026 despues de que el PHP contestara «falta el nombre»:
 * sin esto no hay forma de saber desde el movil si un campo viaja vacio o
 * directamente no viaja.
 */
export function describirFormulario(fd: FormData): string {
  const partes: string[] = []
  fd.forEach((valor, clave) => {
    if (valor instanceof File) {
      partes.push(`${clave}=[fichero ${valor.name} ${valor.size}B]`)
    } else {
      const t = String(valor)
      partes.push(`${clave}=${t === "" ? "(VACIO)" : JSON.stringify(t.slice(0, 60))}`)
    }
  })
  return partes.length ? partes.join(" · ") : "(el formulario va VACIO)"
}

/**
 * PROVISIONAL · manda un formulario minimo a /api/diag-upload y enseña, en
 * crudo, lo que ha llegado al servidor.
 *
 * Arma el formulario EL NAVEGADOR, exactamente igual que el de guardar, asi
 * que lo que se vea aqui es como serializa multipart este Safari. Es lo unico
 * que nos falta por mirar: los dos parsers —el de Node y el de PHP— se
 * atragantan con lo mismo, y eso no pasa con un cuerpo normal.
 *
 * No guarda nada en ningun sitio.
 */
function BotonSonda() {
  const [estado, setEstado] = useState<"quieto" | "yendo" | "listo">("quieto")
  const [salida, setSalida] = useState("")

  const lanzar = async () => {
    setEstado("yendo")
    try {
      // Un fichero diminuto hecho aqui mismo, para no depender de la galeria.
      const trozo = new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], { type: "image/jpeg" })
      const fd = new FormData()
      fd.append("texto", "hola")
      fd.append("numero", "247")
      fd.append("image", new File([trozo], "sonda.jpg", { type: "image/jpeg" }))

      const r = await fetch("/api/diag-upload", { method: "POST", body: fd })
      setSalida(JSON.stringify(await r.json(), null, 1))
    } catch (e: any) {
      setSalida(`la sonda tampoco pudo salir · ${e?.name}: ${e?.message}`)
    } finally {
      setEstado("listo")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={lanzar}
        disabled={estado === "yendo"}
        className="inline-flex items-center rounded-lg bg-white border border-red-300 text-red-800 text-[12px] font-bold px-3 py-1.5 disabled:opacity-50"
      >
        {estado === "yendo" ? "Prüfe…" : "Technische Prüfung"}
      </button>
      {salida && (
        <pre className="w-full mt-1 rounded-lg bg-white border border-red-200 p-2 text-[10.5px] leading-snug text-red-900 whitespace-pre-wrap break-all font-mono">
          {salida}
        </pre>
      )}
    </>
  )
}
