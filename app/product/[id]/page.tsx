"use client"

import { useState, useEffect, useRef } from "react"
import { Header } from "@/components/header"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingCart, Check, X, ZoomIn, Heart } from "lucide-react"
import { ProductImage } from "@/components/product-image"
import { getCachedProducts } from "@/lib/products-cache"
import ContactModal from "@/components/contact-modal"
import { avisarCarrito } from "@/lib/carrito"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

function DescriptionBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  // Normalizar saltos de línea Windows (\r\n) y sueltos (\r) a \n para que
  // whitespace-pre-line no muestre un espacio sobrante al inicio de cada línea.
  const cleanText = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n")

  useEffect(() => {
    const el = ref.current
    if (el) setClamped(el.scrollHeight > el.clientHeight)
  }, [text])

  return (
    <div className="bg-n-50 rounded-2xl p-4 border border-n-100">
      <p className="text-[11px] font-bold text-n-300 uppercase tracking-widest mb-2">
        Beschreibung
      </p>
      <p
        ref={ref}
        className={`text-sm text-n-700 leading-relaxed whitespace-pre-line ${!expanded ? "line-clamp-5" : ""}`}
      >
        {cleanText}
      </p>
      {clamped && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-xs font-semibold text-brand hover:underline"
        >
          {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
        </button>
      )}
    </div>
  )
}

interface Product {
  id: number
  name: string
  description: string
  price: number
  image_url?: string
  image_urls?: (string | null)[]
  image_url_candidates?: string[]
  badge?: string
  origin?: string
  supplier?: string
  category?: string
  stock?: number
  weight_kg?: number
  shipping_on_request?: number
}

interface CartItem {
  id: number; name: string; price: number; image: string; image_url?: string
  description: string; heatLevel: number; rating: number
  badge?: string; origin?: string; quantity: number; weight_kg?: number; shipping_on_request?: number
}

function getImages(p: Product): string[] {
  return (p.image_urls ?? [p.image_url]).filter((u): u is string => !!u)
}

