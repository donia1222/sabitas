"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getCachedProducts } from "@/lib/products-cache"
import { getCachedCategories } from "@/lib/categories-cache"
import { HERO_DEFAULTS, HERO_IMAGE_DEFAULTS } from "@/lib/site-content-defaults"
import { EtiquetaCosida } from "@/components/titulo-cosido"
import { Package, Shirt, Home, Coffee, Sparkles, Gift, Watch, Footprints, Baby, Dumbbell, Laptop, Flower2 } from "lucide-react"

interface Product {
  id: number
  image_url?: string
  image_urls?: (string | null)[]
  image_url_candidates?: string[]
  category?: string
  origin?: string
}

interface Category {
  id: number
  slug: string
  name: string
  /** La sube ella desde el panel; get_categories.php ya la devuelve resuelta. */
  image?: string | null
}

function getCategoryImage(catProds: Product[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  const add = (u: string) => { if (!seen.has(u)) { seen.add(u); result.push(u) } }

  for (const p of catProds) {
    const all: string[] = [
      ...(p.image_urls ?? []).filter((u): u is string => !!u),
      ...(p.image_url ? [p.image_url] : []),
      ...(p.image_url_candidates ?? []),
    ]
    for (const u of all) add(u)
  }
  return result
}

function CatImageCard({
  srcs,
  alt,
  className,
}: {
  srcs: string[]
  alt: string
  className?: string
}) {
  const [idx, setIdx] = useState(0)
  if (!srcs.length || idx >= srcs.length) return null
  return (
    <img
      src={srcs[idx]}
      alt={alt}
      className={className}
      onError={() => setIdx(i => i + 1)}
    />
  )
}

export function HeroSection() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [count, setCount] = useState(0)
  const [slideIndex, setSlideIndex] = useState(0)
  const [siteContent, setSiteContent] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/site-settings`)
      .then(r => r.json())
      .then(data => { if (data.success && data.settings) setSiteContent(data.settings) })
      .catch(() => {})
  }, [])

  // Imágenes y textos del hero: usar overrides del admin, con fallback a los por defecto
  const HERO_IMAGES = useMemo(
    () => [1, 2, 3].map((i) => siteContent[`hero_image_${i}_url`] || HERO_IMAGE_DEFAULTS[i - 1]),
    [siteContent],
  )
  const heroBadges = useMemo(
    () => HERO_DEFAULTS.badges.map((d, i) => {
      const k = `hero_badge_${i + 1}`
      // Si el badge fue guardado (aunque sea vacío) se respeta; si nunca se tocó, usa el por defecto
      return k in siteContent ? siteContent[k] : d
    }),
    [siteContent],
  )
  const heroTitle1 = siteContent["hero_title_1"] || HERO_DEFAULTS.titleLine1
  const heroTitle2 = siteContent["hero_title_2"] || HERO_DEFAULTS.titleLine2
  const heroSubtitle = siteContent["hero_subtitle"] || HERO_DEFAULTS.subtitle
  const heroStats = useMemo(
    () => HERO_DEFAULTS.stats.map((d, i) => ({
      val: siteContent[`hero_stat${i + 1}_val`] || d.val,
      label: siteContent[`hero_stat${i + 1}_label`] || d.label,
    })),
    [siteContent],
  )

  useEffect(() => {
    // Wait for the element to be visible (fade delay 360ms + partial animation), then count
    const startDelay = setTimeout(() => {
      const target = 500
      const duration = 1000
      const steps = 50
      const increment = target / steps
      const interval = duration / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          setCount(target)
          clearInterval(timer)
        } else {
          setCount(Math.floor(current))
        }
      }, interval)
    }, 500)
    return () => clearTimeout(startDelay)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex(i => (i + 1) % HERO_IMAGES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    getCachedCategories().then(setCategories).catch(() => {})
    getCachedProducts().then(({ products }) => setProducts(products)).catch(() => {})
  }, [])

  const brands = (() => {
    const counts = new Map<string, { name: string; count: number }>()
    products.forEach(p => {
      if (!p.origin) return
      const key = p.origin.trim().toLowerCase().replace(/\s+/g, "")
      const existing = counts.get(key)
      if (!existing) counts.set(key, { name: p.origin.trim(), count: 1 })
      else existing.count++
    })
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map(e => e.name)
  })()


  return (
    <div className="bg-white">

      {/* ── Hero ──────────────────────────────────────────────────────────
          Dos columnas: el texto a la izquierda sobre un lila muy suave, y la
          foto a la derecha sangrando hasta el borde. El velo oscuro de antes
          era de una tienda de caza; aqui la foto va limpia y en color. */}
      <section
        id="hero"
        className="relative overflow-hidden bg-gradient-to-br from-brand-tint via-brand-wash to-white"
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center pb-12 lg:py-0 lg:min-h-[560px]">

            {/* Texto */}
            <div className="order-2 lg:order-1 lg:py-16">
              <span className="inline-block bg-white/80 text-brand text-[11.5px] font-semibold uppercase tracking-[0.18em] px-4 py-2 rounded-full border border-brand-pale/60">
                {heroBadges[0] || "Handmade · Schweiz"}
              </span>

              <h1
                className="font-display text-ink font-semibold mt-6 leading-[1.08]"
                style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)", letterSpacing: "-0.03em" }}
              >
                {heroTitle1}
                <br />
                {/* La segunda linea, en cursiva y con el subrayado dibujado a
                    mano: es el gesto que mas se repite en sus maquetas. */}
                <span className="relative inline-block italic text-brand">
                  {heroTitle2}
                  <svg
                    className="absolute left-0 -bottom-2 w-full"
                    height="12"
                    viewBox="0 0 300 12"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path
                      d="M3 8.5C60 3.5 140 2.5 297 6"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="text-brand-pale"
                    />
                  </svg>
                </span>
              </h1>

              <p className="text-n-600 text-[16.5px] lg:text-[17.5px] mt-7 leading-relaxed max-w-lg whitespace-pre-line">
                {heroSubtitle}
              </p>

              <div className="flex flex-wrap gap-3 mt-9">
                <button
                  onClick={() => router.push("/shop")}
                  className="group bg-brand text-white font-semibold px-7 py-3.5 text-[14.5px] hover:bg-brand-dark transition-colors rounded-full inline-flex items-center gap-2 shadow-lg shadow-brand/25"
                >
                  Kollektion ansehen
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </button>
                <button
                  onClick={() => document.querySelector("#ueber")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-white border border-brand-pale text-brand font-semibold px-7 py-3.5 text-[14.5px] rounded-full hover:bg-brand-tint/60 transition-colors"
                >
                  Meine Geschichte
                </button>
              </div>
            </div>

            {/* Foto */}
            <div className="order-1 lg:order-2 relative lg:h-[560px] -mx-4 lg:mx-0 lg:mr-[calc((100vw-100%)/-2)]">
              <div className="relative h-[280px] sm:h-[360px] lg:h-full overflow-hidden lg:rounded-l-[2.5rem]">
                {HERO_IMAGES.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                    style={{ opacity: i === slideIndex ? 1 : 0 }}
                  />
                ))}
                {/* Un velo lila muy flojo solo por la izquierda, para que la
                    foto se funda con el fondo en vez de cortarse en seco. */}
                <div
                  className="absolute inset-0 pointer-events-none hidden lg:block"
                  style={{ background: "linear-gradient(to right, rgba(236,226,247,0.85) 0%, rgba(236,226,247,0) 28%)" }}
                />
                {HERO_IMAGES.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {HERO_IMAGES.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSlideIndex(i)}
                        aria-label={`Bild ${i + 1}`}
                        className="w-2 h-2 rounded-full transition-all duration-300"
                        style={{ background: i === slideIndex ? "#fff" : "rgba(255,255,255,0.45)" }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Las tres razones, debajo del hero ── */}
      <section className="bg-white">
        <div className="container mx-auto px-4 lg:px-8 py-10 lg:py-12">
          <div className="grid sm:grid-cols-3 gap-4 lg:gap-5">
            {heroStats.map(({ val, label }, i) => (
              <div
                key={label}
                className="section-fade bg-white border border-brand-tint rounded-2xl p-5 lg:p-6 flex items-start gap-4 shadow-[0_10px_30px_-24px_rgba(107,79,147,0.6)]"
                style={{ animationDelay: `${i * 110}ms` }}
              >
                <span className="w-11 h-11 shrink-0 rounded-full bg-brand-tint text-brand flex items-center justify-center">
                  {[<Sparkles key="a" className="w-5 h-5" />, <Flower2 key="b" className="w-5 h-5" />, <Package key="c" className="w-5 h-5" />][i % 3]}
                </span>
                <div>
                  <p className="font-semibold text-ink text-[15.5px] leading-tight">{val}</p>
                  <p className="text-n-500 text-[14px] mt-1 leading-snug">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Brands scroll banner ── */}
      {brands.length > 0 && (
        <div className="bg-white border-y border-n-150 py-5 overflow-hidden select-none">
          <div className="flex items-center gap-4 mb-4 px-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-n-200" />
            <p className="text-[13px] font-black uppercase tracking-[0.25em] text-brand flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-brand inline-block" />
              Unsere Marken
              <span className="w-1 h-1 rounded-full bg-brand inline-block" />
            </p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-n-200" />
          </div>
          <div
            className="flex gap-3 w-max"
            style={{ animation: "brandsScroll 55s linear infinite" }}
          >
            {[...brands, ...brands, ...brands].map((brand, i) => (
              <span
                key={i}
                className="flex-shrink-0 px-4 py-1.5 rounded-full border border-brand/20 bg-brand/5 text-[11px] font-bold text-brand uppercase tracking-wider whitespace-nowrap"
              >
                {brand}
              </span>
            ))}
          </div>
          <style>{`
            @keyframes brandsScroll {
              from { transform: translateX(0); }
              to   { transform: translateX(-33.333%); }
            }
          `}</style>
        </div>
      )}

      {/* ── Unsere Top Kategorien (dinámico, solo 9) ── */}
      <div id="spice-discovery" className="bg-brand-wash border-y border-brand-tint py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <EtiquetaCosida>Sortiment</EtiquetaCosida>
              <h2
                className="font-display font-semibold text-ink mt-3 leading-tight"
                style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.3rem)", letterSpacing: "-0.03em" }}
              >
                Unsere Top Kategorien
              </h2>
              <p className="text-sm text-n-500 mt-1">Schnell und einfach zu den passenden Produkten.</p>
            </div>
            <button
              onClick={() => router.push("/shop")}
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-brand/10 px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-brand/20 hover:gap-3 active:scale-95 transition-all duration-200 whitespace-nowrap"
            >
              Alle anzeigen <span>→</span>
            </button>
          </div>

          {/* Skeleton */}
          {categories.length === 0 && (
            <div className="flex gap-3 overflow-x-hidden -mx-4 px-4 sm:grid sm:mx-0 sm:px-0 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-brand-tint/60 animate-pulse w-[72vw] max-w-[260px] shrink-0 aspect-[1/1.15] sm:w-auto sm:max-w-none" />
              ))}
            </div>
          )}

          {/* Grid — 3 categorías con iconos */}
          {categories.length > 0 && (() => {
            // Las categorias las crea cada tienda desde el panel, asi que el icono
            // se deduce del nombre. Si ninguna palabra coincide se reparte un icono
            // estable (mismo nombre -> mismo icono) para que la retícula no baile.
            const cls = "w-7 h-7"
            const byKeyword: [RegExp, React.ReactNode][] = [
              [/kleid|shirt|mode|textil|bekleid/i, <Shirt className={cls} />],
              [/schuh|sneaker|stiefel/i,           <Footprints className={cls} />],
              [/wohn|haus|home|möbel|moebel/i,     <Home className={cls} />],
              [/kaffee|tee|getränk|getraenk/i,     <Coffee className={cls} />],
              [/beauty|pflege|kosmetik/i,          <Sparkles className={cls} />],
              [/geschenk|gutschein/i,              <Gift className={cls} />],
              [/uhr|schmuck|accessoire/i,          <Watch className={cls} />],
              [/kind|baby/i,                       <Baby className={cls} />],
              [/sport|fitness/i,                   <Dumbbell className={cls} />],
              [/technik|elektro|computer/i,        <Laptop className={cls} />],
              [/garten|pflanze|blume/i,            <Flower2 className={cls} />],
            ]
            const fallbacks = [
              <Package className={cls} />, <Sparkles className={cls} />, <Home className={cls} />,
              <Gift className={cls} />, <Watch className={cls} />, <Flower2 className={cls} />,
            ]
            const iconFor = (name: string): React.ReactNode => {
              for (const [re, node] of byKeyword) if (re.test(name)) return node
              let h = 0
              for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
              return fallbacks[Math.abs(h) % fallbacks.length]
            }
            const colors = [
              { bg: "bg-white", icon: "bg-brand/10 text-brand", accent: "text-brand", border: "hover:border-brand/40" },
              { bg: "bg-white", icon: "bg-brand/10 text-brand", accent: "text-brand", border: "hover:border-brand/40" },
              { bg: "bg-white", icon: "bg-brand/10 text-brand", accent: "text-brand", border: "hover:border-brand/40" },
            ]
            // En el telefono, una fila que se arrastra de lado; de tableta en
            // adelante, una reticula. La tarjeta es la misma en los dos sitios,
            // solo cambia como se colocan.
            return (
              <div className={`flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 sm:grid-cols-2 ${
                categories.length <= 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
              }`}>
                {categories.slice(0, 8).map((cat, i) => {
                  const c = colors[i % 3]
                  return (
                    <button
                      key={cat.id}
                      onClick={() => router.push(`/shop?cat=${encodeURIComponent(cat.name)}`)}
                      className={`${c.bg} w-[72vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none rounded-2xl border border-brand-tint hover:border-brand-pale group hover:shadow-[0_18px_40px_-28px_rgba(107,79,147,0.8)] transition-all duration-300 text-left flex flex-col relative overflow-hidden`}
                    >
                      {/* La foto manda: apaisada, a todo el ancho de la tarjeta
                          y el texto debajo. La sube ella desde el panel; si
                          todavia no hay ninguna, queda el icono. */}
                      <div className="relative w-full aspect-[4/3] overflow-hidden bg-brand-tint">
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-brand [&_svg]:w-10 [&_svg]:h-10">
                            {iconFor(cat.name)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 p-4 text-center">
                        <p className="font-semibold text-ink text-[17.5px] leading-tight group-hover:text-brand transition-colors truncate">
                          {cat.name}
                        </p>
                        <span className={`mt-2 text-[13.5px] font-semibold ${c.accent} inline-flex items-center gap-1 transition-all`}>
                          Entdecken <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })()}

          {/* Mobile CTA */}
          <div className="mt-5 sm:hidden">
            <button
              onClick={() => router.push("/shop")}
              className="w-full py-3 rounded-2xl border-2 border-brand/25 hover:border-brand text-sm font-bold text-brand transition-all"
            >
              Alle Kategorien anzeigen →
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
