"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ShoppingCart, Menu, ArrowUp, Download, X } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { LoginAuth } from "./login-auth"
import { features } from "@/lib/features"
import { descargarVCard } from "@/lib/contacto"
import { useCuentaCarrito } from "@/hooks/use-carrito"

interface HeaderProps {
  onCartOpen?: () => void
  /**
   * La cuenta, si la pantalla ya la lleva en su estado (Home y la coleccion).
   * Si no se pasa, la cabecera la saca ella sola del carrito guardado, que es
   * lo que necesitan galeria, blog, sobre mi, contacto, novedades y la ficha
   * de producto: esas la pintaban sin pasar nada y salia un cero fijo.
   */
  cartCount?: number
}

/** El menu, en un solo sitio: lo usan el escritorio y el movil. */
const MENU = [
  { etiqueta: "Start", destino: "/" },
  { etiqueta: "Kollektion", destino: "/shop" },
  { etiqueta: "Galerie", destino: "/gallery" },
  { etiqueta: "Blog", destino: "/blog" },
  { etiqueta: "Über mich", destino: "/ueber-mich" },
  { etiqueta: "Kontakt", destino: "/kontakt" },
]

export function Header({ onCartOpen, cartCount }: HeaderProps) {
  const router = useRouter()
  const delAlmacen = useCuentaCarrito()
  // Manda la pantalla si la lleva: ahi el numero se mueve en el mismo
  // instante, sin esperar a ningun aviso.
  const cuenta = cartCount ?? delAlmacen
  const ruta = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [verSubir, setVerSubir] = useState(false)
  const [visible, setVisible] = useState(true)
  const [ultimoY, setUltimoY] = useState(0)

  useEffect(() => {
    const alDesplazar = () => {
      const y = window.scrollY
      setVerSubir(y > 400)
      if (y < 10) setVisible(true)
      else if (y > ultimoY && y > 100) setVisible(false)
      else if (y < ultimoY) setVisible(true)
      setUltimoY(y)
    }
    window.addEventListener("scroll", alDesplazar, { passive: true })
    return () => window.removeEventListener("scroll", alDesplazar)
  }, [ultimoY])

  /**
   * Si este destino es la pantalla en la que estamos.
   * Los anclas (#footer, /#ueber) no marcan nada: no son pantallas.
   * «Start» solo se enciende en la raiz exacta; con startsWith estaria
   * encendido en todas, porque todas las rutas empiezan por "/".
   */
  const estoyEn = (destino: string) => {
    if (destino.startsWith("#") || destino.includes("#")) return false
    if (destino === "/") return ruta === "/"
    return ruta === destino || ruta.startsWith(destino + "/")
  }

  /** Un destino puede ser una pagina, un ancla de esta pagina, o las dos cosas. */
  const ir = (destino: string) => {
    setMenuAbierto(false)
    if (destino.startsWith("#")) {
      document.querySelector(destino)?.scrollIntoView({ behavior: "smooth" })
      return
    }
    router.push(destino)
  }

  return (
    <>
      <header
        className={`bg-white/90 backdrop-blur-md border-b border-brand-tint sticky top-0 z-50 transition-transform duration-300 ${
          visible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container mx-auto px-4 lg:px-8 h-[84px] lg:h-[92px] flex items-center gap-4">

          {/* El logo manda. Antes habia aqui el nombre escrito en dos colores. */}
          <div className="flex-1 min-w-0 flex items-center">
            <button onClick={() => ir("/")} className="flex-shrink-0" aria-label="Sabitas · Startseite">
              {/* El brillo que lo cruza al cargar, como en la primera landing. */}
              <span className="logo-marco">
                <img
                  src="/sabitas/logo.png"
                  alt="Sabitas"
                  className="h-[68px] lg:h-[80px] w-auto object-contain"
                />
                <span className="brillo" />
              </span>
            </button>
          </div>

          {/* El menu, arriba y a la vista. Sin pildora de «Menü» en escritorio. */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {MENU.map((item) => (
              <button
                key={item.etiqueta}
                onClick={() => ir(item.destino)}
                className={`px-3.5 py-2 text-[14px] rounded-full transition-colors ${
                  estoyEn(item.destino)
                    ? "bg-brand-tint text-brand font-semibold"
                    : "text-n-700 font-medium hover:text-brand hover:bg-brand-tint/60"
                }`}
                aria-current={estoyEn(item.destino) ? "page" : undefined}
              >
                {item.etiqueta}
              </button>
            ))}
          </nav>

          {/* Acciones */}
          <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
            <button
              onClick={descargarVCard}
              title="Visitenkarte speichern"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-n-600 rounded-full hover:text-brand hover:bg-brand-tint/60 transition-colors"
            >
              <Download className="w-4 h-4" />
              Visitenkarte
            </button>

            {features.cuentas && (
              <div className="[&_span]:hidden flex items-center">
                <LoginAuth
                  onLoginSuccess={() => {}}
                  onLogout={() => {}}
                  onShowProfile={() => router.push("/profile")}
                  isLightSection
                  variant="button"
                />
              </div>
            )}

            <button
              onClick={() => onCartOpen?.()}
              className="relative flex items-center gap-2 h-11 pl-4 pr-5 rounded-full bg-brand text-white hover:bg-brand-dark transition-colors shadow-sm shadow-brand/25"
              aria-label="Warenkorb"
            >
              <ShoppingCart className="w-[18px] h-[18px]" />
              <span className="text-[13px] font-semibold tabular-nums">{cuenta}</span>
            </button>

            {/* El menu lateral, solo en movil */}
            <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
              <SheetTrigger asChild>
                <button
                  className="lg:hidden h-11 w-11 flex items-center justify-center rounded-full border border-brand-pale text-brand hover:bg-brand-tint transition-colors"
                  aria-label="Menü öffnen"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-[86%] sm:w-80 p-0 border-l border-brand-tint bg-brand-wash flex flex-col"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>

                <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-brand-tint">
                  <img src="/sabitas/logo.png" alt="Sabitas" className="h-10 w-auto object-contain" />
                  <button
                    onClick={() => setMenuAbierto(false)}
                    className="h-9 w-9 flex items-center justify-center rounded-full text-n-500 hover:bg-brand-tint hover:text-brand transition-colors"
                    aria-label="Menü schliessen"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5">
                  {MENU.map((item) => (
                    <button
                      key={item.etiqueta}
                      onClick={() => ir(item.destino)}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl text-[15px] font-semibold border transition-colors ${
                        estoyEn(item.destino)
                          ? "bg-brand text-white border-brand shadow-sm shadow-brand/25"
                          : "bg-white text-n-800 border-brand-tint hover:border-brand-pale hover:text-brand"
                      }`}
                      aria-current={estoyEn(item.destino) ? "page" : undefined}
                    >
                      {item.etiqueta}
                    </button>
                  ))}

                  <button
                    onClick={() => { setMenuAbierto(false); descargarVCard() }}
                    className="w-full flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-[15px] font-semibold text-brand bg-brand-tint/70 hover:bg-brand-tint transition-colors mt-3"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    Visitenkarte speichern
                  </button>
                </nav>

                <p className="px-6 py-5 text-[13px] text-n-500 border-t border-brand-tint bg-white">
                  Handgemacht in der Schweiz · Jedes Stück ein Unikat
                </p>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {verSubir && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed right-6 bottom-6 z-50 bg-brand hover:bg-brand-dark text-white rounded-full p-3 shadow-lg shadow-brand/30 transition-all hover:scale-105 active:scale-95"
          aria-label="Nach oben scrollen"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </>
  )
}
