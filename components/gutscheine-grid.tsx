"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShoppingCart, Check, Gift, ArrowLeft, ArrowUp, Truck } from "lucide-react"
import { ShoppingCartComponent } from "@/components/shopping-cart"
import { LoginAuth } from "@/components/login-auth"
import { CheckoutPage } from "@/components/checkout-page"
import { Footer } from "@/components/footer"
import { useToast } from "@/hooks/use-toast"

interface GiftCard {
  id: number
  name: string
  description: string
  amount: number
  image: string | null
  is_active: number
}

interface CartItem {
  id: number
  name: string
  price: number
  image: string
  description: string
  heatLevel: number
  rating: number
  quantity: number
  item_type: "gutschein"
  gift_card_id: number
}

const CART_KEY = "cantina-cart"
const CART_COUNT_KEY = "cantina-cart-count"
const gcEnabled = true
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export default function GutscheineGrid() {
  const router = useRouter()
  const [cards, setCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartCount, setCartCount] = useState(0)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())
  const [cartOpen, setCartOpen] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showBackTop, setShowBackTop] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [customAmount, setCustomAmount] = useState<string>("")
  const [amountError, setAmountError] = useState<string>("")
  const { toast } = useToast()
  const todayStr = new Date().toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })

  // Animación "volar al carrito"
  const previewImgRef = useRef<HTMLImageElement>(null)
  const cartBtnRef = useRef<HTMLButtonElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()
  const [flyImg, setFlyImg] = useState<{ x: number; y: number; w: number; h: number; tx: number; ty: number; scale: number; active: boolean } | null>(null)
  const [cartBump, setCartBump] = useState(false)

  const flyToCart = () => {
    const img = previewImgRef.current
    const cart = cartBtnRef.current
    if (!img || !cart) return
    const r = img.getBoundingClientRect()
    const c = cart.getBoundingClientRect()
    setFlyImg({ x: r.left, y: r.top, w: r.width, h: r.height, tx: 0, ty: 0, scale: 1, active: false })
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const dx = (c.left + c.width / 2) - (r.left + r.width / 2)
      const dy = (c.top + c.height / 2) - (r.top + r.height / 2)
      setFlyImg(prev => prev ? { ...prev, tx: dx, ty: dy, scale: 0.04, active: true } : null)
    }))
    setTimeout(() => { setFlyImg(null); setCartBump(true); setTimeout(() => setCartBump(false), 300) }, 720)
  }

  useEffect(() => {
    loadCards()
    loadCart()
  }, [])

  // Pre-relleno desde el banner del home: /gutscheine?betrag=50 o ?custom=1
  useEffect(() => {
    const betrag = searchParams.get("betrag")
    const custom = searchParams.get("custom")
    if (!betrag && !custom) return
    if (betrag && /^\d{1,4}$/.test(betrag)) setCustomAmount(betrag)
    // Esperar a que la tarjeta esté montada, luego desplazar y enfocar
    const t = setTimeout(() => {
      customInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      customInputRef.current?.focus()
    }, 350)
    return () => clearTimeout(t)
  }, [searchParams])

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      setShowBackTop(currentY > 400)
      if (currentY < 10) {
        setHeaderVisible(true)
      } else if (currentY > lastScrollY && currentY > 100) {
        setHeaderVisible(false)
      } else if (currentY < lastScrollY) {
        setHeaderVisible(true)
      }
      setLastScrollY(currentY)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [lastScrollY])

  const loadCards = async () => {
    try {
      const res = await fetch("/api/gutscheine")
      const data = await res.json()
      if (data.success) setCards(data.gift_cards)
    } catch {}
    finally { setLoading(false) }
  }

  const loadCart = () => {
    try {
      const saved = localStorage.getItem(CART_KEY)
      if (saved) {
        const data: CartItem[] = JSON.parse(saved)
        setCart(data)
        setCartCount(data.reduce((s, i) => s + i.quantity, 0))
      }
    } catch {}
  }

  const saveCart = useCallback((c: CartItem[]) => {
    localStorage.setItem(CART_KEY, JSON.stringify(c))
    localStorage.setItem(CART_COUNT_KEY, c.reduce((s, i) => s + i.quantity, 0).toString())
  }, [])

  const addCustomToCart = () => {
    const amount = parseFloat(customAmount.replace(",", "."))
    if (isNaN(amount) || amount <= 0) {
      setAmountError("Bitte geben Sie einen gültigen Betrag ein")
      return
    }
    if (amount < 20) {
      setAmountError("Der Mindestbetrag für einen Gutschein beträgt CHF 20.–")
      return
    }
    const baseCard = cards[0]
    if (!baseCard) {
      toast({ title: "Fehler", description: "Kein Gutschein verfügbar" })
      return
    }
    setAmountError("")
    const cartId = -(Date.now())
    const next: CartItem[] = [...cart, {
      id: cartId,
      name: `Geschenkgutschein CHF ${amount.toFixed(2)}`,
      price: amount,
      image: "/icon-192x192.png",
      description: baseCard.description ?? "",
      heatLevel: 0,
      rating: 0,
      quantity: 1,
      item_type: "gutschein" as const,
      gift_card_id: baseCard.id,
    }]
    setCart(next)
    saveCart(next)
    setCartCount(next.reduce((s, i) => s + i.quantity, 0))
    setAddedIds(prev => new Set([...prev, baseCard.id]))
    setTimeout(() => setAddedIds(prev => { const s = new Set(prev); s.delete(baseCard.id); return s }), 2000)
    toast({ title: "Gutschein hinzugefügt", description: `CHF ${amount.toFixed(2)}` })
    flyToCart()
    setCustomAmount("")
  }

  const removeFromCart = (cartId: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === cartId)
      const next = item && item.quantity > 1
        ? prev.map(i => i.id === cartId ? { ...i, quantity: i.quantity - 1 } : i)
        : prev.filter(i => i.id !== cartId)
      saveCart(next)
      setCartCount(next.reduce((s, i) => s + i.quantity, 0))
      return next
    })
  }

  const clearCart = () => {
    setCart([]); setCartCount(0)
    localStorage.setItem(CART_KEY, "[]")
    localStorage.setItem(CART_COUNT_KEY, "0")
  }

  if (showCheckout) {
    return (
      <CheckoutPage
        cart={cart}
        onBackToStore={() => setShowCheckout(false)}
        onRemoveFromCart={removeFromCart}
        onClearCart={clearCart}
      />
    )
  }

  return (
    <>
      {/* Clon que "vuela" al carrito */}
      {flyImg && (
        <img
          src="/gutscheine.png"
          alt=""
          style={{
            position: "fixed",
            left: flyImg.x,
            top: flyImg.y,
            width: flyImg.w,
            height: flyImg.h,
            transform: `translate(${flyImg.tx}px, ${flyImg.ty}px) scale(${flyImg.scale})`,
            transition: flyImg.active ? "transform 0.7s cubic-bezier(0.5,-0.3,0.3,1.2), opacity 0.7s ease-in" : "none",
            opacity: flyImg.active ? 0.15 : 0.95,
            zIndex: 60,
            pointerEvents: "none",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        />
      )}

      {/* Side cart modal */}
      <ShoppingCartComponent
        isOpen={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        onAddToCart={() => {}}
        onRemoveFromCart={removeFromCart}
        onGoToCheckout={() => { setCartOpen(false); setShowCheckout(true) }}
        onClearCart={clearCart}
      />

      {/* Back to top */}
      {showBackTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed right-6 bottom-6 z-50 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl p-3 shadow-xl border border-gray-200 transition-all hover:scale-110 active:scale-95"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      <div className="min-h-screen bg-n-50">

        {/* ── Top bar — same as shop ── */}
        <div className={`bg-white border-b border-n-200 sticky top-0 z-30 shadow-sm transition-transform duration-300 ${headerVisible ? "translate-y-0" : "-translate-y-full"}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-32 flex items-center gap-3">


            {/* Back button (mobile + desktop) */}
            <button
              onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-brand hover:text-white transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-n-150 flex-shrink-0" />

            {/* Logo — hidden on mobile */}
            <img src="/sabitas/logo.png" alt="Sabitas" className="hidden sm:block h-14 w-auto object-contain flex-shrink-0" />

            {/* Title — mobile only */}
            <span className="sm:hidden flex-shrink-0" style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: '1.1rem', color: '#2B2B2A' }}>Gutscheine</span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right: login + cart */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="[&_span]:hidden sm:[&_span]:inline-block flex items-center justify-center">
                <LoginAuth
                  onLoginSuccess={() => {}}
                  onLogout={() => {}}
                  onShowProfile={() => router.push("/profile")}
                  isLightSection={true}
                  variant="button"
                />
              </div>
              <button
                ref={cartBtnRef}
                onClick={() => gcEnabled && setCartOpen(true)}
                className={`relative flex flex-col items-center p-2 rounded-xl transition-transform duration-300 ${cartBump ? "scale-125" : "scale-100"} ${gcEnabled ? "hover:bg-n-50 cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
                disabled={!gcEnabled}
              >
                <ShoppingCart className="w-6 h-6 text-n-700" />
                {gcEnabled ? (
                  <span className="text-[10px] text-n-700 mt-0.5 leading-none hidden sm:block">Warenkorb</span>
                ) : (
                  <span className="text-[9px] text-n-400 mt-0.5 leading-none hidden sm:block whitespace-nowrap">Demnächst</span>
                )}
                {gcEnabled && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#CC0000] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Hero banner */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: "220px", backgroundImage: "url('/images/shop/header.jpeg')", backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-lg">Geschenkgutscheine</h1>
            <p className="text-sm sm:text-base text-white/80 mt-3 max-w-xl">Verschenken Sie Freude – für Angler, Jäger und Outdoor-Enthusiasten.</p>
          </div>
        </div>

        {/* Single custom-amount card */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          {!loading && cards.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-semibold">Keine Gutscheine verfügbar</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-n-200 flex flex-col sm:flex-row">
              {/* Center: info */}
              <div className="flex flex-col justify-center flex-1 px-4 sm:px-6 py-4 gap-1 min-w-0">
                <span className="text-[10px] font-black tracking-[0.15em] uppercase text-[#b40000] flex items-center gap-1"><Gift className="w-3 h-3 flex-shrink-0" />Geschenkgutschein</span>
                <h3 className="text-lg sm:text-xl font-black text-n-900 leading-tight">Individueller Betrag</h3>
                <p className="text-xs sm:text-sm text-gray-500">Wählen Sie den gewünschten Betrag in CHF.</p>
                <p className="text-[9px] font-bold tracking-[0.08em] uppercase text-brand mt-1 leading-relaxed">
                  ALLES FUER DIE BACH FLUSS UND SEEFISCHE<br />
                  ** GROSSE AUSWAHL<br />
                  ** SCHNELLER VERSAND
                </p>
              </div>

              {/* Right: input + CTA */}
              <div className="flex flex-col items-center justify-center px-4 sm:px-6 py-4 gap-3 flex-shrink-0 border-t sm:border-t-0 sm:border-l border-n-200 sm:w-[220px]">
                <div className="w-full">
                  <label className="text-[10px] font-bold text-n-500 uppercase tracking-widest block text-center mb-1">Betrag (CHF)</label>
                  <input
                    ref={customInputRef}
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={e => {
                      let val = e.target.value.replace(/[^0-9.,]/g, "")
                      // Sin cero a la izquierda (05 -> 5, y un 0 solo no cuenta)
                      val = val.replace(/^0+(\d)/, "$1")
                      if (val === "0") val = ""
                      // Máximo 4 cifras (sin contar separadores decimales)
                      if (val.replace(/[.,]/g, "").length > 4) return
                      setCustomAmount(val)
                      if (amountError) setAmountError("")
                    }}
                    placeholder="z.B. 50"
                    className={`w-full text-center text-2xl font-black text-n-900 border rounded-xl px-2 py-2 focus:outline-none focus:ring-2 ${amountError ? "border-red-400 focus:ring-red-200" : "border-n-200 focus:ring-brand/20 focus:border-brand"}`}
                  />
                  {amountError && <p className="text-[10px] text-red-500 mt-1 text-center">{amountError}</p>}
                </div>
                {gcEnabled ? (
                  <button
                    onClick={addCustomToCart}
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm transition-all active:scale-95 hover:shadow-md"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    In den Warenkorb
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 opacity-50">
                      <ShoppingCart className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide text-center leading-tight">Demnächst<br/>verfügbar</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Live-Vorschau des Gutscheins ── */}
          <div className="mt-8">
            <p className="text-[10px] font-bold text-n-500 uppercase tracking-widest text-center mb-3">So sieht Ihr Gutschein aus</p>
            <div
              className="relative w-full max-w-[620px] mx-auto rounded-xl overflow-hidden border border-n-200 shadow-sm bg-white"
              style={{ containerType: "inline-size" }}
            >
              <img ref={previewImgRef} src="/gutscheine.png" alt="Geschenkgutschein Vorschau" className="block w-full h-auto select-none" />

              {/* Datum — heutiges Datum, rechts neben dem Label "Datum" */}
              <span
                className="absolute font-black whitespace-nowrap"
                style={{ left: "23%", top: "28.8%", transform: "translateY(-50%)", fontSize: "2.6cqw", color: "#171717", fontFamily: "var(--font-mono), monospace" }}
              >
                {todayStr}
              </span>

              {/* Visum — Gutschein-Code (Platzhalter in der Vorschau) */}
              <span
                className="absolute font-black whitespace-nowrap"
                style={{ left: "17.5%", top: "38.8%", transform: "translateY(-50%)", fontSize: "2.6cqw", color: "#171717", fontFamily: "var(--font-mono), monospace" }}
              >
                EDIT-XXXX
              </span>

              {/* Betrag — rechts neben dem roten "CHF" */}
              {customAmount && (
                <span
                  className="absolute font-black whitespace-nowrap"
                  style={{ left: "78.5%", top: "64.2%", transform: "translateY(-50%)", fontSize: "5cqw", color: "#FF0000", fontFamily: "var(--font-mono), monospace" }}
                >
                  {customAmount}
                </span>
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="mt-8 bg-white rounded-2xl border border-n-150 shadow-sm overflow-hidden text-sm text-gray-600">
            {/* Banner versandkostenfrei */}
            <div className="w-full py-4 text-center" style={{ background: "linear-gradient(90deg, #E4E8FD 0%, #f1f8f1 50%, #E4E8FD 100%)" }}>
              <p className="text-brand font-black text-xl tracking-widest uppercase">Versandkostenfrei</p>
              <p className="text-brand/60 text-xs tracking-widest uppercase mt-0.5">Geschenkgutscheine – keine Versandkosten</p>
            </div>
            {/* Hinweise */}
            <div className="p-6">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Gift className="w-4 h-4 text-red-500" /> Hinweise zu Gutscheinen
              </h2>
              <ul className="space-y-2 list-disc list-inside text-sm">
                <li>Nach Zahlungseingang erhalten Sie den Gutschein-Code per E-Mail.</li>
                <li>Kein Mindestbestellwert. Nicht kombinierbar mit anderen Aktionen.</li>
                <li>Kein Rückgeld auf Gutscheine.</li>
                <li>Bei Fragen: <a href="mailto:hallo@sabitas.ch" className="text-[#b40000] underline">hallo@sabitas.ch</a></li>
              </ul>
            </div>
          </div>
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-3 py-8">
            {[
              "Limitierte Auflagen",
              "Handsigniert",
              "Museumsqualität",
              "Weltweiter Versand",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2 bg-white border border-n-150 rounded-full px-4 py-2 shadow-sm">
                <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                </span>
                <span className="text-xs font-semibold text-n-800">{feat}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
      <Footer />
    </>
  )
}
