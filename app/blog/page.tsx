"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { BannerPagina } from "@/components/banner-pagina"
import { useRouter } from "next/navigation"
import { getCachedCategories } from "@/lib/categories-cache"
import { ArrowLeft, ChevronLeft, Calendar, X, ChevronRight, Menu, Newspaper, Images, Download, ShoppingCart, Gift, Share2, Check } from "lucide-react"
import { Footer } from "@/components/footer"
import { CtaContacto } from "@/components/cta-contacto"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { LoginAuth } from "@/components/login-auth"

interface BlogPost {
  id: number
  title: string
  content: string
  hero_image_url?: string
  image2_url?: string
  image3_url?: string
  image4_url?: string
  created_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "long", year: "numeric" })
}

// Teilen-Button: nutzt Web Share API (mobil) bzw. kopiert den Link in die Zwischenablage
function ShareButton({ post, className = "" }: { post: BlogPost; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/blog?post=${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url })
        return
      } catch {
        // Abgebrochen oder nicht unterstützt → Fallback Kopieren
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 text-sm font-bold rounded-full px-4 py-2 transition-all ${
        copied
          ? "bg-brand text-white"
          : "bg-brand/8 text-brand hover:bg-brand/15"
      } ${className}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {copied ? "Link kopiert!" : "Teilen"}
    </button>
  )
}

// Wandelt URLs im Text in anklickbare Links um
function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.split(urlRegex).map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      // Doppeltes Protokoll bereinigen (z.B. https://https://...)
      const href = part.replace(/^https?:\/\/(https?:\/\/)/, "$1")
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand font-semibold underline underline-offset-2 break-all hover:text-brand-dark"
        >
          {part}
        </a>
      )
    }
    return part
  })
}