export default function ProductPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const backTo = searchParams.get("back")

  const [product, setProduct] = useState<Product | null>(null)
  const [similar, setSimilar] = useState<Product[]>([])
  const [failedSimilar, setFailedSimilar] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [imgIdx, setImgIdx] = useState(0)
  const [added, setAdded] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [isWished, setIsWished] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [zoom, setZoom] = useState({ x: 50, y: 50, active: false })
  const lightboxImgRef = useRef<HTMLDivElement>(null)
  const [paySettings, setPaySettings] = useState<{
    enable_paypal: boolean; enable_stripe: boolean; enable_twint: boolean; enable_invoice: boolean
  } | null>(null)

  useEffect(() => {
    fetch(`/api/payment-settings`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.settings) {
          const s = data.settings
          setPaySettings({
            enable_paypal: !!s.enable_paypal,
            enable_stripe: !!s.enable_stripe,
            enable_twint: !!s.enable_twint,
            enable_invoice: s.enable_invoice !== false,
          })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cantina-cart")
      if (saved) {
        const items: CartItem[] = JSON.parse(saved)
        setCartCount(items.reduce((s, i) => s + i.quantity, 0))
      }
    } catch {}
  }, [added])

  const markSimilarFailed = (id: number) =>
    setFailedSimilar(prev => new Set([...prev, id]))

  // Wishlist sync with shop
  useEffect(() => {
    try {
      const saved = localStorage.getItem("shop-wishlist")
      if (saved && id) setIsWished(JSON.parse(saved).includes(Number(id)))
    } catch {}
  }, [id])

  const toggleWishlist = () => {
    if (!product) return
    try {
      const saved = localStorage.getItem("shop-wishlist")
      const list: number[] = saved ? JSON.parse(saved) : []
      const next = isWished ? list.filter(x => x !== product.id) : [...list, product.id]
      localStorage.setItem("shop-wishlist", JSON.stringify(next))
      setIsWished(!isWished)
    } catch {}
  }

  useEffect(() => {
    setImgIdx(0)
    setProduct(null)
    setSimilar([])
    setFailedSimilar(new Set())
    setLoading(true)
    setError("")

    getCachedProducts()
      .then(({ products }) => {
        const found = products.find((p: any) => String(p.id) === String(id))
        if (found) {
          // Render instantáneo desde el caché (la descripción aquí viene
          // recortada a 150 chars por el slim de localStorage).
          setProduct(found as unknown as Product)
          const cat = (found as any).category
          const hasImage = (p: Product) =>
            getImages(p).length > 0 || !!(p.image_url) || !!(p.image_url_candidates?.length)
          const others = (products as unknown as Product[]).filter(
            (p: Product) => p.id !== (found as any).id && p.category === cat && (p.stock ?? 0) > 0 && hasImage(p)
          )
          setSimilar(others.slice(0, 10))
        }

        // Siempre pedir el producto completo por ID: el caché slim trunca la
        // descripción a 150 chars y la página de detalle necesita el texto entero.
        return fetch(`${API_BASE_URL}/get_products.php?id=${id}`)
          .then(r => r.json())
          .then(d => {
            if (d?.success && d.product) {
              setProduct(prev => ({ ...(prev ?? {}), ...d.product } as Product))
            } else if (!found) {
              setError("Produkt nicht gefunden")
            }
          })
          .catch(() => { if (!found) setError("Verbindungsfehler") })
      })
      .catch(() => setError("Verbindungsfehler"))
      .finally(() => setLoading(false))
  }, [id])

  const addToCart = () => {
    if (!product) return
    try {
      const saved = localStorage.getItem("cantina-cart")
      const cart: CartItem[] = saved ? JSON.parse(saved) : []
      const images = getImages(product)
      const exists = cart.find(i => i.id === product.id)
      const next = exists
        ? cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...cart, {
            id: product.id, name: product.name, price: product.price,
            image: images[0] ?? "/placeholder.svg",
            image_url: images[0],
            image_url_candidates: product.image_url_candidates,
            description: product.description,
            heatLevel: 0, rating: 0,
            badge: product.badge, origin: product.origin, quantity: 1,
            weight_kg: product.weight_kg,
            shipping_on_request: product.shipping_on_request,
          }]
      localStorage.setItem("cantina-cart", JSON.stringify(next))
      localStorage.setItem("cantina-cart-count", next.reduce((s, i) => s + i.quantity, 0).toString())
      // Sin esto, añadir al carrito desde la ficha no movia el numero de
      // arriba: el evento `storage` no llega a la pestaña que escribe.
      avisarCarrito()
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch {}
  }

  const handleLightboxMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = lightboxImgRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoom({ x, y, active: true })
  }

  const handleLightboxTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    const rect = lightboxImgRef.current?.getBoundingClientRect()
    if (!rect || !touch) return
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100
    setZoom({ x, y, active: true })
  }

  const handleLightboxTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = lightboxImgRef.current?.getBoundingClientRect()
    if (!rect || !touch) return
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100
    setZoom({ x, y, active: true })
  }

  if (loading) return (
    <div className="min-h-screen bg-n-50">
      <div className="bg-white border-b border-n-200 h-14 animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-n-150 overflow-hidden animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="bg-gray-100 aspect-square" />
            <div className="p-8 flex flex-col gap-4">
              <div className="h-3 w-24 bg-gray-100 rounded-full" />
              <div className="h-8 w-4/5 bg-gray-200 rounded-full" />
              <div className="h-6 w-32 bg-gray-100 rounded-full" />
              <div className="h-28 bg-gray-100 rounded-2xl" />
              <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
                <div className="h-8 w-32 bg-gray-200 rounded-full" />
                <div className="h-14 bg-gray-100 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (error || !product) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <p className="text-n-600 font-semibold">{error || "Produkt nicht gefunden"}</p>
      <button onClick={() => backTo ? router.push(`/${backTo}`) : router.back()} className="text-sm text-brand font-bold underline">
        Zurück
      </button>
    </div>
  )

  const images = getImages(product)
  const inStock = (product.stock ?? 0) > 0
  // Los candidates son la lista de fallback de UNA sola imagen; si los pasamos
  // cuando hay varias imágenes, ProductImage ignora `src` (images[imgIdx]) y
  // muestra siempre la primera. Con varias imágenes usamos solo src.
  const mainCandidates = images.length > 1 ? undefined : product.image_url_candidates

  return (
    <div className="min-h-screen bg-n-50">

      {/* La misma cabecera que la portada: un solo sitio que mantener. */}
      <Header onCartOpen={() => router.push("/shop")} />

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-sm border border-n-150 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">

            {/* Image side */}
            <div className="bg-n-50 p-6 flex flex-col items-center gap-4 border-b md:border-b-0 md:border-r border-n-100">
              <div
                className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-white shadow-sm cursor-zoom-in"
                onClick={() => setLightbox(true)}
                title="Klicken zum Vergrößern"
              >
                <ProductImage
                  src={images[imgIdx] || product.image_url}
                  candidates={mainCandidates}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
                {product.badge && (
                  <span className="absolute top-3 left-3 bg-brand text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                    {product.badge}
                  </span>
                )}
                {!inStock && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <span className="bg-n-900/80 text-white text-sm font-bold px-4 py-2 rounded-full">
                      Im Moment nicht im Lager
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 flex-wrap justify-center">
                  {images.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                        i === imgIdx
                          ? "border-brand shadow-md scale-105"
                          : "border-transparent opacity-50 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info side */}
            <div className="p-6 md:p-8 flex flex-col gap-4">

              {product.origin && (
                <p className="text-sm font-black uppercase tracking-widest text-n-500">
                  {product.origin}
                </p>
              )}

              <h1 className="text-2xl md:text-3xl font-black text-n-900 leading-tight tracking-tight">
                {product.name}
              </h1>

              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full w-fit ${
                inStock ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-500"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-red-400"}`} />
                {inStock ? `Auf Lager · ${product.stock} Stück` : "Im Moment nicht im Lager"}
              </div>

              {product.description && (
                <DescriptionBlock text={product.description} />
              )}


              {/* Price + CTA */}
              <div className="mt-auto pt-5 border-t border-n-100">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black text-n-900 tracking-tight">
                    {product.price.toFixed(2)}
                  </span>
                  <span className="text-base text-n-400 font-medium">CHF</span>
                </div>
                {product.shipping_on_request ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4">
                    <p className="text-xs text-amber-700 mb-3">Für Versand oder Abholung im Laden schreib mir bitte kurz.</p>
                    <button
                      type="button"
                      onClick={() => setContactOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                    >
                      Kontaktieren
                    </button>
                    <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} subject={`Versand-/Abholanfrage: ${product.name}`} />
                  </div>
                ) : (
                  <p className="text-xs text-n-400 mb-4">* Preise inkl. MwSt., zzgl. Versandkosten</p>
                )}
                <button
                  onClick={addToCart}
                  disabled={!inStock}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all duration-200 ${
                    added
                      ? "bg-emerald-500 text-white"
                      : inStock
                        ? "bg-brand hover:bg-brand-dark text-white shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-gray-100 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                  {added ? "Hinzugefügt!" : inStock ? "In den Warenkorb" : "Im Moment nicht im Lager"}
                </button>
                {!inStock && (
                  <div className="flex justify-center mt-3">
                    <a
                      href={`mailto:hello@sabitas.ch?subject=Verfügbarkeitsanfrage: ${encodeURIComponent(product.name)}&body=Guten Tag,%0A%0Aich würde gerne wissen, ob der folgende Artikel wieder verfügbar ist:%0A%0AArtikel: ${encodeURIComponent(product.name)}%0AArtikel-Nr.: ${product.id}%0A%0AVielen Dank!`}
                      className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-200 transition-colors"
                    >
                      Nach Verfügbarkeit anfragen
                    </a>
                  </div>
                )}
                <button
                  onClick={toggleWishlist}
                  style={{ marginTop: '8px' }}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all duration-200 border ${
                    isWished
                      ? "bg-red-50 border-red-200 text-red-500"
                      : "bg-white border-n-150 text-n-800 hover:border-n-400"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isWished ? "fill-current" : ""}`} />
                  {isWished ? "Auf der Wunschliste" : "Zur Wunschliste hinzufügen"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Similar products */}
      {(() => {
        const visible = similar.filter(p => !failedSimilar.has(p.id)).slice(0, 4)
        if (visible.length === 0) return null
        return (
          <div className="max-w-5xl mx-auto px-4 pb-10">
            <div className="border-t border-n-150 pt-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 bg-brand rounded-full" />
                <h2 className="text-base font-black text-n-900 tracking-tight">Ähnliche Produkte</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {visible.map(p => {
                  const imgs = getImages(p)
                  return (
                    <div
                      key={p.id}
                      onClick={() => router.replace(`/product/${p.id}?back=shop`)}
                      className="bg-white rounded-2xl border border-n-150 overflow-hidden cursor-pointer group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="aspect-square bg-n-50 overflow-hidden">
                        <ProductImage
                          src={imgs[0] || p.image_url}
                          candidates={p.image_url_candidates}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onAllFailed={() => markSimilarFailed(p.id)}
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-n-900 line-clamp-2 leading-tight mb-1">
                          {p.name}
                        </p>
                        <p className="text-sm font-black text-brand">
                          CHF {p.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Trust badges */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="flex flex-wrap justify-center gap-3">
          {[
            "Limitierte Auflagen",
            "Handsigniert",
            "Museumsqualität",
            "Weltweiter Versand",
          ].map((feat) => (
            <div
              key={feat}
              className="flex items-center gap-2 bg-white border border-n-150 rounded-full px-4 py-2 shadow-sm"
            >
              <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </span>
              <span className="text-xs font-semibold text-n-800">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => { setLightbox(false); setZoom({ x: 50, y: 50, active: false }) }}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={() => { setLightbox(false); setZoom({ x: 50, y: 50, active: false }) }}
          >
            <X className="w-6 h-6" />
          </button>
          <div
            ref={lightboxImgRef}
            className="relative overflow-hidden rounded-xl cursor-crosshair select-none bg-n-950"
            style={{ maxWidth: "90vw", maxHeight: "90vh", width: "auto", height: "auto" }}
            onClick={e => e.stopPropagation()}
            onMouseMove={handleLightboxMouseMove}
            onMouseLeave={() => setZoom(z => ({ ...z, active: false }))}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={() => setZoom(z => ({ ...z, active: false }))}
          >
            <div
              className="w-full h-full transition-transform duration-75"
              style={zoom.active ? {
                transform: `scale(2.5)`,
                transformOrigin: `${zoom.x}% ${zoom.y}%`,
              } : { transform: "scale(1)", transformOrigin: "center" }}
            >
              <ProductImage
                src={images[imgIdx] || product.image_url}
                candidates={mainCandidates}
                alt={product.name}
                className="block max-w-[90vw] max-h-[90vh] w-auto h-auto bg-white"
              />
            </div>
          </div>
          {images.length > 1 && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/30 text-white rounded-full p-2 transition-colors backdrop-blur-sm"
                onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + images.length) % images.length); setZoom({ x: 50, y: 50, active: false }) }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/30 text-white rounded-full p-2 transition-colors backdrop-blur-sm"
                onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % images.length); setZoom({ x: 50, y: 50, active: false }) }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setImgIdx(i) }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === imgIdx ? "bg-white scale-125" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment methods */}
      {paySettings && (paySettings.enable_invoice || paySettings.enable_stripe || paySettings.enable_twint || paySettings.enable_paypal) && (
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 pr-4 border-r border-n-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span className="text-[11px] font-semibold text-n-700 tracking-widest uppercase">Sichere Zahlung</span>
          </div>
          {paySettings.enable_invoice && (
            <div className="h-8 px-3 rounded-lg bg-n-50 border border-n-200 flex items-center gap-1.5 shadow-sm">
              <span className="text-base">🏦</span>
              <span className="text-[11px] font-bold text-n-700">Rechnung</span>
            </div>
          )}
          {paySettings.enable_twint && (
            <div className="h-8 px-3 rounded-lg bg-black flex items-center shadow-sm">
              <img src="/twint-logo.svg" alt="Telefon" className="h-5 w-auto" />
            </div>
          )}
          {paySettings.enable_stripe && (
            <>
              <div className="h-8 px-4 rounded-lg bg-[#1A1F71] flex items-center shadow-sm">
                <span className="font-black text-white text-base italic tracking-tight">VISA</span>
              </div>
              <div className="h-8 px-3 rounded-lg bg-white border border-n-200 flex items-center gap-1 shadow-sm">
                <div className="w-4 h-4 rounded-full bg-[#EB001B]" />
                <div className="w-4 h-4 rounded-full bg-[#F79E1B] -ml-2" />
                <span className="text-[11px] font-bold text-n-800 ml-1.5">Mastercard</span>
              </div>
            </>
          )}
          {paySettings.enable_paypal && (
            <div className="h-8 px-3 rounded-lg bg-white border border-n-200 flex items-center shadow-sm">
              <img src="/0014294_paypal-express-payment-plugin.png" alt="PayPal" className="h-6 w-auto object-contain" />
            </div>
          )}
        </div>
      </div>
      )}

    </div>
  )
}
