"use client"

import { useState, useEffect, useCallback, memo, useRef } from "react"
import { descargarVCard } from "@/lib/contacto"
import { Header } from "@/components/header"
import { BannerPagina } from "@/components/banner-pagina"
import { getCachedProducts } from "@/lib/products-cache"
import { getCachedCategories } from "@/lib/categories-cache"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import {
  ShoppingCart, ChevronLeft, ChevronRight,
  Search, X, Check, ArrowLeft,
  ArrowUp, ChevronDown, Heart, Menu, Newspaper, Download, Images, Gift
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ShoppingCartComponent } from "./shopping-cart"
import { CheckoutPage } from "@/components/checkout-page"
import { LoginAuth } from "./login-auth"
import { ProductImage } from "./product-image"
import { UserProfile } from "./user-profile"
import { Footer } from "./footer"
import { CtaContacto } from "@/components/cta-contacto"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: number; name: string; description: string; price: number
  image_url?: string; image_urls?: (string | null)[]; image_url_candidates?: string[]
  heat_level: number; rating: number; badge: string
  origin: string; supplier?: string; category?: string; stock?: number; weight_kg?: number; shipping_on_request?: number
}
interface CartItem {
  id: number; name: string; price: number; image: string; image_url?: string
  image_url_candidates?: string[]
  description: string; heatLevel: number; rating: number; weight_kg?: number
  badge?: string; origin?: string; quantity: number; shipping_on_request?: number
}
interface Category { id: number; parent_id: number | null; slug: string; name: string; is_haupt?: number; image?: string | null }


// ─── Standalone helpers ────────────────────────────────────────────────────────

function getImages(p: Product): string[] {
  return (p.image_urls ?? [p.image_url]).filter((u): u is string => !!u)
}

// ─── ProductCard (defined OUTSIDE ShopGrid so memo() actually works) ──────────

interface ProductCardProps {
  product: Product
  addedIds: Set<number>
  wishlist: Set<number>
  onSelect: (p: Product) => void
  onAddToCart: (p: Product) => void
  onToggleWishlist: (id: number) => void
  onNoImage?: (id: number) => void
}