function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % images.length)
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + images.length) % images.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [images.length, onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90" />

      {/* Image */}
      <img
        src={images[idx]}
        alt=""
        className="relative z-10 max-w-[92vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl select-none"
        onClick={e => e.stopPropagation()}
      />

      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }}
            className="absolute left-4 z-20 w-11 h-11 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white rotate-180" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length) }}
            className="absolute right-4 z-20 w-11 h-11 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-5 z-20 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setIdx(i) }}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PostModal({ post, onClose }: { post: BlogPost; onClose: () => void }) {
  const extraImgs = [post.image2_url, post.image3_url, post.image4_url].filter(Boolean) as string[]
  const allImages = [post.hero_image_url, ...extraImgs].filter(Boolean) as string[]
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && lightboxIndex === null) onClose() }
    window.addEventListener("keydown", onKey)
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey) }
  }, [onClose, lightboxIndex])

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <div
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 bg-white/90 hover:bg-white border border-n-150 rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-105"
          >
            <X className="w-4 h-4 text-n-700" />
          </button>

          {/* Hero image */}
          {post.hero_image_url && (
            <div
              className="h-[280px] sm:h-[380px] overflow-hidden rounded-t-3xl bg-n-100 cursor-zoom-in"
              onClick={() => setLightboxIndex(0)}
            >
              <img src={post.hero_image_url} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          )}

          <div className="p-8 sm:p-10">
            {/* Date + badge */}
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-brand bg-brand/8 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-brand rounded-full" />
                Beitrag
              </span>
              <span className="flex items-center gap-1.5 text-xs text-n-400 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(post.created_at)}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-black text-n-900 tracking-tight leading-tight mb-5">
              {post.title}
            </h2>

            {/* Divider */}
            <div className="w-12 h-1 bg-brand rounded-full mb-6" />

            {/* Content */}
            <p className="text-base text-n-700 leading-[1.85] whitespace-pre-line">
              {renderTextWithLinks(post.content)}
            </p>

            {/* Extra images */}
            {extraImgs.length > 0 && (
              <div className={`mt-8 grid gap-4 ${
                extraImgs.length === 1 ? "grid-cols-1" :
                extraImgs.length === 2 ? "grid-cols-2" :
                "grid-cols-3"
              }`}>
                {extraImgs.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setLightboxIndex(i + 1)}
                    className={`rounded-2xl overflow-hidden bg-n-100 cursor-zoom-in ${extraImgs.length === 1 ? "aspect-[16/7]" : "aspect-[4/3]"}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            )}

            {/* Teilen */}
            <div className="mt-8 pt-6 border-t border-[#EEE] flex items-center justify-between gap-3">
              <span className="text-xs text-n-400 font-medium">Beitrag teilen</span>
              <ShareButton post={post} />
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={allImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}

export default function BlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [categories, setCategories] = useState<{ id: number; slug: string; name: string; parent_id: number | null }[]>([])
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set())
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
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

  useEffect(() => {
    fetch("/api/blog")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPosts(d.posts)
          // Geteilten Beitrag (?post=ID) direkt öffnen
          const sharedId = Number(new URLSearchParams(window.location.search).get("post"))
          if (sharedId) {
            const shared = d.posts.find((p: BlogPost) => p.id === sharedId)
            if (shared) setSelectedPost(shared)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    getCachedCategories().then(setCategories).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-n-50">

      {/* La misma cabecera que la portada: un solo sitio que mantener. */}
      <Header onCartOpen={() => router.push("/shop")} />

      <BannerPagina
        miga="Blog"
        titulo="Sabitas Blog"
        subtitulo="Inspirationen, Ideen & Einblicke"
        texto="Hier teile ich Geschichten, Tipps und Inspirationen rund um meine handgemachten Taschen, Hoodies, Deko und mehr."
        foto="/sabitas/cojin-corazon.jpg"
      />

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0,1,2].map(i => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden border border-n-150 shadow-sm animate-pulse">
                <div className="h-52 bg-gray-100" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-28 bg-gray-100 rounded-full" />
                  <div className="h-5 w-4/5 bg-gray-200 rounded-full" />
                  <div className="h-3 w-full bg-gray-100 rounded-full" />
                  <div className="h-3 w-3/4 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sin articulos todavia: en lugar de una pagina vacia, se ve el molde
            del blog con tres tarjetas apagadas, para que se entienda de un
            vistazo como quedara cuando ella escriba el primero. */}
        {!loading && posts.length === 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { titulo: "Mein erster Beitrag", texto: "Hier erzähle ich, wie meine Stücke entstehen – von der Idee bis zur fertigen Tasche." },
                { titulo: "Blick in die Werkstatt", texto: "Stoffe, Farben und Muster: so sieht es bei mir aus, wenn gerade genäht wird." },
                { titulo: "Neu in der Kollektion", texto: "Welche Unikate zuletzt dazugekommen sind und was sie besonders macht." },
              ].map(({ titulo, texto }, i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl overflow-hidden border border-brand-tint shadow-[0_18px_40px_-34px_rgba(107,79,147,0.9)]"
                >
                  <div className="h-52 bg-gradient-to-br from-brand-tint via-brand-wash to-white flex items-center justify-center">
                    <Newspaper className="w-9 h-9 text-brand-pale" />
                  </div>
                  <div className="p-5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand bg-brand-tint rounded-full px-2.5 py-1">
                      Demnächst
                    </span>
                    <p className="font-display font-semibold text-ink text-[17px] mt-3 leading-snug">{titulo}</p>
                    <p className="text-n-500 text-[14px] mt-2 leading-relaxed">{texto}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-n-500 text-[14.5px] mt-10">
              Der erste Beitrag ist in Arbeit – hier erscheinen bald Geschichten aus der Werkstatt.
            </p>
          </>
        )}

        {/* Hasta tres articulos, todos en grande, uno debajo de otro: con tan
            pocos, las tarjetas pequeñas dejaban media pantalla vacia. De
            cuatro en adelante, el mas nuevo arriba y el resto en una fila que
            se arrastra de lado. */}
        {!loading && posts.length > 0 && (() => {
          const todosGrandes = posts.length <= 3
          const grandes = todosGrandes ? posts : posts.slice(0, 1)
          const restantes = todosGrandes ? [] : posts.slice(1)

          return (
            <>
              {grandes.map((post, i) => (
                <article
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="group bg-white rounded-3xl overflow-hidden border border-brand-tint shadow-[0_22px_50px_-36px_rgba(107,79,147,0.9)] hover:shadow-[0_26px_55px_-30px_rgba(107,79,147,0.9)] transition-shadow cursor-pointer mb-6 last:mb-0 grid lg:grid-cols-[1.15fr_1fr]"
                >
                  <div className="h-[240px] sm:h-[320px] lg:h-full lg:min-h-[340px] overflow-hidden bg-brand-tint">
                    {post.hero_image_url ? (
                      <img src={post.hero_image_url} alt={post.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-pale">
                        <Newspaper className="w-10 h-10" />
                      </div>
                    )}
                  </div>

                  <div className="p-6 sm:p-9 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      {/* La etiqueta solo en el primero: en los demas seria mentira. */}
                      {i === 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-brand bg-brand-tint px-3 py-1.5 rounded-full">
                          Neuester Beitrag
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-[12.5px] text-n-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(post.created_at)}
                      </span>
                    </div>

                    <h2
                      className="font-display font-semibold text-ink leading-[1.12]"
                      style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", letterSpacing: "-0.03em" }}
                    >
                      {post.title}
                    </h2>

                    <p className="text-n-600 text-[15px] leading-relaxed mt-4 line-clamp-4">
                      {post.content}
                    </p>

                    <span className="inline-flex items-center gap-2 text-brand font-semibold text-[14.5px] mt-6 group-hover:gap-3 transition-all">
                      Weiterlesen <span>→</span>
                    </span>
                  </div>
                </article>
              ))}

              {restantes.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mt-12 mb-6">
                    <div className="w-1 h-6 bg-brand-pale rounded-full" />
                    <h2 className="font-display text-[21px] font-semibold text-ink tracking-tight">Weitere Beiträge</h2>
                  </div>

                  {/* Una fila que se arrastra de lado, en movil y en escritorio:
                      asi caben los que haya sin estirar la pagina hacia abajo. */}
                  <div className="flex gap-4 overflow-x-auto -mx-4 px-4 pb-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {restantes.map((post) => (
                      <article
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="group shrink-0 snap-start w-[78vw] sm:w-[320px] bg-white rounded-3xl overflow-hidden border border-brand-tint hover:border-brand-pale shadow-[0_18px_40px_-34px_rgba(107,79,147,0.9)] hover:shadow-[0_22px_45px_-30px_rgba(107,79,147,0.9)] transition-shadow cursor-pointer"
                      >
                        <div className="h-52 overflow-hidden bg-brand-tint">
                          {post.hero_image_url ? (
                            <img src={post.hero_image_url} alt={post.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-pale">
                              <Newspaper className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <span className="flex items-center gap-1.5 text-xs text-n-500 mb-2">
                            <Calendar className="w-3 h-3" />
                            {formatDate(post.created_at)}
                          </span>
                          <h2 className="font-display font-semibold text-ink text-[16.5px] leading-tight mb-2 line-clamp-2">{post.title}</h2>
                          <p className="text-sm text-n-600 leading-relaxed line-clamp-3">{post.content}</p>
                          <div className="mt-4 text-[13px] font-semibold text-brand">Weiterlesen →</div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )
        })()}

      </div>

      {/* Post modal */}
      {selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {/* La misma llamada de contacto que en la portada. */}
      <CtaContacto separada />

      <Footer />
    </div>
  )
}