const ProductCard = memo(function ProductCard({ product, addedIds, wishlist, onSelect, onAddToCart, onToggleWishlist, onNoImage }: ProductCardProps) {
  const [idx, setIdx] = useState(0)
  const images  = getImages(product)
  const inStock = (product.stock ?? 0) > 0
  const isAdded = addedIds.has(product.id)
  const isWished = wishlist.has(product.id)

  return (
    <div className="group flex flex-col">
      {/* Image */}
      <div
        className="relative aspect-[4/5] bg-canvas rounded-xl overflow-hidden cursor-pointer ring-1 ring-n-150 group-hover:ring-n-250 transition-shadow duration-300 group-hover:shadow-lg"
        onClick={() => onSelect(product)}
      >
        {images.length > 1 ? (
          <img
            src={images[idx]}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
            onError={() => {
              if (idx < images.length - 1) setIdx(i => i + 1)
              else {
                const el = document.querySelector(`[data-pid="${product.id}"] img`) as HTMLImageElement
                if (el) el.src = "/placeholder.svg?height=300&width=300"
              }
            }}
          />
        ) : (
          <ProductImage
            src={images[0] ?? product.image_url}
            candidates={product.image_url_candidates}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
            onAllFailed={() => onNoImage?.(product.id)}
          />
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-n-800" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"
            >
              <ChevronRight className="w-3.5 h-3.5 text-n-800" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <div key={i} className={`rounded-full transition-all ${i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
              ))}
            </div>
          </>
        )}

        {!inStock && (
          <div className="absolute inset-0 bg-canvas/75 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-ink text-white text-[10px] font-semibold px-3 py-1.5 rounded-full tracking-wide">
              Nicht am Lager
            </span>
          </div>
        )}
        {product.badge && (
          <span className="absolute top-3 left-3 bg-highlight text-white text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-wide">
            {product.badge}
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={e => { e.stopPropagation(); onToggleWishlist(product.id) }}
          className={`absolute top-2.5 right-2.5 rounded-full flex items-center justify-center transition-all duration-200
            w-8 h-8 backdrop-blur-sm
            ${isWished
              ? "bg-highlight text-white"
              : "bg-white/75 text-n-600 hover:text-highlight hover:bg-white"
            }`}
        >
          <Heart className={`w-[15px] h-[15px] ${isWished ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Details */}
      <div className="pt-3 flex flex-col flex-1 gap-1">
        <p className="text-[10px] font-semibold text-n-400 uppercase tracking-[0.14em] truncate">
          {product.origin || " "}
        </p>
        <h3
          className="text-[13px] font-medium text-n-800 line-clamp-2 leading-snug cursor-pointer hover:text-brand transition-colors"
          onClick={() => onSelect(product)}
        >
          {product.name}
        </h3>
        <p className="font-display text-[17px] font-semibold text-n-900 mt-0.5 tabular-nums">
          CHF {product.price.toFixed(2)}
        </p>

        <div className="mt-2.5">
          {inStock ? (
            <button
              onClick={() => onAddToCart(product)}
              className={`w-full h-9 rounded-full text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors duration-200 ${
                isAdded
                  ? "bg-brand-dark text-white"
                  : "bg-brand text-white hover:bg-brand-dark"
              }`}
            >
              {isAdded
                ? <><Check className="w-3.5 h-3.5" /> Hinzugefügt</>
                : <><ShoppingCart className="w-3.5 h-3.5" /> In den Warenkorb</>}
            </button>
          ) : (
            <a
              href={`mailto:hallo@sabitas.ch?subject=Verfügbarkeitsanfrage: ${encodeURIComponent(product.name)}&body=Guten Tag,%0A%0Aich würde gerne wissen, ob der folgende Artikel wieder verfügbar ist:%0A%0AArtikel: ${encodeURIComponent(product.name)}%0AArtikel-Nr.: ${product.id}%0A%0AVielen Dank!`}
              onClick={e => e.stopPropagation()}
              className="w-full h-9 rounded-full text-[12px] font-semibold inline-flex items-center justify-center border border-n-200 text-n-600 hover:border-brand hover:text-brand transition-colors"
            >
              Verfügbarkeit anfragen
            </a>
          )}
        </div>
      </div>
    </div>
  )
})

// ─── MobileCatCard: smaller version for mobile scroll ─────────────────────────

function MobileCatCard({ srcs, displayName, isActive, onClick, id }: {
  srcs: string[]
  displayName: string
  isActive: boolean
  onClick: () => void
  id?: string
}) {
  const [idx, setIdx] = useState(0)
  const img = srcs[idx] ?? null
  return (
    <button
      id={id}
      onClick={onClick}
      className="relative overflow-hidden rounded-xl flex-shrink-0 text-left transition-all duration-200"
      style={{
        width: "110px", height: "120px",
        backgroundColor: "#0E1015",
        border: isActive ? "2px solid #6B4F93" : "2px solid transparent",
        boxShadow: isActive ? "0 4px 16px rgba(107,79,147,0.28)" : "none",
      }}
    >
      {img && (
        <img
          src={img}
          alt={displayName}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: isActive ? "scale(1.05)" : undefined, transition: "transform 0.4s ease" }}
          onError={() => setIdx(i => i + 1)}
        />
      )}
      <div className="absolute inset-0" style={{
        background: isActive
          ? "linear-gradient(to top, rgba(59,43,70,0.78) 0%, transparent 55%)"
          : "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)"
      }} />
      {isActive && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
        <span className="text-white font-black text-[13px] leading-tight block truncate drop-shadow-md">
          {displayName}
        </span>
      </div>
    </button>
  )
}

// Imagen para tarjetas de categoría:
// 1) productos con image_urls[] (URLs completas subidas, más fiables)
// 2) fallback: image_url con extensiones
function catImageSrc(catProds: any[]): string[] {
  // Primero buscar productos con image_urls completas
  for (const p of catProds) {
    const urls = (p.image_urls ?? []).filter(Boolean)
    if (urls.length > 0) return [urls[0] as string]
  }
  // Si ninguno tiene image_urls, intentar con image_url + extensiones (todos los productos)
  const srcs: string[] = []
  for (const p of catProds) {
    if (srcs.length >= 20) break
    const raw = p.image_url
    if (!raw) continue
    if (raw.match(/\.(jpg|jpeg|png|webp)$/i)) srcs.push(raw)
    else srcs.push(raw + ".jpg", raw + ".png")
  }
  return srcs
}

// Imagen de fondo específica por categoría cuando sus productos no tienen imagen
// utilizable. Se añade como fallback al final de la cadena, así cualquier imagen
// real de producto tiene prioridad. Se rellena por tienda según haga falta.
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {}

function catImageSrcWithFallback(catProds: any[], catName: string): string[] {
  const srcs = catImageSrc(catProds)
  const fallback = CATEGORY_FALLBACK_IMAGES[catName]
  return fallback ? [...srcs, fallback] : srcs
}

// ─── CatCard: category card with image fallback chain ─────────────────────────

function CatCard({ srcs, displayName, isActive, onClick }: {
  srcs: string[]
  displayName: string
  isActive: boolean
  onClick: () => void
}) {
  const [idx, setIdx] = useState(0)
  const img = srcs[idx] ?? null

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl group text-left transition-all duration-300`}
      style={{
        height: "180px", minWidth: "210px", width: "210px", flexShrink: 0,
        backgroundColor: "#F7F8FA",
        border: isActive ? "2px solid #6B4F93" : "2px solid #ECE2F7",
        boxShadow: isActive ? "0 8px 32px rgba(107,79,147,0.28)" : "none",
      }}
    >
      {img && (
        <img
          src={img}
          alt={displayName}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          onError={() => setIdx(i => i + 1)}
        />
      )}
      <div className="absolute inset-0" style={{
        background: isActive
          ? "linear-gradient(to top, rgba(59,43,70,0.72) 0%, transparent 50%)"
          : "linear-gradient(to top, rgba(0,0,0,0.60) 0%, transparent 50%)"
      }} />
      {isActive && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-brand rounded-full flex items-center justify-center shadow-lg">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3.5">
        <span className="text-white font-black text-sm leading-tight block tracking-wide drop-shadow-lg">
          {displayName}
        </span>
      </div>
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShopGrid() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // F5 automático la primera vez por sesión
  useEffect(() => {
    if (!sessionStorage.getItem("sr")) {
      sessionStorage.setItem("sr", "1")
      window.location.reload()
    }
  }, [])
  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cachedSuppliers, setCachedSuppliers] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("shop-suppliers-cache") || "[]") } catch { return [] }
  })
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState("")

  const [search, setSearch]                 = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const mobileCatScrollRef = useRef<HTMLDivElement>(null)
  const desktopCatScrollRef = useRef<HTMLDivElement>(null)
  const [activeSupplier, setActiveSupplier] = useState("all")
  const [stockFilter, setStockFilter]       = useState<"all" | "out_of_stock">("all")
  /** Precio maximo elegido en el lateral. null = sin tope. */
  const [precioMax, setPrecioMax]           = useState<number | null>(null)
  const [sortBy, setSortBy]                 = useState<"default"|"name_asc"|"name_desc"|"price_asc"|"price_desc">("default")
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [expandedCats, setExpandedCats]     = useState<Set<string>>(new Set())
  const [showBackTop, setShowBackTop]       = useState(false)
  const [navMenuOpen, setNavMenuOpen]       = useState(false)
  const [headerVisible, setHeaderVisible]   = useState(true)
  const lastScrollYRef                      = useRef(0)
  const [showUserProfile, setShowUserProfile] = useState(false)

  const handleDownloadVCard = () => { void descargarVCard() }

  const PAGE_SIZE = 50
  const [currentPage, setCurrentPage] = useState(0)
  const noImageIdsRef  = useRef<Set<number>>(new Set())
  const [noImageTick, setNoImageTick] = useState(0)
  const noImageDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const markNoImage = useCallback((id: number) => {
    if (!noImageIdsRef.current.has(id)) {
      noImageIdsRef.current.add(id)
      if (noImageDebounce.current) clearTimeout(noImageDebounce.current)
      noImageDebounce.current = setTimeout(() => setNoImageTick(t => t + 1), 400)
    }
  }, [])

  const [cart, setCart]           = useState<CartItem[]>([])
  const [cartOpen, setCartOpen]   = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [addedIds, setAddedIds]   = useState<Set<number>>(new Set())
  const [currentView, setCurrentView] = useState<"products"|"checkout">("products")
  const [wishlist, setWishlist]   = useState<Set<number>>(new Set())
  const [showWishlist, setShowWishlist] = useState(false)

  useEffect(() => { loadProducts(); loadCategories(); loadCart(); loadWishlist() }, [])
  useEffect(() => { setCurrentPage(0) }, [search, activeCategory, activeSupplier, stockFilter, sortBy, precioMax])

  // Set default category to first root category once categories load
  // Acepta ?cat=<slug> (usado al volver desde el detalle de producto) o ?cat=<nombre>
  useEffect(() => {
    if (categories.length === 0) return
    const catParam = searchParams.get("cat")
    if (catParam) {
      const matched =
        categories.find((c) => c.slug.toLowerCase() === catParam.toLowerCase()) ??
        categories.find((c) => c.name.toLowerCase().includes(catParam.toLowerCase()))
      if (matched) {
        setActiveCategory(matched.slug)
        // Abrir en el sidebar toda la rama de padres de la categoría restaurada
        const ancestors = new Set<string>()
        let parentId = matched.parent_id
        let guard = 0
        while (parentId != null && guard++ < 10) {
          const parent = categories.find((c) => c.id === parentId)
          if (!parent) break
          ancestors.add(parent.slug)
          parentId = parent.parent_id
        }
        if (ancestors.size) setExpandedCats(prev => new Set([...prev, ...ancestors]))
        return
      }
    }
  }, [categories])

  // Mantener la categoría activa en la URL para que al volver desde el detalle
  // de producto (router.back) se recupere la misma sección y no "todos".
  useEffect(() => {
    if (loading) return
    const url = new URL(window.location.href)
    if (activeCategory === "all") url.searchParams.delete("cat")
    else url.searchParams.set("cat", activeCategory)
    if (url.toString() !== window.location.href) {
      window.history.replaceState(window.history.state, "", url.toString())
    }
  }, [activeCategory, loading])

  // Scroll horizontal automático al card de categoría activa en móvil
  useEffect(() => {
    if (activeCategory === "all") return
    const container = mobileCatScrollRef.current
    const el = document.getElementById(`mobile-cat-${activeCategory}`)
    if (!container || !el) return
    const containerCenter = container.offsetWidth / 2
    const elCenter = el.offsetLeft + el.offsetWidth / 2
    container.scrollTo({ left: elCenter - containerCenter, behavior: "smooth" })
  }, [activeCategory])

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      setShowBackTop(currentY > 500)
      if (currentY < 10) {
        setHeaderVisible(true)
      } else if (currentY > lastScrollYRef.current && currentY > 100) {
        setHeaderVisible(false)
      } else if (currentY < lastScrollYRef.current) {
        setHeaderVisible(true)
      }
      lastScrollYRef.current = currentY
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const { products } = await getCachedProducts()
      setProducts(products)
      // Guardar suppliers en localStorage para próxima visita
      const allSuppliers = Array.from(new Set(
        products.map(p => p.origin).filter((s): s is string => !!s && s.trim() !== "")
          .map(s => {
            const n = s.toUpperCase().replace(/[`'']/g, "'").replace(/\s*&\s*/g, " & ").replace(/\s+/g, " ").trim()
            const aliases: Record<string, string> = { "BLACKFIELD": "BLACK FIELD", "BLACKFLASH": "BLACK FLASH", "SMITH&WESSON": "SMITH & WESSON" }
            return aliases[n] ?? n
          })
      )).sort()
      try { localStorage.setItem("shop-suppliers-cache", JSON.stringify(allSuppliers)) } catch {}
      setCachedSuppliers(allSuppliers)
    } catch (e: any) { setError(e.message || "Fehler") }
    finally { setLoading(false) }
  }
  const loadCategories = async () => {
    try {
      const cats = await getCachedCategories()
      setCategories(cats)
    } catch {}
  }
  const loadCart = () => {
    try {
      const saved = localStorage.getItem("cantina-cart")
      if (saved) {
        const data: CartItem[] = JSON.parse(saved)
        setCart(data); setCartCount(data.reduce((s, i) => s + i.quantity, 0))
        setAddedIds(new Set(data.map(i => i.id)))
      }
    } catch {}
  }
  const loadWishlist = () => {
    try {
      const saved = localStorage.getItem("shop-wishlist")
      if (saved) setWishlist(new Set(JSON.parse(saved)))
    } catch {}
  }
  const toggleWishlist = useCallback((id: number) => {
    setWishlist(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem("shop-wishlist", JSON.stringify([...next]))
      return next
    })
  }, [])

  const saveCart = (c: CartItem[]) => {
    localStorage.setItem("cantina-cart", JSON.stringify(c))
    localStorage.setItem("cantina-cart-count", c.reduce((s, i) => s + i.quantity, 0).toString())
  }
  const addToCart = (product: Product) => {
    if ((product.stock ?? 0) === 0) return
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id)
      const next = exists
        ? prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, {
            id: product.id, name: product.name, price: product.price,
            image: getImages(product)[0] ?? "/placeholder.svg",
            image_url: getImages(product)[0],
            image_url_candidates: product.image_url_candidates,
            description: product.description,
            heatLevel: product.heat_level, rating: product.rating,
            badge: product.badge, origin: product.origin, quantity: 1,
            weight_kg: product.weight_kg,
            shipping_on_request: product.shipping_on_request,
          }]
      saveCart(next); setCartCount(next.reduce((s, i) => s + i.quantity, 0))
      return next
    })
    setAddedIds(prev => new Set([...prev, product.id]))
    setTimeout(() => setAddedIds(prev => { const s = new Set(prev); s.delete(product.id); return s }), 2000)
  }
  const removeFromCart = (id: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id)
      const next = item && item.quantity > 1
        ? prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i)
        : prev.filter(i => i.id !== id)
      saveCart(next); setCartCount(next.reduce((s, i) => s + i.quantity, 0))
      return next
    })
  }
  const clearCart = () => {
    setCart([]); setCartCount(0)
    localStorage.removeItem("cantina-cart"); localStorage.removeItem("cantina-cart-count")
  }
  const normalizeOrigin = (s: string) => s.toUpperCase().replace(/[`'']/g, "'").replace(/\s*&\s*/g, " & ").replace(/\s+/g, " ").trim()
  const ORIGIN_ALIASES: Record<string, string> = {
    "BLACKFIELD": "BLACK FIELD",
    "BLACKFLASH": "BLACK FLASH",
    "SMITH&WESSON": "SMITH & WESSON",
  }
  const getCanonicalOrigin = (s: string) => {
    const n = normalizeOrigin(s)
    return ORIGIN_ALIASES[n] ?? n
  }

  // Slugs de una categoría + TODOS sus descendientes (Haupt → Kategorien → Subkategorien)
  const branchSlugs = (catId: number): Set<string> => {
    const ids = new Set<number>([catId])
    for (let added = true; added;) {
      added = false
      for (const c of categories)
        if (c.parent_id != null && ids.has(c.parent_id) && !ids.has(c.id)) { ids.add(c.id); added = true }
    }
    return new Set(categories.filter(c => ids.has(c.id)).map(c => c.slug))
  }

  const activeBranchSlugs = (() => {
    const activeCat = categories.find(c => c.slug === activeCategory)
    return activeCat ? branchSlugs(activeCat.id) : new Set<string>()
  })()

  const matchesActiveCategory = (p: Product) =>
    activeCategory === "all" || activeBranchSlugs.has(p.category ?? "")

  const suppliers = products.length > 0
    ? Array.from(new Set(
        products
          .filter(p => matchesActiveCategory(p))
          .map(p => p.origin)
          .filter((s): s is string => !!s && s.trim() !== "")
          .map(s => getCanonicalOrigin(s))
      )).sort()
    : cachedSuppliers

  // Reset supplier when it's not available in the current category
  useEffect(() => {
    if (activeSupplier !== "all" && !suppliers.includes(activeSupplier)) {
      setActiveSupplier("all")
    }
  }, [activeCategory])

  /** El precio mas alto de la tienda: es el techo del deslizador. */
  const precioTope = Math.ceil(products.reduce((m, p) => Math.max(m, p.price || 0), 0))

  const filtered = products
    .filter(p => {
      if (showWishlist) return wishlist.has(p.id)
      const matchSearch   = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
      const matchCategory = matchesActiveCategory(p)
      const matchSupplier = activeSupplier === "all" || (p.origin && getCanonicalOrigin(p.origin) === activeSupplier)
      const matchStock    = stockFilter === "out_of_stock" ? (p.stock ?? 0) > 0 : true
      const matchPrecio   = precioMax === null || p.price <= precioMax
      return matchSearch && matchCategory && matchSupplier && matchStock && matchPrecio
    })
    .sort((a, b) => {
      const aInStock = (a.stock ?? 0) > 0 ? 0 : 1
      const bInStock = (b.stock ?? 0) > 0 ? 0 : 1
      if (aInStock !== bInStock) return aInStock - bInStock
      const aNoImg = noImageIdsRef.current.has(a.id) ? 1 : 0
      const bNoImg = noImageIdsRef.current.has(b.id) ? 1 : 0
      if (aNoImg !== bNoImg) return aNoImg - bNoImg
      switch (sortBy) {
        case "name_asc":   return a.name.localeCompare(b.name)
        case "name_desc":  return b.name.localeCompare(a.name)
        case "price_asc":  return a.price - b.price
        case "price_desc": return b.price - a.price
        default: return 0
      }
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pagedProducts = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const handleSelect    = useCallback((p: Product) => {
    // Llevamos la sección actual para que el botón "Zurück" del detalle vuelva a ella
    const back = activeCategory === "all" ? "shop" : `shop?cat=${encodeURIComponent(activeCategory)}`
    router.push(`/product/${p.id}?back=${encodeURIComponent(back)}`)
  }, [activeCategory]) // eslint-disable-line react-hooks/exhaustive-deps
  const handleAddToCart = useCallback((p: Product) => addToCart(p), [addedIds, cart]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Views ────────────────────────────────────────────────────────────────
  if (currentView === "checkout") {
    return <CheckoutPage cart={cart} onBackToStore={() => setCurrentView("products")} onClearCart={clearCart} onAddToCart={(p: any) => addToCart(p)} onRemoveFromCart={removeFromCart} />
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-n-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3.5 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-4 bg-gray-100 rounded-full w-5/6" />
                  <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-8 bg-gray-100 rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-3">{error}</p>
          <button onClick={loadProducts} className="text-sm font-medium text-gray-600 underline">Erneut versuchen</button>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {showUserProfile && (
        <UserProfile
          onClose={() => setShowUserProfile(false)}
          onAccountDeleted={() => setShowUserProfile(false)}
        />
      )}

      <ShoppingCartComponent
        isOpen={cartOpen} onOpenChange={setCartOpen} cart={cart}
        onAddToCart={(p: any) => addToCart(p)} onRemoveFromCart={removeFromCart}
        onGoToCheckout={() => { setCartOpen(false); setCurrentView("checkout") }}
        onClearCart={clearCart}
      />


      {/* Back to top */}
      {showBackTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed right-6 z-50 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl p-3 shadow-xl border border-gray-200 transition-all hover:scale-110 active:scale-95"
          style={{ bottom: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '5.5rem' : '1.5rem' }}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}


<div className="min-h-screen bg-n-50">

        {/* La misma cabecera que la portada: un solo sitio que mantener. */}
        <Header onCartOpen={() => setCartOpen(true)} cartCount={cartCount} />

        <BannerPagina
          miga="Kollektion"
          titulo="Meine Kollektion"
          subtitulo="Alles von Hand gemacht"
          texto="Taschen aus geliebtem Jeansstoff, kuschelige Hoodies und liebevolle Deko. Jedes Stück ein Unikat – wenn es weg ist, ist es weg."
          foto="/sabitas/bolso-vaquero.jpg"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">

          {/* ── Sidebar ── */}
          <aside className={`${sidebarOpen ? "block" : "hidden"} lg:block w-full lg:w-72 xl:w-80 flex-shrink-0 lg:self-start`}>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-n-150 space-y-5">

              <div>
                <p className="text-[10px] font-black text-n-400 uppercase tracking-[0.15em] mb-3">Verfügbarkeit</p>
                <ul className="space-y-0.5">
                  {([["all", "Alle"], ["out_of_stock", "An Lager"]] as const).map(([val, label]) => {
                    const count = val === "all" ? products.length : products.filter(p => (p.stock ?? 0) > 0).length
                    const isActive = stockFilter === val
                    return (
                      <li key={val}>
                        <button
                          onClick={() => {
                            setShowWishlist(false); setStockFilter(val); setSidebarOpen(false)
                            // "Alle" = volver al estado inicial: cierra la categoría abierta
                            // y muestra de nuevo todos los productos.
                            if (val === "all") {
                              setActiveCategory("all")
                              setExpandedCats(new Set())
                              setActiveSupplier("all")
                              setSearch("")
                              setPrecioMax(null)
                              setCurrentPage(0)
                            }
                          }}
                          className={`w-full text-left flex items-center justify-between text-sm px-3 py-2 rounded-xl transition-all font-medium ${
                            isActive ? "bg-brand text-white shadow-sm" : "text-n-700 hover:bg-n-50 hover:text-n-900"
                          }`}
                        >
                          <span>{label}</span>
                          <span className={`text-[10px] font-bold ml-2 px-1.5 py-0.5 rounded-full flex-shrink-0 ${isActive ? "bg-white/25 text-white" : "bg-n-100 text-n-500"}`}>{count}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="border-t border-n-100 pt-4">
                <p className="text-[10px] font-black text-n-400 uppercase tracking-[0.15em] mb-3">Kategorien</p>
                <ul className="space-y-3">
                  {categories.filter(c => c.parent_id === null).sort((a, b) => {
                    const aHasSubs = categories.some(c => c.parent_id === a.id)
                    const bHasSubs = categories.some(c => c.parent_id === b.id)
                    return (aHasSubs === bHasSubs) ? 0 : aHasSubs ? -1 : 1
                  }).map(parent => {
                    const subs = categories.filter(c => c.parent_id === parent.id)
                    const bs = branchSlugs(parent.id)
                    const count = products.filter(p => bs.has(p.category ?? "")).length
                    const isActive = activeCategory === parent.slug
                    const isExpanded = expandedCats.has(parent.slug)
                    const hasSubs = subs.length > 0
                    return (
                      <li key={parent.slug}>
                        <div className={`flex items-center rounded-xl overflow-hidden transition-all ${isActive ? "bg-brand shadow-sm" : "bg-brand-wash hover:bg-brand-tint"}`}>
                          <button
                            onClick={() => { setShowWishlist(false); const selecting = activeCategory !== parent.slug; setActiveCategory(selecting ? parent.slug : "all"); if (hasSubs) setExpandedCats(prev => { const n = new Set(prev); selecting ? n.add(parent.slug) : n.delete(parent.slug); return n }); setSidebarOpen(false) }}
                            className="flex-1 text-left flex items-center gap-2 px-3 py-2 min-w-0"
                          >
                            <span className={`text-sm font-bold truncate ${isActive ? "text-white" : "text-brand"}`}>{parent.name.replace(/\s*\d{4}$/, "")}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isActive ? "bg-white/25 text-white" : "bg-brand-pale text-brand"}`}>{count}</span>
                          </button>
                          {hasSubs && (
                            <button
                              onClick={() => setExpandedCats(prev => { const n = new Set(prev); n.has(parent.slug) ? n.delete(parent.slug) : n.add(parent.slug); return n })}
                              className={`px-2.5 py-2 flex-shrink-0 font-black text-sm border-l transition-colors ${isActive ? "border-white/20 text-white hover:bg-white/10" : "border-brand-pale text-brand hover:bg-brand-pale"}`}
                            >
                              {isExpanded ? "−" : "+"}
                            </button>
                          )}
                        </div>
                        {hasSubs && isExpanded && (
                          <ul className="mt-1 space-y-0.5 pl-3 border-l-2 border-brand-pale ml-3">
                            {subs.map(sub => {
                              const subSubs = categories.filter(c => c.parent_id === sub.id)
                              const hasSubSubs = subSubs.length > 0
                              const subCount = products.filter(p => branchSlugs(sub.id).has(p.category ?? "")).length
                              const isSubActive = activeCategory === sub.slug
                              const isSubExpanded = expandedCats.has(sub.slug)
                              return (
                                <li key={sub.slug}>
                                  <div className={`flex items-center rounded-lg overflow-hidden transition-all ${isSubActive ? "bg-brand shadow-sm" : "hover:bg-n-50"}`}>
                                    <button
                                      onClick={() => { setShowWishlist(false); const selecting = activeCategory !== sub.slug; setActiveCategory(selecting ? sub.slug : parent.slug); if (hasSubSubs) setExpandedCats(prev => { const n = new Set(prev); selecting ? n.add(sub.slug) : n.delete(sub.slug); return n }); setSidebarOpen(false) }}
                                      className="flex-1 text-left flex items-center justify-between gap-2 px-3 py-1.5 min-w-0"
                                    >
                                      <span className={`text-sm font-medium truncate ${isSubActive ? "text-white" : "text-n-700"}`}>{sub.name.replace(/\s*\d{4}$/, "")}</span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isSubActive ? "bg-white/25 text-white" : "bg-n-100 text-n-500"}`}>{subCount}</span>
                                    </button>
                                    {hasSubSubs && (
                                      <button
                                        onClick={() => setExpandedCats(prev => { const n = new Set(prev); n.has(sub.slug) ? n.delete(sub.slug) : n.add(sub.slug); return n })}
                                        className={`px-2 py-1.5 flex-shrink-0 font-black text-sm border-l transition-colors ${isSubActive ? "border-white/20 text-white hover:bg-white/10" : "border-n-150 text-brand hover:bg-n-150"}`}
                                      >
                                        {isSubExpanded ? "−" : "+"}
                                      </button>
                                    )}
                                  </div>
                                  {hasSubSubs && isSubExpanded && (
                                    <ul className="mt-1 space-y-0.5 pl-3 border-l-2 border-n-200 ml-3">
                                      {subSubs.map(ss => {
                                        const ssCount = products.filter(p => branchSlugs(ss.id).has(p.category ?? "")).length
                                        const isSsActive = activeCategory === ss.slug
                                        return (
                                          <li key={ss.slug}>
                                            <button
                                              onClick={() => { setShowWishlist(false); setActiveCategory(prev => prev === ss.slug ? sub.slug : ss.slug); setSidebarOpen(false) }}
                                              className={`w-full text-left flex items-center justify-between text-sm px-3 py-1.5 rounded-lg transition-all font-medium ${isSsActive ? "bg-brand text-white shadow-sm" : "text-n-500 hover:bg-n-50 hover:text-n-900"}`}
                                            >
                                              <span className="truncate">{ss.name.replace(/\s*\d{4}$/, "")}</span>
                                              <span className={`text-[10px] font-bold ml-2 px-1.5 py-0.5 rounded-full flex-shrink-0 ${isSsActive ? "bg-white/25 text-white" : "bg-n-100 text-n-500"}`}>{ssCount}</span>
                                            </button>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="lg:hidden border-t border-n-100 pt-4">
                <button
                  onClick={() => { setShowWishlist(p => !p); setActiveCategory("all"); setStockFilter("all"); setSearch(""); setSidebarOpen(false) }}
                  className={`w-full text-left flex items-center justify-between text-sm px-3 py-2 rounded-xl transition-all font-medium ${
                    showWishlist ? "bg-rose-100 text-rose-600 shadow-sm" : "text-n-700 hover:bg-rose-50 hover:text-rose-500"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Heart className={`w-3.5 h-3.5 ${showWishlist ? "fill-current" : ""}`} />
                    Wunschliste
                  </span>
                  {wishlist.size > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${showWishlist ? "bg-rose-200 text-rose-600" : "bg-rose-100 text-rose-400"}`}>
                      {wishlist.size}
                    </span>
                  )}
                </button>
              </div>

              <div className="lg:hidden border-t border-n-100 pt-4">
                <button
                  onClick={() => router.push("/gutscheine")}
                  className="w-full text-left flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-all font-medium text-brand hover:bg-brand-wash"
                >
                  <Gift className="w-3.5 h-3.5 flex-shrink-0" />
                  Gutscheine kaufen
                </button>
              </div>

            </div>

            {/* ── Filtrar por precio — solo escritorio ──────────────────────
                El tope sale de los productos que hay, no de un numero fijo:
                si manana vende algo de 300 el deslizador llega hasta ahi solo.
                Un solo mando, el techo; el suelo siempre es cero, que es como
                mira la gente una tienda pequeña. */}
            {precioTope > 0 && (
              <div className="hidden lg:block mt-4 bg-white rounded-2xl p-4 shadow-sm border border-n-150">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-n-400 uppercase tracking-[0.15em]">Preis</p>
                  {precioMax !== null && (
                    <button
                      onClick={() => setPrecioMax(null)}
                      className="text-[11px] font-semibold text-brand hover:underline"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>

                <p className="text-ink font-semibold text-[15px]">
                  {precioMax === null
                    ? "Alle Preise"
                    : `Bis CHF ${precioMax.toLocaleString("de-CH")}`}
                </p>

                <input
                  type="range"
                  min={0}
                  max={precioTope}
                  step={precioTope > 200 ? 10 : 5}
                  value={precioMax ?? precioTope}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    // Al tope del todo no hay filtro: es lo mismo que «todos».
                    setPrecioMax(v >= precioTope ? null : v)
                  }}
                  className="w-full mt-3 accent-brand cursor-pointer"
                  aria-label="Höchstpreis"
                />

                <div className="flex items-center justify-between text-[11.5px] text-n-400 mt-1">
                  <span>CHF 0</span>
                  <span>CHF {precioTope.toLocaleString("de-CH")}</span>
                </div>

                <p className="text-[12.5px] text-n-500 mt-3">
                  {filtered.length} {filtered.length === 1 ? "Stück" : "Stücke"}
                </p>
              </div>
            )}

          </aside>

          {/* ── Main ── */}
          <main className="flex-1 min-w-0">

            {/* ── Category section title ── */}
            <div className="hidden lg:flex items-start gap-3 mb-3">
              <div className="w-1 self-stretch bg-brand rounded-full flex-shrink-0" />
              <div>
                <p className="font-black text-brand text-2xl leading-tight">Hauptkategorien</p>
                <p className="text-sm text-n-500 mt-1">Unser gesamtes Sortiment</p>
              </div>
            </div>

            {/* ── Category image banners — desktop only ── */}
            <div className="hidden lg:block mb-6 relative group/cat">
              <button
                onClick={() => desktopCatScrollRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 border border-n-200 shadow-md flex items-center justify-center opacity-0 group-hover/cat:opacity-100 transition-opacity hover:bg-white"
              >
                <ChevronLeft className="w-5 h-5 text-n-800" />
              </button>
              <button
                onClick={() => desktopCatScrollRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 border border-n-200 shadow-md flex items-center justify-center opacity-0 group-hover/cat:opacity-100 transition-opacity hover:bg-white"
              >
                <ChevronRight className="w-5 h-5 text-n-800" />
              </button>
              <div ref={desktopCatScrollRef} className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex gap-3" style={{ flexWrap: "nowrap" }}>
              {/* Alle */}
              <button
                onClick={() => setActiveCategory("all")}
                className="relative overflow-hidden rounded-2xl group text-left transition-all duration-300 flex flex-col justify-between p-4"
                style={{
                  height: "180px", minWidth: "210px", width: "210px", flexShrink: 0,
                  backgroundColor: "#ffffff",
                  border: activeCategory === "all" ? "2px solid #6B4F93" : "2px solid #ECE2F7",
                  boxShadow: activeCategory === "all" ? "0 8px 32px rgba(107,79,147,0.22)" : "none",
                }}
              >
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ backgroundColor: "rgba(107,79,147,0.10)" }} />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full" style={{ backgroundColor: "rgba(107,79,147,0.07)" }} />
                <div className="relative w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(107,79,147,0.10)" }}>
                  <Check className="w-6 h-6" style={{ color: "#6B4F93" }} />
                </div>
                <div className="relative">
                  <p className="font-black text-base leading-tight tracking-tight" style={{ color: "#6B4F93" }}>Alle Kategorien</p>
                  <p className="text-[11px] mt-0.5 font-medium text-n-400">Alles anzeigen →</p>
                </div>
              </button>
              {categories.filter(cat => cat.parent_id === null).map(cat => {
                const branch = branchSlugs(cat.id)
                const catProds = products.filter(p => branch.has(p.category ?? "") || p.category === cat.name)
                const isActive = activeCategory === cat.slug
                const displayName = cat.name.replace(/\s*\d{4}$/, "")
                // Hauptkategorie: su imagen de la BD manda como fondo; los productos quedan de fallback
                const srcs = cat.image ? [cat.image, ...catImageSrcWithFallback(catProds, cat.name)] : catImageSrcWithFallback(catProds, cat.name)
                return (
                  <CatCard
                    key={cat.slug}
                    srcs={srcs}
                    displayName={displayName}
                    isActive={isActive}
                    onClick={() => setActiveCategory(prev => prev === cat.slug ? "all" : cat.slug)}
                  />
                )
              })}
              </div>
              </div>
            </div>

            {/* ── Category cards — mobile only ── */}
            <div ref={mobileCatScrollRef} className="lg:hidden overflow-x-auto mb-3 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex gap-2.5 pb-1" style={{ flexWrap: "nowrap" }}>
                {/* Alle mobile */}
                <button
                  onClick={() => setActiveCategory("all")}
                  className="relative overflow-hidden rounded-xl flex-shrink-0 flex flex-col justify-between p-3 transition-all duration-200"
                  style={{
                    width: "110px", height: "120px",
                    backgroundColor: "#fff",
                    border: activeCategory === "all" ? "2px solid #6B4F93" : "2px solid #ECE2F7",
                    boxShadow: activeCategory === "all" ? "0 4px 16px rgba(107,79,147,0.22)" : "none",
                  }}
                >
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full" style={{ backgroundColor: "rgba(107,79,147,0.09)" }} />
                  <div className="relative w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(107,79,147,0.12)" }}>
                    <Check className="w-4 h-4" style={{ color: "#6B4F93" }} />
                  </div>
                  <div className="relative">
                    <p className="font-black text-[15px] leading-tight" style={{ color: "#6B4F93" }}>Alle</p>
                    <p className="text-[12px] text-n-400 mt-0.5">Anzeigen</p>
                  </div>
                </button>
                {categories.filter(cat => cat.parent_id === null).map(cat => {
                  const branch = branchSlugs(cat.id)
                  const catProds = products.filter(p => branch.has(p.category ?? "") || p.category === cat.name)
                  const isActive = activeCategory === cat.slug || branch.has(activeCategory)
                  const displayName = cat.name.replace(/\s*\d{4}$/, "")
                  const srcs = cat.image ? [cat.image, ...catImageSrcWithFallback(catProds, cat.name)] : catImageSrcWithFallback(catProds, cat.name)
                  return (
                    <MobileCatCard
                      key={cat.slug}
                      id={`mobile-cat-${cat.slug}`}
                      srcs={srcs}
                      displayName={displayName}
                      isActive={isActive}
                      onClick={() => { setActiveCategory(prev => prev === cat.slug ? "all" : cat.slug); setExpandedCats(prev => { const n = new Set(prev); n.add(cat.slug); return n }) }}
                    />
                  )
                })}
              </div>
            </div>

            {/* ── Subcategory bar — visible when active category has subcategories ── */}
            {(() => {
              const activeCat = categories.find(c => c.slug === activeCategory)
              // Drill-down: si la activa tiene hijos, muestra sus hijos; si es hoja, muestra sus hermanos
              const ownChildren = activeCat ? categories.filter(c => c.parent_id === activeCat.id) : []
              const shownParent = ownChildren.length > 0
                ? activeCat
                : (activeCat?.parent_id ? categories.find(c => c.id === activeCat.parent_id) : undefined)
              const subs = shownParent ? categories.filter(c => c.parent_id === shownParent.id) : []
              if (!shownParent || subs.length === 0) return null
              const barTitle = shownParent.is_haupt ? "Kategorien" : "Subkategorien"
              // Si estamos viendo Subkategorien (padre = Kategorie), permitir volver a las Kategorien (la Hauptkategorie)
              const backParent = !shownParent.is_haupt && shownParent.parent_id != null
                ? categories.find(c => c.id === shownParent.parent_id)
                : null
              return (
                <div className="border-t border-n-200 mt-6 pt-6">
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <div className="w-0.5 self-stretch bg-brand rounded-full flex-shrink-0" />
                    <div>
                      <p className="font-black text-brand text-xl lg:text-2xl leading-tight">{barTitle}</p>
                      <p className="text-sm text-n-500 mt-1">{shownParent.name.replace(/\s*\d{4}$/, "")}</p>
                    </div>
                  </div>
                  {backParent && (
                    <button
                      onClick={() => setActiveCategory(backParent.slug)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-dark mb-3 bg-brand-wash hover:bg-brand-tint px-3 py-1.5 rounded-full transition-colors"
                    >
                      ← Zurück zu Kategorien
                    </button>
                  )}
                  <div className="overflow-x-auto mb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex items-center gap-1 min-w-max border-b border-n-200">
                      {(() => {
                        const isAllActive = activeCategory === shownParent.slug
                        return (
                          <button
                            onClick={() => setActiveCategory(shownParent.slug)}
                            className={`px-3.5 py-2 -mb-px border-b-2 rounded-t-lg transition-all whitespace-nowrap text-xs font-bold uppercase tracking-wide ${
                              isAllActive
                                ? "border-brand text-brand bg-brand-wash"
                                : "border-transparent text-n-800 bg-gray-100 hover:text-brand hover:bg-brand-wash"
                            }`}
                          >
                            Alle
                          </button>
                        )
                      })()}
                      {subs.map(sub => {
                        const isSubActive = activeCategory === sub.slug
                        return (
                          <button
                            key={sub.slug}
                            onClick={() => setActiveCategory(prev => prev === sub.slug ? shownParent.slug : sub.slug)}
                            className={`px-3.5 py-2 -mb-px border-b-2 rounded-t-lg transition-all whitespace-nowrap text-xs font-bold uppercase tracking-wide ${
                              isSubActive
                                ? "border-brand text-brand bg-brand-wash"
                                : "border-transparent text-n-800 bg-gray-100 hover:text-brand hover:bg-brand-wash"
                            }`}
                          >
                            {sub.name.replace(/\s*\d{4}$/, "")}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── Supplier / Hersteller chips ── */}
            {suppliers.length > 0 && (
              <div className="border-t border-n-200 mt-6 pt-6">
                <div className="flex items-start gap-2.5 mb-2.5">
                  <div className="w-0.5 self-stretch bg-brand rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-black text-brand text-xl lg:text-2xl leading-tight">Hersteller</p>
                    <p className="text-sm text-n-500 mt-1">Nach Marke filtern</p>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="flex items-center gap-1.5 min-w-max pb-1">
                    <button
                      onClick={() => setActiveSupplier("all")}
                      className="px-2.5 py-1 rounded-full border transition-all whitespace-nowrap text-[11px] font-black uppercase tracking-wider"
                      style={activeSupplier === "all"
                        ? { backgroundColor: "#6B4F93", color: "#fff", borderColor: "#6B4F93" }
                        : { backgroundColor: "#fff", color: "#434956", borderColor: "#D1D5DB" }
                      }
                    >
                      Alle
                    </button>
                    {suppliers.map(s => (
                      <button
                        key={s}
                        onClick={() => setActiveSupplier(prev => prev === s ? "all" : s)}
                        className="px-2.5 py-1 rounded-full border transition-all whitespace-nowrap text-[11px] font-black uppercase tracking-wider"
                        style={activeSupplier === s
                          ? { backgroundColor: "#6B4F93", color: "#fff", borderColor: "#6B4F93" }
                          : { backgroundColor: "#fff", color: "#434956", borderColor: "#D1D5DB" }
                        }
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Search — mobile only, below brand badges ── */}
            <div className="sm:hidden relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-n-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Produkte suchen…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-n-100 rounded-full border border-transparent focus:outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder-n-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-n-400 hover:text-n-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort + count */}
            <div id="products-section" className="flex items-center justify-between mb-4 gap-3">
              <p className="text-sm text-n-500 font-medium">
                <span className="font-black text-n-900">{filtered.length}</span> Produkte
              </p>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="appearance-none text-sm font-semibold text-n-700 bg-white border border-n-150 rounded-full pl-4 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
                >
                  <option value="default">Empfehlung</option>
                  <option value="name_asc">Name A–Z</option>
                  <option value="name_desc">Name Z–A</option>
                  <option value="price_asc">Preis ↑</option>
                  <option value="price_desc">Preis ↓</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-n-400 pointer-events-none" />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-24">
                {showWishlist ? (
                  <>
                    <Heart className="w-14 h-14 text-red-200 mx-auto mb-4" />
                    <p className="text-lg font-bold text-gray-300 mb-2">Wunschliste ist leer</p>
                    <p className="text-sm text-gray-400 mb-4">Klicke auf das Herz bei einem Produkt, um es hinzuzufügen.</p>
                    <button onClick={() => setShowWishlist(false)} className="text-sm font-semibold text-brand hover:underline">Alle Motive anzeigen</button>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-gray-300 mb-3">Keine Produkte gefunden</p>
                    <button onClick={() => { setSearch(""); setActiveCategory("all"); setActiveSupplier("all"); setStockFilter("all") }} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                      Filter zurücksetzen
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {pagedProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      addedIds={addedIds}
                      wishlist={wishlist}
                      onSelect={handleSelect}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={toggleWishlist}
                      onNoImage={markNoImage}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2 pb-6">
                    <button
                      onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                      disabled={currentPage === 0}
                      className="w-9 h-9 rounded-full flex items-center justify-center border border-n-200 bg-white text-n-700 hover:bg-brand hover:text-white hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => { setCurrentPage(i); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                        className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                          i === currentPage
                            ? "bg-brand text-white shadow-md"
                            : "border border-n-200 bg-white text-n-700 hover:bg-n-50"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                      disabled={currentPage === totalPages - 1}
                      className="w-9 h-9 rounded-full flex items-center justify-center border border-n-200 bg-white text-n-700 hover:bg-brand hover:text-white hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* La misma llamada de contacto que en la portada. */}
      <CtaContacto separada />

      <Footer />
    </>
  )
}
