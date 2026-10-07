"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { getCachedProducts, bustProductsCache, updateProductInCache, removeProductFromCache } from "@/lib/products-cache"
import { getCachedCategories, bustCategoriesCache } from "@/lib/categories-cache"
import { FOOTER_LEGAL_DEFAULTS, FOOTER_MODAL_KEYS, HERO_DEFAULTS, HERO_IMAGE_DEFAULTS } from "@/lib/site-content-defaults"
import { ProductImage } from "@/components/product-image"
import {
  ArrowLeft,
  RefreshCw,
  Filter,
  Package,
  ShoppingBag,
  DollarSign,
  CheckCircle,
  Clock,
  Flame,
  Plus,
  Edit,
  Trash2,
  Search,
  Star,
  Shield,
  X,
  AlertTriangle,
  Package2,
  Upload,
  FileSpreadsheet,
  BookOpen,
  Calendar,
  ImageIcon,
  Download,
  Images,
  Landmark,
  Store,
  Copy,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Megaphone,
  Bell,
  TrendingUp,
  Truck,
  Eye,
  Receipt,
  ArrowUpRight,
  Users,
  XCircle,
  Gift,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { features, PAQUETE } from "@/lib/features"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts"

// Interfaces für Orders
interface OrderItem {
  order_id: number
  product_id: number
  product_name: string
  product_description: string
  product_image: string
  price: number | string
  quantity: number
  subtotal: number | string
  heat_level: number
  rating: number | string
  badge: string
  origin: string
}


interface Order {
  id: number
  order_number: string
  customer_first_name: string
  customer_last_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  customer_city: string
  customer_postal_code: string
  customer_canton: string
  customer_notes: string
  total_amount: number | string
  shipping_cost: number | string
  status: "pending" | "processing" | "completed" | "cancelled"
  payment_method: string
  payment_status: "pending" | "completed" | "failed"
  created_at: string
  updated_at: string
  items_count: number
  items?: OrderItem[]
}

interface OrderStats {
  total_orders: number | string
  total_revenue: number | string
  avg_order_value: number | string
  completed_orders: number | string
  pending_orders: number | string
  processing_orders: number | string
  cancelled_orders: number | string
}

// Interfaces für Products
interface Product {
  id: number
  article_number?: string
  name: string
  description: string
  price: number | string
  category: string
  stock: number
  stock_status: "in_stock" | "low_stock" | "out_of_stock"
  heat_level: number
  rating: number | string
  badge: string
  origin: string
  supplier: string
  image_url: string
  image_url_candidates?: string[]
  created_at: string
  weight_kg: number
  shipping_on_request?: number
}

// Interfaces für Shipping
interface ShippingZone  { id: number; name: string; countries: string; enabled: boolean }
interface ShippingRange { id: number; min_kg: number; max_kg: number; label: string }
interface ShippingRate  { zone_id: number; range_id: number; price: number }

interface ProductStats {
  total_products: number
  hot_sauces: number
  bbq_sauces: number
  total_stock: number
  out_of_stock: number
  low_stock: number
  in_stock: number
}

interface Category {
  id: number
  parent_id: number | null
  is_haupt?: number
  slug: string
  name: string
  description: string
  image?: string | null
}

interface AdminProps {
  onClose: () => void
}

export default function AdminPage() {
  return <Admin onClose={() => window.history.back()} />
}

export function Admin({ onClose }: AdminProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState(features.pedidos ? "orders" : "products")
  const loadedTabsRef = useRef(new Set<string>())

  // Registered users (Kunden tab)
  type RegisteredUser = {
    id: number; email: string; firstName: string; lastName: string; phone: string
    address: string; city: string; postalCode: string; canton: string; notes: string; createdAt: string; lastAccess: string
  }
  const [users, setUsers] = useState<RegisteredUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState("")
  type UserOrder = {
    id: number; order_number: string; total_amount: string | number; status: string
    payment_method: string; payment_status: string; created_at: string; items_count: number
  }
  const [userOrders, setUserOrders] = useState<Record<number, UserOrder[]>>({})
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)
  const [userOrdersLoadingId, setUserOrdersLoadingId] = useState<number | null>(null)

  // Site content (Inhalte tab): footer modal texts + hero
  const [siteForm, setSiteForm] = useState<Record<string, string>>({})
  const [siteImagePreviews, setSiteImagePreviews] = useState<Record<number, string>>({ 1: "", 2: "", 3: "" })
  const [siteImageFiles, setSiteImageFiles] = useState<Record<number, File | null>>({ 1: null, 2: null, 3: null })
  const [siteLoading, setSiteLoading] = useState(false)
  const [siteSaving, setSiteSaving] = useState(false)
  const [siteSavedMsg, setSiteSavedMsg] = useState("")

  // Gutscheine State
  const [giftCards, setGiftCards] = useState<any[]>([])
  const [giftCardPurchases, setGiftCardPurchases] = useState<any[]>([])
  const gcEnabled = true
  const [gcLoading, setGcLoading] = useState(false)
  const [gcPurchasesLoading, setGcPurchasesLoading] = useState(false)
  const [markingGcPaidId, setMarkingGcPaidId] = useState<number | null>(null)
  const [deletingGcId, setDeletingGcId] = useState<number | null>(null)
  const [gcFormOpen, setGcFormOpen] = useState(false)
  const [gcEditItem, setGcEditItem] = useState<any | null>(null)
  const [gcFormData, setGcFormData] = useState({ name: "", description: "", amount: "", is_active: "1" })

  // Orders State
  const [orders, setOrders] = useState<Order[]>([])
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState("")
  const [currentOrderPage, setCurrentOrderPage] = useState(1)
  const [totalOrderPages, setTotalOrderPages] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null)
  const [sendingShipId, setSendingShipId] = useState<number | null>(null)
  const [shipConfirmOrder, setShipConfirmOrder] = useState<Order | null>(null)

  // Products State
  const PRODS_PER_PAGE = 24
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [productsPage, setProductsPage] = useState(0)
  const [productStats, setProductStats] = useState<ProductStats | null>(null)
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState("")
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false)
  const [currentEditingProduct, setCurrentEditingProduct] = useState<Product | null>(null)
  // "Versand auf Anfrage": producto que no se vende online (contactar). Oculta el peso.
  const [productOnRequest, setProductOnRequest] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null)
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null, null])

  // Bulk selection
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>("")
  const [showCategoryFilterModal, setShowCategoryFilterModal] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const filterCardRef = useRef<HTMLDivElement>(null)
  const statusSectionRef = useRef<HTMLDivElement>(null)
  const productsGridRef = useRef<HTMLDivElement>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [removedImages, setRemovedImages] = useState<boolean[]>([false, false, false, false])

  // Brand management (Hersteller verwalten)
  const [showBrandsModal, setShowBrandsModal] = useState(false)
  const [renamingBrand, setRenamingBrand] = useState<string | null>(null)
  const [newBrandName, setNewBrandName] = useState("")
  const [brandSaving, setBrandSaving] = useState(false)

  // Categories State
  const [categories, setCategories] = useState<Category[]>([])
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  // true = el modal crea una Hauptkategorie (nivel superior, sin padre); oculta el selector de padre
  const [forceHaupt, setForceHaupt] = useState(false)
  // Estado interactivo del modal: si esta categoría es (o se convierte en) Hauptkategorie
  const [catIsHaupt, setCatIsHaupt] = useState(false)
  // Modo de creación: "kategorie" (padre = Haupts) | "subkategorie" (padre = Kategorien, sin casilla Haupt) | null (editar/Haupt)
  const [catCreateKind, setCatCreateKind] = useState<"kategorie" | "subkategorie" | null>(null)

  // Excel Import State
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [showExcelImport, setShowExcelImport] = useState(false)
  const [showAddImport, setShowAddImport] = useState(false)
  const [categoryDeleteWarning, setCategoryDeleteWarning] = useState<string | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [importResult, setImportResult] = useState<{
    success: boolean
    inserted?: number
    updated?: number
    skipped?: number
    deleted?: number
    parsed?: number
    errors?: string[]
    error?: string
  } | null>(null)


  // Excel Add (sin borrar) State
  const [addFile, setAddFile] = useState<File | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addResult, setAddResult] = useState<{
    success: boolean
    inserted?: number
    updated?: number
    skipped?: number
    parsed?: number
    processedIds?: number[]
    errors?: string[]
    error?: string
  } | null>(null)
  type ImportBatch = { filename: string; date: string; ids: number[]; count: number }
  const [importHistory, setImportHistory] = useState<ImportBatch[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const saved: ImportBatch[] = JSON.parse(localStorage.getItem("excel-import-history") || "[]")
      const cleaned = saved.filter(b => b.ids?.length > 0)
      if (cleaned.length !== saved.length) localStorage.setItem("excel-import-history", JSON.stringify(cleaned))
      return cleaned
    } catch { return [] }
  })
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null)

  // Blog State
  interface BlogPost { id: number; title: string; content: string; hero_image?: string; hero_image_url?: string; image2_url?: string; image3_url?: string; image4_url?: string; created_at: string }
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogLoading, setBlogLoading] = useState(false)
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false)
  const [currentEditingPost, setCurrentEditingPost] = useState<BlogPost | null>(null)
  const [blogImagePreviews, setBlogImagePreviews] = useState<(string | null)[]>([null, null, null, null])
  const [blogRemovedImages, setBlogRemovedImages] = useState<boolean[]>([false, false, false, false])
  const [blogForm, setBlogForm] = useState({ title: "", content: "" })
  const [blogImageFiles, setBlogImageFiles] = useState<(File | null)[]>([null, null, null, null])
  const [blogSaving, setBlogSaving] = useState(false)
  const [deleteBlogId, setDeleteBlogId] = useState<number | null>(null)
  const [blogImageUrls, setBlogImageUrls] = useState<string[]>(["", "", "", ""])

  // Gallery State
  interface GalleryImage { id: number; title: string | null; image: string; image_url: string; created_at: string }
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false)
  const [galleryTitle, setGalleryTitle] = useState("")
  const [galleryFile, setGalleryFile] = useState<File | null>(null)
  const [galleryPreview, setGalleryPreview] = useState<string | null>(null)
  const [gallerySaving, setGallerySaving] = useState(false)
  const [deleteGalleryId, setDeleteGalleryId] = useState<number | null>(null)

  // Announcements State
  interface Announcement { id: number; type: 'general' | 'product'; title: string; subtitle: string | null; image1: string | null; image1_url: string | null; image2: string | null; image2_url: string | null; product_url: string | null; is_active: boolean; show_once: boolean; created_at: string }
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [annLoading, setAnnLoading] = useState(false)
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false)
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null)
  const [annSaving, setAnnSaving] = useState(false)
  const [deleteAnnId, setDeleteAnnId] = useState<number | null>(null)
  const [annForm, setAnnForm] = useState({ type: 'general' as 'general' | 'product', title: '', subtitle: '', product_url: '', show_once: false })
  const [annImageFiles, setAnnImageFiles] = useState<[File | null, File | null]>([null, null])
  const [annImagePreviews, setAnnImagePreviews] = useState<[string | null, string | null]>([null, null])
  const [annImageUrls, setAnnImageUrls] = useState<[string, string]>(["", ""])
  const [annRemovedImages, setAnnRemovedImages] = useState<[boolean, boolean]>([false, false])
  const [togglingAnnId, setTogglingAnnId] = useState<number | null>(null)

  // Shipping State
  const [shippingZones,  setShippingZones]  = useState<ShippingZone[]>([])
  const [shippingRanges, setShippingRanges] = useState<ShippingRange[]>([])
  const [shippingRates,  setShippingRates]  = useState<ShippingRate[]>([])
  const [shippingLoading,   setShippingLoading]   = useState(false)
  const [showCharts, setShowCharts] = useState(false)
  const [shippingSavedMsg,  setShippingSavedMsg]  = useState("")
  const [isSavingShipping,  setIsSavingShipping]  = useState(false)

  // Payment Settings State
  const [paySettings, setPaySettings] = useState({
    paypal_email: "", stripe_publishable_key: "", stripe_secret_key: "", stripe_pmc_id: "", twint_phone: "",
    bank_iban: "", bank_holder: "", bank_name: "",
    enable_paypal: false, enable_stripe: false, enable_twint: false, enable_invoice: true, enable_pickup: false,
  })
  const [payLoading,     setPayLoading]     = useState(false)
  const [paySavedMsg,    setPaySavedMsg]    = useState("")
  const [isSavingPay,    setIsSavingPay]    = useState(false)

  // Filter Orders
  const [orderFilters, setOrderFilters] = useState({
    search: "",
    status: "all",
    email: "",
  })

  // Chart Data from orders
  const orderChartData = useMemo(() => {
    if (!orders.length) return { statusData: [], paymentData: [], dailyData: [] }

    // Status distribution
    const statusCounts = { pending: 0, processing: 0, completed: 0, cancelled: 0 }
    const paymentCounts: Record<string, number> = {}
    const dailyRevenue: Record<string, number> = {}

    orders.forEach((order) => {
      // Status
      if (order.status in statusCounts) statusCounts[order.status as keyof typeof statusCounts]++

      // Payment method
      const m = (order.payment_method || "").toLowerCase()
      let method = "Andere"
      if (m.includes("twint")) method = "TWINT"
      else if (m.includes("paypal")) method = "PayPal"
      else if (m.includes("stripe") || m.includes("card")) method = "Kreditkarte"
      else if (m.includes("invoice") || m.includes("rechnung")) method = "Rechnung"
      else if (m.includes("pickup") || m.includes("abhol")) method = "Abholung"
      paymentCounts[method] = (paymentCounts[method] || 0) + 1

      // Daily revenue
      const date = order.created_at?.split(" ")[0] || order.created_at?.split("T")[0] || "Unknown"
      const shortDate = date.slice(5) // MM-DD
      dailyRevenue[shortDate] = (dailyRevenue[shortDate] || 0) + (Number.parseFloat(String(order.total_amount)) || 0)
    })

    const statusData = [
      { name: "Abgeschlossen", value: statusCounts.completed, color: "#10b981" },
      { name: "In Bearbeitung", value: statusCounts.processing, color: "#3b82f6" },
      { name: "Ausstehend", value: statusCounts.pending, color: "#f59e0b" },
      { name: "Storniert", value: statusCounts.cancelled, color: "#ef4444" },
    ].filter(d => d.value > 0)

    const paymentColors: Record<string, string> = {
      "TWINT": "#9333ea", "PayPal": "#3b82f6", "Kreditkarte": "#6366f1", "Rechnung": "#64748b", "Abholung": "#f59e0b", "Andere": "#94a3b8"
    }
    const paymentData = Object.entries(paymentCounts).map(([name, value]) => ({
      name, value, color: paymentColors[name] || "#94a3b8"
    }))

    const dailyData = Object.entries(dailyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))

    return { statusData, paymentData, dailyData }
  }, [orders])

  // Filter Products
  const [productFilters, setProductFilters] = useState({
    search: "",
    category: "",
    stock_status: "",
    sortBy: "name",
  })

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  useEffect(() => {
    const onScroll = () => {
      const el = filterCardRef.current
      if (!el) { setHasScrolled(window.scrollY > 200); return }
      const rect = el.getBoundingClientRect()
      setHasScrolled(rect.bottom < 64)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // On mount: mark orders as loaded (the tab effect handles the actual fetch)
  useEffect(() => {
    loadedTabsRef.current.add("orders")
  }, [])

  // Lazy-load tab data on first visit; reload orders/products on every visit
  useEffect(() => {
    const loaded = loadedTabsRef.current
    if (activeTab === "orders") {
      loadOrders()
    } else if (activeTab === "products") {
      loadProducts(true)
      if (!loaded.has("categories")) { loadCategories(true); loaded.add("categories") }
    } else if (activeTab === "blog") {
      if (!loaded.has("blog")) { loadBlogPosts(); loaded.add("blog") }
    } else if (activeTab === "gallery") {
      if (!loaded.has("gallery")) { loadGalleryImages(); loaded.add("gallery") }
    } else if (activeTab === "anuncios") {
      if (!loaded.has("anuncios")) { loadAnnouncements(); loaded.add("anuncios") }
    } else if (activeTab === "versand") {
      if (!loaded.has("versand")) { loadShippingSettings(); loaded.add("versand") }
    } else if (activeTab === "einstellungen") {
      if (!loaded.has("einstellungen")) { loadPaymentSettings(); loaded.add("einstellungen") }
    } else if (activeTab === "gutscheine") {
      loadGiftCards()
      loadGiftCardPurchases()
    } else if (activeTab === "kunden") {
      if (!loaded.has("kunden")) { loadUsers(); loaded.add("kunden") }
    } else if (activeTab === "inhalte") {
      if (!loaded.has("inhalte")) { loadSiteSettings(); loaded.add("inhalte") }
    }
  }, [activeTab, currentOrderPage, orderFilters])

  useEffect(() => {
    if (activeTab === "products") {
      filterProducts()
    }
  }, [products, productFilters])

  // Al entrar en products, selecciona la primera categoría por defecto
  const defaultCatApplied = useRef(false)
  useEffect(() => {
    if (activeTab === "products" && categories.length > 0 && !defaultCatApplied.current) {
      defaultCatApplied.current = true
      setProductFilters(prev => prev.category ? prev : { ...prev, category: categories[0].slug })
    }
  }, [categories, activeTab])

  // Inhalte (site content) Functions
  const loadSiteSettings = async () => {
    setSiteLoading(true)
    try {
      const res = await fetch(`/api/site-settings`)
      const data = await res.json()
      const s: Record<string, string> = (data.success && data.settings) ? data.settings : {}

      const form: Record<string, string> = {}
      // Footer: textos de cada modal (con fallback al texto por defecto)
      for (const k of FOOTER_MODAL_KEYS) {
        form[`footer_${k}_title`] = s[`footer_${k}_title`] ?? FOOTER_LEGAL_DEFAULTS[k].title
        form[`footer_${k}_content`] = s[`footer_${k}_content`] ?? FOOTER_LEGAL_DEFAULTS[k].content
      }
      // Hero
      HERO_DEFAULTS.badges.forEach((d, i) => { form[`hero_badge_${i + 1}`] = s[`hero_badge_${i + 1}`] ?? d })
      form["hero_title_1"] = s["hero_title_1"] ?? HERO_DEFAULTS.titleLine1
      form["hero_title_2"] = s["hero_title_2"] ?? HERO_DEFAULTS.titleLine2
      form["hero_subtitle"] = s["hero_subtitle"] ?? HERO_DEFAULTS.subtitle
      HERO_DEFAULTS.stats.forEach((d, i) => {
        form[`hero_stat${i + 1}_val`] = s[`hero_stat${i + 1}_val`] ?? d.val
        form[`hero_stat${i + 1}_label`] = s[`hero_stat${i + 1}_label`] ?? d.label
      })
      setSiteForm(form)

      setSiteImagePreviews({
        1: s["hero_image_1_url"] || HERO_IMAGE_DEFAULTS[0],
        2: s["hero_image_2_url"] || HERO_IMAGE_DEFAULTS[1],
        3: s["hero_image_3_url"] || HERO_IMAGE_DEFAULTS[2],
      })
      setSiteImageFiles({ 1: null, 2: null, 3: null })
    } catch {
      toast({ title: "Fehler", description: "Inhalte konnten nicht geladen werden", variant: "destructive" })
    } finally {
      setSiteLoading(false)
    }
  }

  const handleSiteImageChange = (slot: number, file: File | null) => {
    if (!file) return
    setSiteImageFiles(prev => ({ ...prev, [slot]: file }))
    setSiteImagePreviews(prev => ({ ...prev, [slot]: URL.createObjectURL(file) }))
  }

  const saveSiteSettings = async () => {
    setSiteSaving(true)
    setSiteSavedMsg("")
    try {
      const fd = new FormData()
      Object.entries(siteForm).forEach(([k, v]) => fd.append(k, v ?? ""))
      ;[1, 2, 3].forEach(slot => {
        const f = siteImageFiles[slot]
        if (f) fd.append(`hero_image_${slot}`, f)
      })
      const res = await fetch(`/api/site-settings`, { method: "POST", body: fd })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Fehler beim Speichern")
      setSiteSavedMsg("Gespeichert ✓")
      setTimeout(() => setSiteSavedMsg(""), 3000)
      loadSiteSettings()
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" })
    } finally {
      setSiteSaving(false)
    }
  }

  // Kunden (registered users) Functions
  const loadUsers = async () => {
    setUsersLoading(true)
    setUsersError("")
    try {
      const res = await fetch(`/api/users`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.users || [])
      } else {
        throw new Error(data.error || "Fehler beim Laden der Kunden")
      }
    } catch (e: any) {
      setUsersError(e.message || "Fehler beim Laden der Kunden")
    } finally {
      setUsersLoading(false)
    }
  }

  const toggleUserOrders = async (u: RegisteredUser) => {
    if (expandedUserId === u.id) {
      setExpandedUserId(null)
      return
    }
    setExpandedUserId(u.id)
    if (userOrders[u.id] || !u.email) return // ya cargado o sin email
    setUserOrdersLoadingId(u.id)
    try {
      const res = await fetch(`/api/user-orders?email=${encodeURIComponent(u.email)}&limit=50`)
      const data = await res.json()
      if (data.success) {
        setUserOrders(prev => ({ ...prev, [u.id]: data.data || data.orders || [] }))
      } else {
        throw new Error(data.error || "Fehler")
      }
    } catch {
      toast({ title: "Fehler", description: "Bestellungen konnten nicht geladen werden", variant: "destructive" })
      setUserOrders(prev => ({ ...prev, [u.id]: [] }))
    } finally {
      setUserOrdersLoadingId(null)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: "Kopiert", description: `${label} wurde kopiert` })
    } catch {
      toast({ title: "Fehler", description: "Konnte nicht kopieren", variant: "destructive" })
    }
  }

  const copyAllEmails = async () => {
    const emails = users.map(u => u.email).filter(Boolean)
    if (emails.length === 0) {
      toast({ title: "Keine E-Mails", description: "Es gibt keine E-Mails zum Kopieren", variant: "destructive" })
      return
    }
    await copyToClipboard(emails.join(", "), `${emails.length} E-Mail-Adressen`)
  }

  // Blog Functions
  const loadBlogPosts = async () => {
    setBlogLoading(true)
    try {
      const res = await fetch("/api/blog")
      const d = await res.json()
      if (d.success) setBlogPosts(d.posts)
    } catch {}
    finally { setBlogLoading(false) }
  }

  const openBlogModal = (post?: BlogPost) => {
    setCurrentEditingPost(post ?? null)
    setBlogForm({ title: post?.title ?? "", content: post?.content ?? "" })
    setBlogImagePreviews([post?.hero_image_url ?? null, post?.image2_url ?? null, post?.image3_url ?? null, post?.image4_url ?? null])
    setBlogRemovedImages([false, false, false, false])
    setBlogImageFiles([null, null, null, null])
    setBlogImageUrls(["", "", "", ""])
    setIsBlogModalOpen(true)
  }

  const saveBlogPost = async () => {
    if (!blogForm.title.trim() || !blogForm.content.trim()) {
      toast({ title: "Fehler", description: "Titel und Inhalt sind erforderlich", variant: "destructive" }); return
    }
    setBlogSaving(true)
    try {
      const fd = new FormData()
      const fields = ["hero_image", "image2", "image3", "image4"]
      if (currentEditingPost) {
        fd.append("id", String(currentEditingPost.id))
        blogRemovedImages.forEach((r, i) => { if (r) fd.append("remove_" + fields[i], "1") })
      }
      fd.append("title", blogForm.title)
      fd.append("content", blogForm.content)
      blogImageFiles.forEach((f, i) => { if (f) fd.append(fields[i], f) })
      blogImageUrls.forEach((u, i) => { if (u.trim() && !blogImageFiles[i]) fd.append(fields[i] + "_url", u.trim()) })
      const url = currentEditingPost
        ? `/api/blog/edit`
        : `/api/blog/add`
      const res = await fetch(url, { method: "POST", body: fd })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast({ title: currentEditingPost ? "Post aktualisiert" : "Post erstellt" })
      setIsBlogModalOpen(false)
      await loadBlogPosts()
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" })
    } finally { setBlogSaving(false) }
  }

  const deleteBlogPost = async (id: number) => {
    try {
      const res = await fetch(`/api/blog/edit?id=${id}`, { method: "DELETE" })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast({ title: "Post gelöscht" })
      setDeleteBlogId(null)
      await loadBlogPosts()
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" })
    }
  }

  // Gallery Functions
  const loadGalleryImages = async () => {
    setGalleryLoading(true)
    try {
      const res = await fetch("/api/gallery")
      const d = await res.json()
      if (d.success) setGalleryImages(d.images)
    } catch {}
    finally { setGalleryLoading(false) }
  }

  const openGalleryModal = () => {
    setGalleryTitle("")
    setGalleryFile(null)
    setGalleryPreview(null)
    setIsGalleryModalOpen(true)
  }

  const saveGalleryImage = async () => {
    if (!galleryFile) {
      toast({ title: "Fehler", description: "Bitte ein Bild auswählen", variant: "destructive" }); return
    }
    setGallerySaving(true)
    try {
      const fd = new FormData()
      fd.append("image", galleryFile)
      if (galleryTitle.trim()) fd.append("title", galleryTitle.trim())
      const res = await fetch("/api/gallery/add", { method: "POST", body: fd })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast({ title: "Bild hochgeladen" })
      setIsGalleryModalOpen(false)
      await loadGalleryImages()
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" })
    } finally { setGallerySaving(false) }
  }

  const deleteGalleryImage = async (id: number) => {
    try {
      const res = await fetch(`/api/gallery/delete?id=${id}`, { method: "DELETE" })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast({ title: "Bild gelöscht" })
      setDeleteGalleryId(null)
      await loadGalleryImages()
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" })
    }
  }

  // Announcement Functions
  const loadAnnouncements = async () => {
    setAnnLoading(true)
    try {
      const res = await fetch("/api/announcement")
      const d = await res.json()
      if (d.success) setAnnouncements(d.announcements ?? [])
    } catch {}
    finally { setAnnLoading(false) }
  }

  const openAnnModal = (ann?: Announcement) => {
    setEditingAnn(ann ?? null)
    setAnnForm({
      type: ann?.type ?? 'general',
      title: ann?.title ?? '',
      subtitle: ann?.subtitle ?? '',
      product_url: ann?.product_url ?? '',
      show_once: ann?.show_once ?? false,
    })
    setAnnImagePreviews([ann?.image1_url ?? null, ann?.image2_url ?? null])
    setAnnImageFiles([null, null])
    setAnnImageUrls(["", ""])
    setAnnRemovedImages([false, false])
    setIsAnnModalOpen(true)
  }

  const saveAnnouncement = async () => {
    if (!annForm.title.trim()) {
      toast({ title: "Fehler", description: "Titel ist erforderlich", variant: "destructive" }); return
    }
    setAnnSaving(true)
    try {
      const fd = new FormData()
      fd.append("action", "save")
      if (editingAnn) fd.append("id", String(editingAnn.id))
      fd.append("type", annForm.type)
      fd.append("title", annForm.title)
      fd.append("subtitle", annForm.subtitle)
      fd.append("product_url", annForm.product_url)
      fd.append("show_once", annForm.show_once ? "1" : "")
      ;([0, 1] as const).forEach(i => {
        const key = i === 0 ? "image1" : "image2"
        if (annRemovedImages[i]) fd.append(`remove_${key}`, "1")
        if (annImageFiles[i]) fd.append(key, annImageFiles[i]!)
        else if (annImageUrls[i]) fd.append(`${key}_url`, annImageUrls[i])
      })
      const res = await fetch("/api/announcement/save", { method: "POST", body: fd })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast({ title: editingAnn ? "Aktualisiert" : "Erstellt" })
      setIsAnnModalOpen(false)
      await loadAnnouncements()
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" })
    } finally { setAnnSaving(false) }
  }

  const deleteAnnouncement = async (id: number) => {
    try {
      const res = await fetch(`/api/announcement/save?id=${id}`, { method: "DELETE" })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast({ title: "Anzeige gelöscht" })
      setDeleteAnnId(null)
      await loadAnnouncements()
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" })
    }
  }

  const toggleAnnouncement = async (id: number) => {
    setTogglingAnnId(id)
    try {
      const fd = new FormData()
      fd.append("action", "toggle")
      fd.append("id", String(id))
      const res = await fetch("/api/announcement/save", { method: "POST", body: fd })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      await loadAnnouncements()
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" })
    } finally { setTogglingAnnId(null) }
  }

  // Shipping Functions
  const loadShippingSettings = async () => {
    setShippingLoading(true)
    try {
      const res = await fetch(`/api/shipping-settings`)
      const d = await res.json()
      if (d.success) {
        setShippingZones(d.zones)
        setShippingRanges(d.ranges)
        setShippingRates(d.rates)
      }
    } catch {}
    finally { setShippingLoading(false) }
  }

  const getRate = (zoneId: number, rangeId: number) =>
    shippingRates.find(r => r.zone_id === zoneId && r.range_id === rangeId)?.price ?? 0

  const setRate = (zoneId: number, rangeId: number, price: number) => {
    setShippingRates(prev => {
      const idx = prev.findIndex(r => r.zone_id === zoneId && r.range_id === rangeId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { zone_id: zoneId, range_id: rangeId, price }
        return next
      }
      return [...prev, { zone_id: zoneId, range_id: rangeId, price }]
    })
  }

  const saveShippingSettings = async () => {
    setIsSavingShipping(true)
    setShippingSavedMsg("")
    try {
      const res = await fetch(`/api/shipping-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zones: shippingZones, ranges: shippingRanges, rates: shippingRates }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setShippingSavedMsg("Gespeichert ✓")
      setTimeout(() => setShippingSavedMsg(""), 3000)
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" })
    } finally { setIsSavingShipping(false) }
  }

  // Payment Settings Functions
  const loadPaymentSettings = async () => {
    setPayLoading(true)
    try {
      const res = await fetch(`/api/payment-settings`)
      const d = await res.json()
      if (d.success) setPaySettings(d.settings)
    } catch {}
    finally { setPayLoading(false) }
  }

  const savePaymentSettings = async () => {
    setIsSavingPay(true)
    setPaySavedMsg("")
    try {
      const res = await fetch(`/api/payment-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paySettings),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setPaySavedMsg("Gespeichert ✓")
      setTimeout(() => setPaySavedMsg(""), 3000)
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" })
    } finally { setIsSavingPay(false) }
  }

  // Orders Functions
  const sendShippingNotification = async (order: Order) => {
    setSendingShipId(order.id)
    try {
      const res = await fetch("/api/orders/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "processing" } : o))
        toast({ title: "📦 Versandbenachrichtigung gesendet", description: `Email an ${order.customer_email} gesendet.` })
      } else {
        toast({ title: "Fehler", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Verbindungsfehler", variant: "destructive" })
    } finally {
      setSendingShipId(null)
    }
  }

  const markAsPaid = async (order: Order) => {
    setMarkingPaidId(order.id)
    try {
      const res = await fetch("/api/orders/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, payment_status: "completed", status: "completed" }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: "completed", status: "completed" } : o))
        toast({ title: "Als bezahlt markiert" })
      } else {
        toast({ title: "Fehler", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Verbindungsfehler", variant: "destructive" })
    } finally {
      setMarkingPaidId(null)
    }
  }

  // ── Gutscheine functions ──
  const loadGiftCards = async () => {
    setGcLoading(true)
    try {
      const res = await fetch("/api/gutscheine?all=1")
      const data = await res.json()
      if (data.success) setGiftCards(data.gift_cards)
    } catch {}
    finally { setGcLoading(false) }
  }

  const loadGiftCardPurchases = async () => {
    setGcPurchasesLoading(true)
    try {
      const res = await fetch("/api/gutscheine/purchases")
      const data = await res.json()
      if (data.success) setGiftCardPurchases(data.purchases)
    } catch {}
    finally { setGcPurchasesLoading(false) }
  }

  const handleGcFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append("name", gcFormData.name)
    formData.append("description", gcFormData.description)
    formData.append("amount", gcFormData.amount)
    formData.append("is_active", gcFormData.is_active)
    if (gcEditItem) formData.append("id", gcEditItem.id)

    const url = gcEditItem ? "/api/gutscheine/edit" : "/api/gutscheine/add"
    const res = await fetch(url, { method: "POST", body: formData })
    const data = await res.json()
    if (data.success) {
      toast({ title: gcEditItem ? "Gutschein aktualisiert" : "Gutschein erstellt" })
      setGcFormOpen(false); setGcEditItem(null)
      setGcFormData({ name: "", description: "", amount: "", is_active: "1" })
      loadGiftCards()
    } else {
      toast({ title: "Fehler", description: data.error, variant: "destructive" })
    }
  }

  const handleDeleteGiftCard = async (id: number) => {
    if (!confirm("Gutschein löschen?")) return
    const res = await fetch("/api/gutscheine/edit", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    const data = await res.json()
    if (data.success) { toast({ title: "Gelöscht" }); loadGiftCards() }
    else toast({ title: "Fehler", description: data.error, variant: "destructive" })
  }

  const handleMarkGcPaid = async (purchase: any) => {
    setMarkingGcPaidId(purchase.id)
    try {
      const res = await fetch("/api/gutscheine/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: purchase.id }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Als bezahlt markiert", description: "E-Mail mit aktivem Code wurde versendet" })
        loadGiftCardPurchases()
        loadOrders()
      } else {
        toast({ title: "Fehler", description: data.error, variant: "destructive" })
      }
    } catch {}
    finally { setMarkingGcPaidId(null) }
  }

  const handleDeleteGcPurchase = async (purchase: any) => {
    setDeletingGcId(purchase.id)
    try {
      const fd = new FormData()
      fd.append("id", purchase.id.toString())
      const res = await fetch("/api/gutscheine/delete-purchase", { method: "POST", body: fd })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Gelöscht", description: "Gutschein-Kauf wurde entfernt" })
        loadGiftCardPurchases()
      } else {
        toast({ title: "Fehler", description: data.error, variant: "destructive" })
      }
    } catch {}
    finally { setDeletingGcId(null) }
  }

  const loadOrders = async () => {
    try {
      setOrdersLoading(true)
      setOrdersError("")

      const params = new URLSearchParams({
        page: currentOrderPage.toString(),
        limit: "20",
        include_items: "true",
        ...Object.fromEntries(Object.entries(orderFilters).filter(([_, value]) => value && value !== "all")),
      })

      const response = await fetch(`/api/orders?${params}`)
      const data = await response.json()

      if (data.success) {
        setOrders(data.data)
        setOrderStats(data.stats)
        setTotalOrderPages(data.pagination?.total_pages ?? 1)
      } else {
        setOrdersError("Fehler beim Laden der Bestellungen")
      }
    } catch (err) {
      setOrdersError("Verbindungsfehler")
      console.error("Error loading orders:", err)
    } finally {
      setOrdersLoading(false)
    }
  }

  const handleOrderFilterChange = (key: string, value: string) => {
    setOrderFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentOrderPage(1)
  }

  const showOrderDetail = (order: Order) => {
    setSelectedOrder(order)
    setIsOrderModalOpen(true)
  }

  // Products Functions
  const loadProducts = async (bust = false) => {
    try {
      setProductsLoading(true)
      setProductsError("")

      const hasFilter = !!productFilters.stock_status

      if (bust) bustProductsCache()

      if (hasFilter) {
        // Filtros especiales: va directo a PHP con params
        const params = new URLSearchParams()
        params.append("stock_status", productFilters.stock_status)
        params.append("_", Date.now().toString())
        const response = await fetch(`/api/products?${params}`)
        const data = await response.json()
        if (data.success) { setProducts(data.products); setProductStats(data.stats) }
        else setProductsError("Fehler beim Laden der Produkte")
        return
      }

      const { products, stats } = await getCachedProducts(bust)
      setProducts(products)
      setProductStats(stats)
    } catch (err) {
      setProductsError("Verbindungsfehler")
      console.error("Error loading products:", err)
    } finally {
      setProductsLoading(false)
    }
  }

  const loadCategories = async (bust = false) => {
    try {
      if (bust) bustCategoriesCache()
      const cats = await getCachedCategories(bust)
      setCategories(cats)
    } catch (err) {
      console.error("Error loading categories:", err)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const isEditing = editingCategory !== null
    if (isEditing) formData.append("id", editingCategory.id.toString())
    const url = isEditing ? `/api/categories/edit` : `/api/categories/add`
    try {
      const response = await fetch(url, { method: "POST", body: formData })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Erfolg", description: isEditing ? "Kategorie aktualisiert" : "Kategorie erstellt" })
        setIsCategoryModalOpen(false)
        setEditingCategory(null)
        loadCategories(true)
        ;(e.target as HTMLFormElement).reset()
      } else {
        throw new Error(data.error || "Fehler")
      }
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
    }
  }

  const handleDeleteCategory = async (cat: Category) => {
    try {
      // Borrar primero todos los productos de esta categoría
      const catProductIds = products.filter(p => p.category === cat.slug).map(p => p.id)
      if (catProductIds.length > 0) {
        await fetch(`/api/delete-import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: catProductIds }),
        })
      }
      // Borrar la categoría
      const response = await fetch(`/api/categories/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `id=${cat.id}`,
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Erfolg", description: catProductIds.length > 0 ? `Kategorie und ${catProductIds.length} Produkte gelöscht` : "Kategorie gelöscht" })
        loadProducts(true)
        loadCategories(true)
      } else {
        toast({ title: "Nicht möglich", description: data.error, variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
    }
  }

  const renameBrandGroup = async (variants: string[], newName: string) => {
    const trimmed = newName.trim()
    const toRename = variants.filter(v => v !== trimmed)
    if (!trimmed || toRename.length === 0) { setRenamingBrand(null); setNewBrandName(""); return }
    try {
      setBrandSaving(true)
      let totalUpdated = 0
      for (const old of toRename) {
        const res = await fetch(`/api/rename-brand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ old_name: old, new_name: trimmed }),
        })
        const data = await res.json()
        if (data.success) totalUpdated += data.updated || 0
        else throw new Error(data.error || "Fehler")
      }
      toast({ title: "Erfolg", description: `${totalUpdated} Produkt(e) aktualisiert` })
      setRenamingBrand(null)
      setNewBrandName("")
      loadProducts(true)
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" })
    } finally {
      setBrandSaving(false)
    }
  }

  const filterProducts = () => {
    let filtered = [...products]

    // Una coincidencia por número de referencia o ID ignora el filtro de categoría
    const matchesReference = (product: Product, term: string) =>
      (product.article_number && product.article_number.toLowerCase().includes(term)) ||
      String(product.id).includes(term)

    const searchTerm = productFilters.search ? productFilters.search.toLowerCase() : ""

    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm) ||
          (product.description ?? "").toLowerCase().includes(searchTerm) ||
          (product.badge && product.badge.toLowerCase().includes(searchTerm)) ||
          (product.origin && product.origin.toLowerCase().includes(searchTerm)) ||
          (product.supplier && product.supplier.toLowerCase().includes(searchTerm)) ||
          matchesReference(product, searchTerm),
      )
    }

    // El chip de categoría solo filtra cuando NO se está buscando por texto.
    // Si hay término de búsqueda, se busca en todas las categorías.
    if (productFilters.category && searchTerm === "") {
      filtered = filtered.filter((product) => product.category === productFilters.category)
    }

    if (productFilters.stock_status) {
      filtered = filtered.filter((product) => product.stock_status === productFilters.stock_status)
    }

    filtered.sort((a, b) => {
      switch (productFilters.sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "price":
          return Number.parseFloat(a.price.toString()) - Number.parseFloat(b.price.toString())
        case "stock":
          return b.stock - a.stock
        case "rating":
          return Number.parseFloat(b.rating.toString()) - Number.parseFloat(a.rating.toString())
        case "heat_level":
          return b.heat_level - a.heat_level
        case "category":
          return a.category.localeCompare(b.category)
        case "created_at":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
    setProductsPage(0)
  }

  const PRODUCT_LIMIT = 1024

  const showAddProductModal = () => {
    if (products.length >= PRODUCT_LIMIT) {
      setIsLimitModalOpen(true)
      return
    }
    setCurrentEditingProduct(null)
    setProductOnRequest(false)
    setIsDuplicating(false)
    setImagePreviews([null, null, null, null])
    setRemovedImages([false, false, false, false])
    setIsProductModalOpen(true)
  }

  const duplicateCurrentProduct = () => {
    if (!currentEditingProduct) return
    if (products.length >= PRODUCT_LIMIT) {
      setIsProductModalOpen(false)
      setIsLimitModalOpen(true)
      return
    }
    // Mantener los valores precargados, pero crear como producto nuevo (sin imágenes)
    setIsDuplicating(true)
    setImagePreviews([null, null, null, null])
    setRemovedImages([false, false, false, false])
    toast({
      title: "Produkt duplizieren",
      description: "Passen Sie die Felder an und laden Sie die Bilder hoch, um ein neues Produkt zu erstellen.",
    })
  }

  const showEditProductModal = async (id: number) => {
    try {
      // Pedir el producto COMPLETO por ID: el caché slim trunca la descripción
      // a 150 chars y el formulario de edición necesita el texto entero.
      let product: any = null
      try {
        const res = await fetch(`/api/products?id=${id}&_=${Date.now()}`)
        const data = await res.json()
        if (data?.success && data.product) product = data.product
      } catch {}

      // Fallback al caché slim si la API falla (mejor algo que nada).
      if (!product) {
        const { products } = await getCachedProducts()
        product = products.find((p: any) => p.id === id)
      }

      if (product) {
        setCurrentEditingProduct(product as any)
        setProductOnRequest(!!(product as any).shipping_on_request)
        setIsDuplicating(false)
        setImagePreviews((product as any).image_urls || [(product as any).image_url, null, null, null])
        setRemovedImages([false, false, false, false])
        setIsProductModalOpen(true)
      } else {
        toast({ title: "Fehler", description: "Produkt nicht gefunden", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error loading product:", error)
      toast({ title: "Fehler", description: "Fehler beim Laden des Produkts", variant: "destructive" })
    }
  }

  const showDeleteProductModal = (id: number, name: string) => {
    setDeleteProductId(id)
    setIsDeleteModalOpen(true)
  }

  const toggleProductSelection = (id: number) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      if (next.size > 0) {
        setTimeout(() => statusSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set())
    } else {
      setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)))
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedProductIds.size === 0) return
    setBulkLoading(true)
    try {
      // Sequential — never flood PHP with parallel requests
      for (const id of Array.from(selectedProductIds)) {
        const product = products.find((p) => p.id === id)
        if (!product) continue
        const formData = new FormData()
        formData.append("id", id.toString())
        formData.append("name", product.name)
        formData.append("price", product.price.toString())
        formData.append("stock_status", bulkStatus)
        if (bulkStatus === "out_of_stock") {
          formData.append("stock", "0")
        } else if (bulkStatus === "in_stock" && Number(product.stock) === 0) {
          formData.append("stock", "5")
        } else {
          formData.append("stock", product.stock.toString())
        }
        formData.append("keep_image_0", "true")
        const res = await fetch(`/api/edit-product`, { method: "POST", body: formData })
        if (!res.ok) throw new Error(`${res.status}`)
      }
      toast({ title: "Erfolg", description: `${selectedProductIds.size} Produkte aktualisiert` })
      // Actualizar estado local y caché sin fetch a PHP
      const updatedIds = new Set(selectedProductIds)
      const newStock = bulkStatus === "out_of_stock" ? 0 : undefined
      setProducts(prev => prev.map(p => {
        if (!updatedIds.has(p.id)) return p
        const updated: Product = { ...p, stock_status: bulkStatus as Product["stock_status"], ...(newStock !== undefined ? { stock: newStock } : {}) }
        updateProductInCache(updated)
        return updated
      }))
      setSelectedProductIds(new Set())
      setBulkStatus("")
    } catch {
      toast({ title: "Fehler", description: "Fehler beim Aktualisieren", variant: "destructive" })
    } finally {
      setBulkLoading(false)
    }
  }

  const handleProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const isEditing = currentEditingProduct !== null && !isDuplicating

    if (isEditing) {
      formData.append("id", currentEditingProduct.id.toString())
    }

    const form = e.currentTarget
    for (let i = 0; i < 4; i++) {
      const imageInput = form.elements.namedItem(`image_${i}`) as HTMLInputElement
      if (imageInput?.files?.[0]) {
        formData.append(`image_${i}`, imageInput.files[0])
      } else if (isEditing) {
        if (removedImages[i]) {
          formData.append(`remove_image_${i}`, 'true')
        } else if (imagePreviews[i]) {
          formData.append(`keep_image_${i}`, 'true')
        }
      }
    }

    try {
      const url = isEditing ? `/api/edit-product` : `/api/add-product`

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Erfolg",
          description: isEditing ? "Produkt erfolgreich aktualisiert" : "Produkt erfolgreich hinzugefügt",
        })
        setIsProductModalOpen(false)
        if (isEditing && currentEditingProduct) {
          const stockRaw = formData.get("stock") as string
          const priceRaw = formData.get("price") as string
          const newStock = stockRaw !== null && stockRaw !== "" ? parseInt(stockRaw) : currentEditingProduct.stock
          const newPrice = priceRaw !== null && priceRaw !== "" ? parseFloat(priceRaw) : currentEditingProduct.price
          const newStockStatus: Product["stock_status"] =
            newStock === 0 ? "out_of_stock" : newStock <= 10 ? "low_stock" : "in_stock"
          const updated: Product = {
            ...currentEditingProduct,
            name: (formData.get("name") as string) || currentEditingProduct.name,
            article_number: (formData.get("article_number") as string) ?? currentEditingProduct.article_number,
            price: newPrice,
            stock: newStock,
            stock_status: newStockStatus,
            category: (formData.get("category") as string) || currentEditingProduct.category,
            description: (formData.get("description") as string) || currentEditingProduct.description,
            // Si PHP devuelve imagen subida, usarla; si no, conservar la URL existente (Excel/local)
            image_url: data.image_url ?? currentEditingProduct.image_url,
            image_url_candidates: data.image_url != null ? ((data as any).image_url_candidates ?? []) : (currentEditingProduct.image_url_candidates ?? []),
          }
          updateProductInCache(updated)
          setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
        } else {
          // Producto nuevo: bust cliente + servidor para traer el ID real de PHP
          loadProducts(true)
        }
      } else {
        throw new Error(data.error || "Fehler beim Speichern des Produkts")
      }
    } catch (error) {
      console.error("Error saving product:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Speichern des Produkts",
        variant: "destructive",
      })
    }
  }

  const confirmDeleteProduct = async () => {
    if (!deleteProductId) return

    try {
      const response = await fetch(`/api/edit-product`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `id=${deleteProductId}`,
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Erfolg",
          description: "Produkt erfolgreich gelöscht",
        })
        setIsDeleteModalOpen(false)
        const removedId = deleteProductId!
        setDeleteProductId(null)
        removeProductFromCache(removedId)
        setProducts(prev => prev.filter(p => p.id !== removedId))
      } else {
        throw new Error(data.error || "Fehler beim Löschen des Produkts")
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Fehler",
        description: "Fehler beim Löschen des Produkts",
        variant: "destructive",
      })
    }
  }

  const handleExcelImport = async () => {
    if (!importFile) return
    setImportLoading(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append("file", importFile)
      const response = await fetch("/api/import-products", { method: "POST", body: formData })
      const data = await response.json()
      setImportResult(data)
      if (data.success) {
        toast({ title: "Import erfolgreich", description: `${data.inserted} neu, ${data.updated} aktualisiert, ${data.deleted ?? 0} gelöscht` })
        loadProducts(true)
        loadCategories(true)
      } else {
        toast({ title: "Import fehlgeschlagen", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Fehler", description: "Verbindungsfehler beim Import", variant: "destructive" })
    } finally {
      setImportLoading(false)
    }
  }

  const handleExcelAdd = async () => {
    if (!addFile) return
    setAddLoading(true)
    setAddResult(null)
    try {
      const formData = new FormData()
      formData.append("file", addFile)
      const response = await fetch("/api/add-products", { method: "POST", body: formData })
      const data = await response.json()
      setAddResult(data)
      if (data.success) {
        toast({ title: "Hinzufügen erfolgreich", description: `${data.inserted} neu, ${data.updated} aktualisiert — nichts gelöscht` })
        loadProducts(true)
        loadCategories(true)
        if (data.processedIds?.length > 0) {
          const batch = { filename: addFile.name, date: new Date().toLocaleString("de-CH"), ids: data.processedIds, count: data.processedIds.length }
          const updated = [batch, ...importHistory].slice(0, 20)
          setImportHistory(updated)
          localStorage.setItem("excel-import-history", JSON.stringify(updated))
        }
      } else {
        toast({ title: "Fehler", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Fehler", description: "Verbindungsfehler", variant: "destructive" })
    } finally {
      setAddLoading(false)
    }
  }

  const handleDeleteBatch = async (batch: ImportBatch) => {
    setDeletingBatch(batch.date)
    try {
      const response = await fetch("/api/delete-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: batch.ids }) })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Gelöscht", description: `${data.deleted} Produkte aus "${batch.filename}" entfernt` })
        const updated = importHistory.filter(b => b.date !== batch.date)
        setImportHistory(updated)
        localStorage.setItem("excel-import-history", JSON.stringify(updated))
        loadProducts(true)
        loadCategories()
      } else {
        toast({ title: "Fehler", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Fehler", description: "Verbindungsfehler", variant: "destructive" })
    } finally {
      setDeletingBatch(null)
    }
  }

  const handleImageChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newPreviews = [...imagePreviews]
        newPreviews[index] = e.target?.result as string
        setImagePreviews(newPreviews)
      }
      reader.readAsDataURL(file)
    }
  }

  // Utility Functions
  const downloadInvoicePDF = async (order: Order) => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 15

    // Logo
    try {
      const img = new window.Image()
      img.src = "/Secuxrity_n.jpg"
      await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res() })
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth || 1
      canvas.height = img.naturalHeight || 1
      canvas.getContext("2d")?.drawImage(img, 0, 0)
      const logoH = 20
      const logoW = img.naturalWidth ? (img.naturalWidth / img.naturalHeight) * logoH : logoH
      doc.addImage(canvas.toDataURL("image/jpeg"), "JPEG", margin, 10, logoW, logoH)
    } catch (_) {/* kein Logo */}

    // Firmendaten
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(44, 95, 46)
    doc.text("Sabitas", margin, 36)
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(80, 80, 80)
    doc.text("FOTOGRAFIE-EDITIONEN", margin, 41)
    doc.text("9608 Ganterschwil", margin, 46)
    doc.text("Tel: 000 000 00 00", margin, 51)
    doc.text("hallo@sabitas.ch", margin, 56)
    doc.text("MWST-Nr: CHE-112.174.541", margin, 61)

    // Titel Rechnung
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(44, 95, 46)
    doc.text("RECHNUNG · QUITTUNG", pageW - margin, 36, { align: "right" })
    doc.setFontSize(10); doc.setTextColor(100, 100, 100)
    doc.text(`Bestellnummer: ${order.order_number}`, pageW - margin, 43, { align: "right" })
    doc.text(`Rechnungsnummer: #FA${String(order.order_number).padStart(8, '0')}`, pageW - margin, 49, { align: "right" })
    doc.text(`Datum: ${formatDate(order.created_at)}`, pageW - margin, 55, { align: "right" })

    // Trennlinie
    doc.setDrawColor(44, 95, 46); doc.setLineWidth(0.5)
    doc.line(margin, 68, pageW - margin, 68)

    // Kundendaten
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(40, 40, 40)
    doc.text("Lieferadresse:", margin, 76)
    doc.setFont("helvetica", "normal"); doc.setFontSize(10)
    const lines = [
      `${order.customer_first_name} ${order.customer_last_name}`,
      order.customer_address,
      `${order.customer_postal_code} ${order.customer_city}`,
      order.customer_canton,
      order.customer_email,
      order.customer_phone,
    ].filter(Boolean)
    lines.forEach((l, i) => doc.text(l, margin, 83 + i * 5.5))

    // Rechnungsadresse (falls gleich wie Lieferadresse)
    const billingY = 76
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(40, 40, 40)
    doc.text("Rechnungsadresse:", pageW / 2 + 5, billingY)
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(100, 100, 100)
    doc.text("(identisch mit Lieferadresse)", pageW / 2 + 5, billingY + 6)

    // Zahlungsstatus unter Rechnungsadresse (eine Zeile unten, kein Überlappen)
    const payStatusLabel = order.payment_status === "completed" ? "Bezahlt" : order.payment_status === "pending" ? "Ausstehend" : order.payment_status === "failed" ? "Fehlgeschlagen" : order.payment_status
    const payStatusColor: [number, number, number] = order.payment_status === "completed" ? [44, 95, 46] : order.payment_status === "failed" ? [180, 0, 0] : [180, 130, 0]
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...payStatusColor)
    doc.text(`Zahlungsstatus: ${payStatusLabel}`, pageW - margin, billingY + 16, { align: "right" })
    doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal")
    doc.text(`Zahlung: ${order.payment_method}`, pageW - margin, billingY + 22, { align: "right" })
    doc.setTextColor(40, 40, 40)

    // Artikeltabelle
    let y = 118
    const colQty   = 125
    const colPrice = 165
    const colTotal = pageW - margin - 8

    doc.setFillColor(44, 95, 46); doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold"); doc.setFontSize(10)
    doc.rect(margin, y, pageW - margin * 2, 8, "F")
    doc.text("Artikel", margin + 2, y + 5.5)
    doc.text("Menge", colQty, y + 5.5)
    doc.text("Stückpreis", colPrice, y + 5.5, { align: "right" })
    doc.text("Gesamt", colTotal, y + 5.5, { align: "right" })
    y += 10

    doc.setFont("helvetica", "normal"); doc.setTextColor(40, 40, 40)
    const items = order.items || []
    items.forEach((item, idx) => {
      const subtotal = Number(item.subtotal) || 0
      const itemMwst = Math.round(subtotal * 0.081 / 0.05) * 0.05
      const rowH = 18
      if (idx % 2 === 0) { doc.setFillColor(245, 248, 245); doc.rect(margin, y - 2, pageW - margin * 2, rowH, "F") }
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40)
      doc.text(item.product_name.substring(0, 50), margin + 2, y + 4)
      doc.text(`${item.quantity}x`, colQty, y + 4)
      doc.text(`${(Number(item.price) || 0).toFixed(2)} CHF`, colPrice, y + 4, { align: "right" })
      doc.text(`${subtotal.toFixed(2)} CHF`, colTotal, y + 4, { align: "right" })
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130)
      doc.text(`Art.-Nr: ${item.product_id}`, margin + 2, y + 10)
      if (Number(item.product_id) >= 0) {
        doc.text(`Steuersatz: ${itemMwst.toFixed(2)} CHF`, colTotal, y + 10, { align: "right" })
      }
      doc.setTextColor(40, 40, 40)
      y += rowH
    })

    // Totales
    y += 4
    doc.setDrawColor(200, 200, 200); doc.line(margin, y, pageW - margin, y); y += 6
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(40, 40, 40)

    const itemsSubtotal = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
    const onlyGutscheine = items.length > 0 && items.every(i => Number(i.product_id) < 0)
    const shipping = onlyGutscheine ? 0 : (Number(order.shipping_cost) || 0)
    const grossTotal = itemsSubtotal + shipping
    const roundedTotal = onlyGutscheine ? itemsSubtotal : Math.ceil(grossTotal / 0.5) * 0.5

    doc.text("Zwischensumme (Artikel):", pageW - 75, y)
    doc.text(`${itemsSubtotal.toFixed(2)} CHF`, pageW - margin, y, { align: "right" })
    y += 6
    if (!onlyGutscheine) {
      if (shipping > 0) {
        doc.text("Versandkosten:", pageW - 75, y)
        doc.text(`${shipping.toFixed(2)} CHF`, pageW - margin, y, { align: "right" })
        y += 6
      }
    }
    y -= 4
    doc.setDrawColor(44, 95, 46); doc.line(pageW - 75, y, pageW - margin, y); y += 5
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(44, 95, 46)
    doc.text("TOTAL:", pageW - 55, y)
    doc.text(`${roundedTotal.toFixed(2)} CHF`, pageW - margin, y, { align: "right" })
    if (!onlyGutscheine) {
      y += 5
      const mwstIncl = roundedTotal * 0.081 / 1.081
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 100, 100)
      doc.text(`inkl. MwSt. 8.1%: ${mwstIncl.toFixed(2)} CHF`, pageW - margin, y, { align: "right" })
    }

    // Hinweise
    const hinweiseY = y + 2
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80)
    const hinweise = [
      "Armbrust nach Anleitung zusammenbauen.",
      "Nach ca. 10 Schuss alle Schrauben nachziehen. (2-3 mal wiederholen)",
      "Auf keinen Fall Armbrust/Pfeilbogen ohne Pfeil abschiessen.",
      "Kann zu Schäden am Wurfarm führen.",
      "Sehne an allen Reibflächen immer gut einfetten.",
      "Zahlungskonditionen: sofort nach Erhalt – Gesamtbetrag inkl. MwSt",
    ]
    hinweise.forEach((line, i) => doc.text(line, margin, hinweiseY + 5 + i * 5))
    const contentEndY = hinweiseY + 5 + hinweise.length * 5

    // Footer image
    try {
      const footer = new window.Image()
      footer.src = "/images/checkcopia.png"
      await new Promise<void>((res) => { footer.onload = () => res(); footer.onerror = () => res() })
      if (footer.naturalWidth && footer.naturalHeight) {
        const canvas = document.createElement("canvas")
        canvas.width = footer.naturalWidth
        canvas.height = footer.naturalHeight
        canvas.getContext("2d")?.drawImage(footer, 0, 0)
        const pageH = doc.internal.pageSize.getHeight()
        const maxW = pageW - margin * 2
        const maxH = 120
        const ratio = footer.naturalWidth / footer.naturalHeight
        let w = maxW, h = maxW / ratio
        if (h > maxH) { h = maxH; w = maxH * ratio }
        const x = (pageW - w) / 2
        const imgY = pageH - h - 5
        if (contentEndY + 5 > imgY) {
          doc.addPage()
          const newY = (pageH - h) / 2
          doc.addImage(canvas.toDataURL("image/png"), "PNG", x, newY, w, h)
        } else {
          doc.addImage(canvas.toDataURL("image/png"), "PNG", x, imgY, w, h)
        }
      }
    } catch (_) {/* sin footer */}

    doc.save(`Rechnung_${order.order_number}.pdf`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Abgeschlossen"
      case "pending":
        return "Ausstehend"
      case "processing":
        return "In Bearbeitung"
      case "cancelled":
        return "Storniert"
      default:
        return status
    }
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800 border-green-200"
      case "low_stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "out_of_stock":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStockStatusText = (status: string) => {
    switch (status) {
      case "in_stock":
        return "Auf Lager"
      case "low_stock":
        return "Geringer Lagerbestand"
      case "out_of_stock":
        return "Nicht vorrätig"
      default:
        return status
    }
  }

  const getCategoryDisplay = (slug: string) => {
    const cat = categories.find((c) => c.slug === slug)
    return cat ? cat.name : slug || "❓ Keine Kategorie"
  }

  const generateHeatIcons = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Flame key={i} className={`w-4 h-4 ${i < level ? "text-red-500" : "text-gray-300"}`} />
    ))
  }

  const generateStarIcons = (rating: number | string) => {
    const numRating = Number.parseFloat(rating.toString())
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(numRating) ? "text-yellow-500 fill-current" : "text-gray-300"}`}
      />
    ))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (
    (activeTab === "orders" && ordersLoading && orders.length === 0) ||
    (activeTab === "products" && productsLoading && products.length === 0)
  ) {
    return (
      <div className="min-h-screen bg-n-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
              <p className="text-gray-600">Verwaltungspanel wird geladen...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-n-100">
      {/* Header */}
      <div className="bg-white border-b border-n-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-brand hover:text-white transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-n-200" />
              <img src="/sabitas/logo.png" alt="Sabitas" className="h-10 w-auto object-contain" />
              <div>
                <div className="leading-tight">
                  <span className="text-base font-black text-gray-900 tracking-tight">Verwaltungspanel</span>
                </div>
                <p className="text-xs text-gray-400 hidden sm:block">Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === "products" && hasScrolled && (
                <button
                  onClick={() => setShowCategoryFilterModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-bold rounded-full transition-all"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {productFilters.category
                      ? categories.find(c => c.slug === productFilters.category)?.name ?? productFilters.category
                      : "Kategorie"}
                  </span>
                </button>
              )}
       
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto mb-8 -mx-2 px-2 pb-1">
          <TabsList className={`flex w-max lg:grid lg:w-full bg-white border border-n-150 rounded-2xl p-1 shadow-sm gap-1 ${["lg:grid-cols-6","lg:grid-cols-7","lg:grid-cols-8","lg:grid-cols-9","lg:grid-cols-10"][[features.pedidos, features.envios, features.vales, features.cuentas].filter(Boolean).length]}`}>
            {features.pedidos && (
              <TabsTrigger
                value="orders"
                className="flex items-center gap-2 font-semibold shrink-0 bg-blue-50 text-blue-700 data-[state=active]:bg-blue-400 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Bestellungen</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="products"
              className="flex items-center gap-2 font-semibold shrink-0 bg-blue-50 text-blue-700 data-[state=active]:bg-blue-400 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <Package className="w-4 h-4" />
              <span>Produkte</span>
            </TabsTrigger>
            <TabsTrigger
              value="einstellungen"
              className="flex items-center gap-2 font-semibold shrink-0 bg-blue-50 text-blue-700 data-[state=active]:bg-blue-400 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>Zahlung</span>
            </TabsTrigger>
            {features.envios && (
              <TabsTrigger
                value="versand"
                className="flex items-center gap-2 font-semibold shrink-0 bg-blue-50 text-blue-700 data-[state=active]:bg-blue-400 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                <Package className="w-4 h-4" />
                <span>Versand</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="anuncios"
              className="flex items-center gap-2 font-semibold shrink-0 bg-green-50 text-green-700 data-[state=active]:bg-green-400 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <Megaphone className="w-4 h-4" />
              <span>Anzeigen</span>
            </TabsTrigger>
            <TabsTrigger
              value="blog"
              className="flex items-center gap-2 font-semibold shrink-0 bg-green-50 text-green-700 data-[state=active]:bg-green-400 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Blog</span>
            </TabsTrigger>
            <TabsTrigger
              value="gallery"
              className="flex items-center gap-2 font-semibold shrink-0 bg-green-50 text-green-700 data-[state=active]:bg-green-400 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <Images className="w-4 h-4" />
              <span>Galerie</span>
            </TabsTrigger>
            {features.vales && (
              <TabsTrigger
                value="gutscheine"
                className="flex items-center gap-2 font-semibold shrink-0 bg-red-50 text-red-700 data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                <Gift className="w-4 h-4" />
                <span>Gutscheine</span>
              </TabsTrigger>
            )}
            {features.cuentas && (
              <TabsTrigger
                value="kunden"
                className="flex items-center gap-2 font-semibold shrink-0 bg-amber-50 text-amber-700 data-[state=active]:bg-amber-400 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Kunden</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="inhalte"
              className="flex items-center gap-2 font-semibold shrink-0 bg-green-50 text-green-700 data-[state=active]:bg-green-400 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Inhalte</span>
            </TabsTrigger>
          </TabsList>
          </div>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {/* Modern Stats Dashboard */}
            {orderStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* Total Orders */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-blue-100 uppercase tracking-wider">Bestellungen</span>
                    </div>
                    <p className="text-4xl font-black tracking-tight">
                      {Number.parseInt(String(orderStats.total_orders ?? 0)) || 0}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-blue-100 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      <span>Gesamt</span>
                    </div>
                  </div>
                </div>

                {/* Revenue */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Umsatz</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight">
                      {(Number.parseFloat(String(orderStats.total_revenue ?? 0)) || 0).toFixed(2)}
                      <span className="text-base font-semibold text-emerald-200 ml-1">CHF</span>
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Gesamtumsatz</span>
                    </div>
                  </div>
                </div>

                {/* Completed */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-5 text-white shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-violet-100 uppercase tracking-wider">Abgeschlossen</span>
                    </div>
                    <p className="text-4xl font-black tracking-tight">
                      {Number.parseInt(String(orderStats.completed_orders ?? 0)) || 0}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-violet-100 text-xs">
                      <CheckCircle className="w-3 h-3" />
                      <span>Erledigt</span>
                    </div>
                  </div>
                </div>

                {/* Pending */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-amber-100 uppercase tracking-wider">Ausstehend</span>
                    </div>
                    <p className="text-4xl font-black tracking-tight">
                      {Number.parseInt(String(orderStats.pending_orders ?? 0)) || 0}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-amber-100 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>Warten</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Charts Toggle */}
            {orders.length > 0 && (
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => setShowCharts(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl px-4 py-2 bg-white hover:bg-gray-50 transition-all shadow-sm"
                >
                  <span>{showCharts ? "▲" : "▼"}</span>
                  {showCharts ? "Statistiken ausblenden" : "Statistiken anzeigen"}
                </button>
              </div>
            )}

            {/* Charts Section */}
            {orders.length > 0 && showCharts && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {/* Revenue Area Chart */}
                <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Umsatzentwicklung</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Letzte Bestellungen nach Datum</p>
                    </div>
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={orderChartData.dailyData}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E8EBEF", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
                        formatter={(value: number) => [`${value.toFixed(2)} CHF`, "Umsatz"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revenueGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Status & Payment Pie Charts */}
                <div className="flex flex-col gap-5">
                  {/* Status Pie */}
                  <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900 text-sm">Status</h3>
                      <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={orderChartData.statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {orderChartData.statusData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                      {orderChartData.statusData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-[10px] text-gray-500">{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Pie */}
                  <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900 text-sm">Zahlungsarten</h3>
                      <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={orderChartData.paymentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {orderChartData.paymentData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                      {orderChartData.paymentData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-[10px] text-gray-500">{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modern Filters Bar */}
            <div className="mb-6 rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Bestellung suchen... (Name, E-Mail, Nummer)"
                    value={orderFilters.search}
                    onChange={(e) => handleOrderFilterChange("search", e.target.value)}
                    className="pl-10 bg-gray-50/80 border-gray-200 rounded-xl h-10 focus:bg-white transition-colors"
                  />
                </div>

                <Select
                  value={orderFilters.status}
                  onValueChange={(value) => handleOrderFilterChange("status", value)}
                >
                  <SelectTrigger className="w-full md:w-44 bg-gray-50/80 border-gray-200 rounded-xl h-10">
                    <SelectValue placeholder="Alle Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="pending">Ausstehend</SelectItem>
                    <SelectItem value="processing">In Bearbeitung</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                    <SelectItem value="cancelled">Storniert</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-full md:w-52">
                  <Input
                    type="email"
                    placeholder="E-Mail filtern..."
                    value={orderFilters.email}
                    onChange={(e) => handleOrderFilterChange("email", e.target.value)}
                    className="bg-gray-50/80 border-gray-200 rounded-xl h-10 focus:bg-white transition-colors"
                  />
                </div>

                {(orderFilters.search || orderFilters.status !== "all" || orderFilters.email) && (
                  <Button
                    onClick={() => {
                      setOrderFilters({ search: "", status: "all", email: "" })
                    }}
                    variant="ghost"
                    className="rounded-xl text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 h-10 px-3 shrink-0"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Zurücksetzen
                  </Button>
                )}
              </div>
            </div>

            {/* Modern Orders Table */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              {/* Table Header */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_1.2fr_0.8fr_0.6fr_auto] gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bestellung</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kunde</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Zahlung</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Betrag</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aktionen</span>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="group grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_0.8fr_0.6fr_auto] gap-3 sm:gap-4 px-6 py-4 hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-transparent transition-all duration-200 cursor-pointer"
                    onClick={() => showOrderDetail(order)}
                  >
                    {/* Order Info */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        order.status === "completed" ? "bg-emerald-100 text-emerald-600" :
                        order.status === "processing" ? "bg-blue-100 text-blue-600" :
                        order.status === "cancelled" ? "bg-red-100 text-red-600" :
                        "bg-amber-100 text-amber-600"
                      }`}>
                        {order.status === "completed" ? <CheckCircle className="w-5 h-5" /> :
                         order.status === "processing" ? <RefreshCw className="w-5 h-5" /> :
                         order.status === "cancelled" ? <X className="w-5 h-5" /> :
                         <Clock className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{order.order_number}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-gray-600">
                          {(order.customer_first_name?.[0] || "").toUpperCase()}{(order.customer_last_name?.[0] || "").toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{order.customer_first_name} {order.customer_last_name}</p>
                        <p className="text-xs text-gray-400 truncate">{order.customer_email}</p>
                      </div>
                    </div>

                    {/* Payment */}
                    <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      {order.payment_method && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                          (() => {
                            const m = (order.payment_method || "").toLowerCase()
                            if (m.includes("twint")) return "bg-purple-100 text-purple-700"
                            if (m.includes("paypal")) return "bg-blue-100 text-blue-700"
                            if (m.includes("invoice") || m.includes("rechnung")) return "bg-gray-100 text-gray-700"
                            if (m.includes("pickup") || m.includes("abhol")) return "bg-amber-100 text-amber-700"
                            return "bg-indigo-100 text-indigo-700"
                          })()
                        }`}>
                          <CreditCard className="w-3 h-3" />
                          {(() => {
                            const m = (order.payment_method || "").toLowerCase()
                            if (m.includes("twint")) return "TWINT"
                            if (m.includes("paypal")) return "PayPal"
                            if (m === "stripe" || m.includes("stripe_card") || m.includes("card")) return "Karte"
                            if (m.includes("stripe")) return "Karte"
                            if (m.includes("invoice") || m.includes("rechnung")) return "Rechnung"
                            if (m.includes("pickup") || m.includes("abhol")) return "Abholung"
                            return order.payment_method
                          })()}
                        </span>
                      )}
                      {(() => {
                        const m = (order.payment_method || "").toLowerCase()
                        const isInvoice = m.includes("invoice") || m.includes("rechnung") || m.includes("faktura")
                        const isTwint = m.includes("twint")
                        const paid = order.payment_status === "completed"
                        if ((isInvoice || isTwint) && !paid) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                              <Clock className="w-3 h-3" />
                              Offen
                            </span>
                          )
                        }
                        if (paid) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Bezahlt
                            </span>
                          )
                        }
                        return null
                      })()}
                    </div>

                    {/* Amount */}
                    <div className="flex items-center">
                      <p className="text-sm font-bold text-gray-900">{(Number.parseFloat(order.total_amount.toString()) || 0).toFixed(2)} <span className="text-gray-400 font-medium">CHF</span></p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const m = (order.payment_method || "").toLowerCase()
                        const isInvoice = m.includes("invoice") || m.includes("rechnung")
                        const isTwint = m.includes("twint")
                        const notPaid = order.payment_status !== "completed"
                        if ((isInvoice || isTwint) && notPaid) {
                          return (
                            <Button
                              onClick={() => markAsPaid(order)}
                              disabled={markingPaidId === order.id}
                              size="sm"
                              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg px-3 text-xs h-8 shadow-sm shadow-amber-500/20"
                            >
                              {markingPaidId === order.id ? "..." : "Bezahlt"}
                            </Button>
                          )
                        }
                        return null
                      })()}
                      <Button
                        onClick={() => showOrderDetail(order)}
                        size="sm"
                        className="bg-gradient-to-r from-brand to-brand-mid hover:from-brand-dark hover:to-brand text-white rounded-lg px-3 text-xs h-8 shadow-sm shadow-green-500/20"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>
                      <Button
                        onClick={() => downloadInvoicePDF(order)}
                        variant="outline"
                        size="sm"
                        className="rounded-lg px-2.5 text-xs h-8 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-brand hover:border-brand/30"
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1" />
                        PDF
                      </Button>
                      {(() => {
                        const m = (order.payment_method || "").toLowerCase()
                        const isInvoice = m.includes("invoice") || m.includes("rechnung")
                        const isTwint = m.includes("twint")
                        const notPaid = order.payment_status !== "completed"
                        if ((isInvoice || isTwint) && notPaid) return null
                        return (
                          <Button
                            onClick={() => setShipConfirmOrder(order)}
                            disabled={sendingShipId === order.id}
                            variant="outline"
                            size="sm"
                            className="rounded-lg px-2.5 text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Truck className="w-3.5 h-3.5 mr-1" />
                            {sendingShipId === order.id ? "..." : "Versandt"}
                          </Button>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              {orders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">Keine Bestellungen gefunden</p>
                  <p className="text-gray-400 text-sm mt-1">Versuche andere Filteroptionen</p>
                </div>
              )}
            </div>

            {/* Modern Pagination */}
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-sm text-gray-500">
                Seite <span className="font-semibold text-gray-700">{currentOrderPage}</span> von <span className="font-semibold text-gray-700">{totalOrderPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentOrderPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentOrderPage === 1}
                  variant="outline"
                  className="rounded-xl px-4 h-9 border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Zurück
                </Button>
                {Array.from({ length: Math.min(totalOrderPages, 5) }, (_, i) => {
                  let pageNum: number
                  if (totalOrderPages <= 5) {
                    pageNum = i + 1
                  } else if (currentOrderPage <= 3) {
                    pageNum = i + 1
                  } else if (currentOrderPage >= totalOrderPages - 2) {
                    pageNum = totalOrderPages - 4 + i
                  } else {
                    pageNum = currentOrderPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setCurrentOrderPage(pageNum)}
                      variant={pageNum === currentOrderPage ? "default" : "outline"}
                      className={`rounded-xl w-9 h-9 p-0 text-sm ${
                        pageNum === currentOrderPage
                          ? "bg-brand hover:bg-brand-dark text-white shadow-sm"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  onClick={() => setCurrentOrderPage((prev) => Math.min(prev + 1, totalOrderPages))}
                  disabled={currentOrderPage === totalOrderPages}
                  variant="outline"
                  className="rounded-xl px-4 h-9 border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Weiter
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            {/* Modern Product Stats Dashboard */}
            {productStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* Total Products */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-indigo-100 uppercase tracking-wider">Produkte</span>
                    </div>
                    <p className="text-4xl font-black tracking-tight">{productStats.total_products}</p>
                    <div className="flex items-center gap-1 mt-2 text-indigo-100 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      <span>Gesamt</span>
                    </div>
                  </div>
                </div>

                {/* Stock */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <Package2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Lagerbestand</span>
                    </div>
                    <p className="text-4xl font-black tracking-tight">{productStats.total_stock}</p>
                    <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs">
                      <CheckCircle className="w-3 h-3" />
                      <span>Einheiten</span>
                    </div>
                  </div>
                </div>

                {/* Low Stock */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-amber-100 uppercase tracking-wider">Wenig Lager</span>
                    </div>
                    <p className="text-4xl font-black tracking-tight">{productStats.low_stock}</p>
                    <div className="flex items-center gap-1 mt-2 text-amber-100 text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Nachbestellen</span>
                    </div>
                  </div>
                </div>

                {/* Out of Stock */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-5 text-white shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <X className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-rose-100 uppercase tracking-wider">Ausverkauft</span>
                    </div>
                    <p className="text-4xl font-black tracking-tight">{productStats.out_of_stock}</p>
                    <div className="flex items-center gap-1 mt-2 text-rose-100 text-xs">
                      <X className="w-3 h-3" />
                      <span>Nicht verfügbar</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Products Header Actions */}
            <div className="mb-6">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Kategorieverwaltung</h2>
              <p className="text-xs text-gray-400 mt-0.5 mb-3">Kategorien verwalten</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Botón 1: crear Hauptkategorie (nivel superior, sin padre) */}
                <button
                  onClick={() => { setEditingCategory(null); setForceHaupt(true); setCatIsHaupt(true); setCatCreateKind(null); setIsCategoryModalOpen(true) }}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 p-5 text-left shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="relative">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white font-bold text-base leading-tight">Neue Hauptkategorie</p>
                    <p className="text-blue-100 text-xs mt-1">Oberste Ebene erstellen</p>
                  </div>
                </button>
                {/* Botón 2: crear Kategorie (padre = una Hauptkategorie) */}
                <button
                  onClick={() => { setEditingCategory(null); setForceHaupt(false); setCatIsHaupt(false); setCatCreateKind("kategorie"); setIsCategoryModalOpen(true) }}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-sky-400 hover:from-sky-600 hover:to-sky-500 p-5 text-left shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-200"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="relative">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white font-bold text-base leading-tight">Kategorie erstellen</p>
                    <p className="text-sky-50 text-xs mt-1">In eine Hauptkategorie</p>
                  </div>
                </button>
                {/* Botón 3: crear Subkategorie (padre = una Kategorie) */}
                <button
                  onClick={() => { setEditingCategory(null); setForceHaupt(false); setCatIsHaupt(false); setCatCreateKind("subkategorie"); setIsCategoryModalOpen(true) }}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-400 hover:from-teal-600 hover:to-teal-500 p-5 text-left shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-200"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="relative">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white font-bold text-base leading-tight">Subkategorie erstellen</p>
                    <p className="text-teal-50 text-xs mt-1">In eine Kategorie</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Categories List */}
            {(() => {
              const SUB_COLORS = [
                { bg: "bg-purple-100", dot: "bg-purple-500", border: "border-purple-300 hover:border-purple-400", icon: "from-purple-500 to-purple-400 shadow-purple-300/20", label: "text-purple-600", activeBtn: "bg-purple-600 text-white", ring: "border-purple-400 ring-2 ring-purple-200", header: "text-purple-400" },
                { bg: "bg-emerald-100", dot: "bg-emerald-500", border: "border-emerald-300 hover:border-emerald-400", icon: "from-emerald-500 to-emerald-400 shadow-emerald-300/20", label: "text-emerald-600", activeBtn: "bg-emerald-600 text-white", ring: "border-emerald-400 ring-2 ring-emerald-200", header: "text-emerald-400" },
                { bg: "bg-orange-100", dot: "bg-orange-500", border: "border-orange-300 hover:border-orange-400", icon: "from-orange-500 to-orange-400 shadow-orange-300/20", label: "text-orange-600", activeBtn: "bg-orange-600 text-white", ring: "border-orange-400 ring-2 ring-orange-200", header: "text-orange-400" },
                { bg: "bg-pink-100", dot: "bg-pink-500", border: "border-pink-300 hover:border-pink-400", icon: "from-pink-500 to-pink-400 shadow-pink-300/20", label: "text-pink-600", activeBtn: "bg-pink-600 text-white", ring: "border-pink-400 ring-2 ring-pink-200", header: "text-pink-400" },
                { bg: "bg-teal-100", dot: "bg-teal-500", border: "border-teal-300 hover:border-teal-400", icon: "from-teal-500 to-teal-400 shadow-teal-300/20", label: "text-teal-600", activeBtn: "bg-teal-600 text-white", ring: "border-teal-400 ring-2 ring-teal-200", header: "text-teal-400" },
                { bg: "bg-amber-100", dot: "bg-amber-500", border: "border-amber-300 hover:border-amber-400", icon: "from-amber-500 to-amber-400 shadow-amber-300/20", label: "text-amber-600", activeBtn: "bg-amber-600 text-white", ring: "border-amber-400 ring-2 ring-amber-200", header: "text-amber-400" },
                { bg: "bg-red-100", dot: "bg-red-500", border: "border-red-300 hover:border-red-400", icon: "from-red-500 to-red-400 shadow-red-300/20", label: "text-red-600", activeBtn: "bg-red-600 text-white", ring: "border-red-400 ring-2 ring-red-200", header: "text-red-400" },
                { bg: "bg-indigo-100", dot: "bg-indigo-500", border: "border-indigo-300 hover:border-indigo-400", icon: "from-indigo-500 to-indigo-400 shadow-indigo-300/20", label: "text-indigo-600", activeBtn: "bg-indigo-600 text-white", ring: "border-indigo-400 ring-2 ring-indigo-200", header: "text-indigo-400" },
              ]
              // Hauptkategorie = marcada con is_haupt · Kategorie = cuelga de nada o de una Haupt · Subkategorie = cuelga de una Kategorie
              const haupts = categories.filter(c => c.is_haupt)
              const isHauptId = (id: number | null) => id != null && haupts.some(h => h.id === id)
              const kats = categories.filter(c => !c.is_haupt && (c.parent_id === null || isHauptId(c.parent_id)))
              const subs = categories.filter(c => !c.is_haupt && c.parent_id != null && !isHauptId(c.parent_id))
              const renderGroup = (parent: Category, kids: Category[], cs: typeof SUB_COLORS[0]) => (
                <div key={parent.id}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />
                    <h4 className={`text-sm font-bold ${cs.label}`}>{parent.name}</h4>
                    <span className="text-[11px] text-gray-400 font-medium">{kids.length} Kat.</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {kids.map(cat => renderCatCard(cat, cs, true))}
                  </div>
                </div>
              )
              const renderCatCard = (cat: Category, cs?: typeof SUB_COLORS[0], hideParent = false) => {
                const productCount = products.filter((p) => p.category === cat.slug).length
                // Una Hauptkategorie contiene categorías, no productos: contar categorías asignadas
                const assignedCats = cat.is_haupt ? categories.filter(c => c.parent_id === cat.id).length : 0
                const parentCat = cat.parent_id != null ? categories.find(c => c.id === cat.parent_id) : null
                const parentName = parentCat?.name ?? null
                // Subkategorie = cuelga de una Kategorie (padre que NO es Haupt). Solo estas muestran "Ansehen".
                const isSub = !cat.is_haupt && !!parentCat && !parentCat.is_haupt
                const isSelected = productFilters.category === cat.slug
                return (
                  <div key={cat.slug} className={`flex flex-col rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden bg-white ${isSelected ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-100 hover:border-gray-200"}`}>
                    <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${cat.image ? "bg-gray-100" : `bg-gradient-to-br ${cat.parent_id ? (cs?.icon ?? "from-blue-400 to-blue-300 shadow-blue-300/20") : "from-blue-600 to-blue-500 shadow-blue-500/20"}`}`}>
                        {cat.image ? <img src={cat.image} alt="" className="w-full h-full object-cover" /> : <Flame className="w-4 h-4 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-sm truncate">{cat.name}</p>
                        {parentName && !hideParent && <p className={`text-xs font-bold truncate ${cs?.label ?? "text-blue-500"}`}>↳ {parentName}</p>}
                        <p className="text-[11px] text-gray-400 font-medium">{cat.is_haupt ? `${assignedCats} Kategorie${assignedCats !== 1 ? "n" : ""}` : `${productCount} Produkt${productCount !== 1 ? "e" : ""}`}</p>
                      </div>
                    </div>
                    <div className="flex border-t border-gray-100 mt-1">
                      {isSub && (
                        <>
                          <button
                            onClick={() => {
                              const isActive = productFilters.category === cat.slug
                              setProductFilters(prev => ({ ...prev, category: isActive ? "" : cat.slug }))
                              if (!isActive) setTimeout(() => productsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
                            }}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold transition-colors ${isSelected ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-50"}`}
                          >
                            <Eye className="w-3 h-3" />
                            Ansehen
                          </button>
                          <div className="w-px bg-gray-100" />
                        </>
                      )}
                      <button
                        onClick={() => { setEditingCategory(cat); setForceHaupt(false); setCatIsHaupt(!!cat.is_haupt); setCatCreateKind(null); setIsCategoryModalOpen(true) }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-green-700 hover:bg-green-50 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        Bearbeiten
                      </button>
                      <div className="w-px bg-gray-100" />
                      <button
                        onClick={() => setCategoryToDelete(cat)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold transition-colors text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Löschen
                      </button>
                    </div>
                  </div>
                )
              }
              return (
                <>
                  {/* NIVEL 1 — Hauptkategorien (solo las marcadas con is_haupt) */}
                  {haupts.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/20">
                        <Flame className="w-6 h-6 text-white shrink-0" />
                        <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">Hauptkategorien</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {haupts.map((cat, i) => renderCatCard(cat, SUB_COLORS[i % SUB_COLORS.length]))}
                      </div>
                    </div>
                  )}
                  {/* NIVEL 2 — Kategorien (agrupadas bajo su Hauptkategorie; las sueltas aparte) */}
                  {kats.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-md shadow-emerald-500/20">
                        <span className="w-3 h-3 rounded-full bg-white shrink-0" />
                        <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">Kategorien</h3>
                      </div>
                      <div className="space-y-6">
                        {haupts.map((parent, i) => {
                          const kids = kats.filter(c => c.parent_id === parent.id)
                          if (kids.length === 0) return null
                          return renderGroup(parent, kids, SUB_COLORS[i % SUB_COLORS.length])
                        })}
                        {(() => {
                          const loose = kats.filter(c => c.parent_id === null)
                          if (loose.length === 0) return null
                          const grid = (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {loose.map((cat, i) => renderCatCard(cat, SUB_COLORS[i % SUB_COLORS.length]))}
                            </div>
                          )
                          // Sin ninguna Haupt aún: lista plana sin encabezado de grupo
                          if (haupts.length === 0) return grid
                          return (
                            <div>
                              <div className="flex items-center gap-2 mb-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                <h4 className="text-sm font-bold text-gray-500">Ohne Hauptkategorie</h4>
                                <span className="text-[11px] text-gray-400 font-medium">{loose.length} Kat.</span>
                              </div>
                              {grid}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                  {/* NIVEL 3 — Subkategorien (agrupadas bajo su Kategorie) */}
                  {subs.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 shadow-md shadow-amber-500/20">
                        <span className="w-3 h-3 rounded-full bg-white shrink-0" />
                        <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">Subkategorien</h3>
                      </div>
                      <div className="space-y-6">
                        {kats.map((parent, i) => {
                          const kids = subs.filter(c => c.parent_id === parent.id)
                          if (kids.length === 0) return null
                          return renderGroup(parent, kids, SUB_COLORS[i % SUB_COLORS.length])
                        })}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            <div className="mb-4">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Produkte hinzufügen</h2>
              <p className="text-xs text-gray-400 mt-0.5 mb-4">Produkte verwalten</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Banner: Neues Produkt */}
                <button
                  onClick={showAddProductModal}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-mid hover:from-brand-dark hover:to-brand p-5 text-left shadow-md shadow-green-500/20 hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
                  <div className="relative">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white font-bold text-base leading-tight">Neues Produkt</p>
                    <p className="text-green-100 text-xs mt-1">Produkt manuell erstellen</p>
                  </div>
                </button>

                {/* Excel-Import und Hersteller verwalten ausgeblendet */}
              </div>
            </div>

            {/* Excel Import */}
            {showExcelImport && <Card className="mb-6 border-0 bg-gradient-to-br from-emerald-700 to-emerald-600 rounded-2xl shadow-md shadow-emerald-500/20">
                  <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-base">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-2">
                    <FileSpreadsheet className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white">Excel-Import</span>
                </CardTitle>
                <p className="text-xs text-emerald-100 mt-1">Neue Kategorien &amp; Produkte hinzufügen, ohne bestehende zu löschen.</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex-1 min-w-[220px] cursor-pointer">
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 transition-colors">
                      <Upload className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="text-sm text-gray-600 truncate">
                        {addFile ? addFile?.name : ".xlsx / .xls auswählen"}
                      </span>
                    </div>
                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { setAddFile(e.target.files?.[0] ?? null); setAddResult(null) }} />
                  </label>
                  <Button onClick={handleExcelAdd} disabled={!addFile || addLoading} className="bg-white hover:bg-emerald-50 text-emerald-700 font-bold">
                    <Upload className={`w-4 h-4 mr-2 ${addLoading ? "animate-bounce" : ""}`} />
                    {addLoading ? "Lädt hoch..." : "Hinzufügen"}
                  </Button>
                </div>
                {addResult && (
                  <div className={`mt-4 rounded-lg p-3 text-sm ${addResult?.success ? "bg-blue-50 border border-blue-200" : "bg-red-50 border border-red-200"}`}>
                    {addResult?.success ? (
                      <div className="space-y-1">
                        <p className="font-medium text-blue-800">Abgeschlossen ({addResult?.parsed} verarbeitet)</p>
                        <div className="flex gap-4 text-blue-700 flex-wrap">
                          <span>✅ Neu: <strong>{addResult?.inserted}</strong></span>
                          <span>🔄 Aktualisiert: <strong>{addResult?.updated}</strong></span>
                          <span>⏭ Übersprungen: <strong>{addResult?.skipped}</strong></span>
                          <span className="text-green-700">🛡 Gelöscht: <strong>0</strong></span>
                        </div>
                        {(addResult?.errors?.length ?? 0) > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-yellow-700 font-medium">{addResult?.errors?.length} Warnungen anzeigen</summary>
                            <ul className="mt-1 space-y-0.5 text-yellow-700 text-xs">
                              {addResult?.errors?.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          </details>
                        )}
                      </div>
                    ) : (
                      <p className="text-red-700 font-medium">Fehler: {addResult?.error}</p>
                    )}
                  </div>
                )}
    
              </CardContent>
            
            </Card>}

      
            {/* Products Filters */}
            <div className="mb-3">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Produkte suchen</h2>
              <p className="text-xs text-gray-400 mt-0.5">Produkte filtern und suchen</p>
            </div>
            <div ref={filterCardRef}>
            <div className="mb-4 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              {/* Search bar */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Produkte suchen..."
                    value={productFilters.search}
                    onChange={(e) => setProductFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="pl-10 bg-gray-50 border-0 rounded-xl h-10 focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all text-sm"
                  />
                  {productFilters.search && (
                    <button onClick={() => setProductFilters(prev => ({ ...prev, search: "" }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category chips row */}
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Kategorie:</span>
                {categories
                  // Ocultar el chip de categorías con 0 productos (mismo conteo que en KATEGORIEN).
                  .filter(c => products.some(p => p.category === c.slug))
                  .map(c => ({ value: c.slug, label: c.name })).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setProductFilters(prev => ({ ...prev, category: opt.value }))}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      (productFilters.category || "") === opt.value
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Stock row */}
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Status:</span>
                {[
                  { value: "", label: "Alle", icon: null },
                  { value: "in_stock", label: "Lager", icon: <CheckCircle className="w-3.5 h-3.5" />, active: "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/20" },
                  { value: "low_stock", label: "Wenig", icon: <AlertTriangle className="w-3.5 h-3.5" />, active: "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/20" },
                  { value: "out_of_stock", label: "Leer", icon: <XCircle className="w-3.5 h-3.5" />, active: "bg-red-500 border-red-500 text-white shadow-sm shadow-red-500/20" },
                ].map(opt => (
                  <button
                    key={opt.value || "all-stock"}
                    onClick={() => setProductFilters(prev => ({ ...prev, stock_status: opt.value }))}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      (productFilters.stock_status || "") === opt.value
                        ? (opt.active ?? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20")
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Sort + Reset row */}
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Sortieren:</span>
                <Select value={productFilters.sortBy} onValueChange={(value) => setProductFilters((prev) => ({ ...prev, sortBy: value }))}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 bg-gray-50 rounded-full px-4 w-40 gap-1 font-semibold text-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="price">Preis</SelectItem>
                    <SelectItem value="stock">Lagerbestand</SelectItem>
                    <SelectItem value="rating">Bewertung</SelectItem>
                    <SelectItem value="heat_level">Schärfegrad</SelectItem>
                    <SelectItem value="category">Kategorie</SelectItem>
                    <SelectItem value="created_at">Datum</SelectItem>
                  </SelectContent>
                </Select>

                {(productFilters.search || productFilters.category || productFilters.stock_status) && (
                  <button
                    onClick={() => setProductFilters({ search: "", category: "", stock_status: "", sortBy: "name" })}
                    className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>
            </div>{/* end filterCardRef wrapper */}

            <div ref={statusSectionRef} />

            {/* Bulk action bar — sticky, solo visible con selección */}
            {selectedProductIds.size > 0 && (
              <div className="sticky top-16 z-20 mb-4">
                <div className="bg-gradient-to-r from-brand to-brand-mid rounded-2xl px-4 py-3 shadow-lg shadow-green-500/20 flex flex-wrap items-center gap-3">
                  <div className="mr-2">
                    <p className="text-white font-bold text-sm leading-tight">Produktstatus ändern</p>
                    <p className="text-green-100 text-xs">{selectedProductIds.size} Produkt{selectedProductIds.size !== 1 ? "e" : ""} ausgewählt</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-sm bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    {selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0 ? "Alle abwählen" : "Alle auswählen"}
                  </Button>
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="w-44 bg-white border-0 text-sm rounded-xl h-8">
                      <SelectValue placeholder="Status ändern..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="in_stock">Auf Lager</SelectItem>
                      <SelectItem value="low_stock">Geringer Bestand</SelectItem>
                      <SelectItem value="out_of_stock">Nicht vorrätig</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleBulkStatusUpdate}
                    disabled={!bulkStatus || bulkLoading}
                    className="bg-white text-brand hover:bg-green-50 font-semibold"
                  >
                    {bulkLoading ? "Speichern..." : "Anwenden"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedProductIds(new Set())}
                    className="text-white hover:bg-white/20 ml-auto"
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            <div className="mb-3">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Produkte</h2>
              <p className="text-xs text-gray-400 mt-0.5">Alle Motive im Überblick</p>
            </div>

            {/* Products Grid — 5 columns compact */}
            <div ref={productsGridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.slice(productsPage * PRODS_PER_PAGE, (productsPage + 1) * PRODS_PER_PAGE).map((product) => (
                <div
                  key={product.id}
                  className={`group relative rounded-xl bg-white border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden ${
                    selectedProductIds.has(product.id) ? "ring-2 ring-brand border-brand" : "border-gray-100 hover:border-gray-200"
                  }`}
                  onClick={() => toggleProductSelection(product.id)}
                >
                  {/* Selection checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        selectedProductIds.has(product.id)
                          ? "bg-brand border-brand"
                          : "border-gray-300 bg-white/80 backdrop-blur-sm"
                      }`}
                    >
                      {selectedProductIds.has(product.id) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Product Image */}
                  <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    <ProductImage
                      src={product.image_url}
                      candidates={(product as any).image_url_candidates}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Stock dot */}
                    <div className="absolute top-2 right-2">
                      <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${
                        product.stock_status === "in_stock" ? "bg-emerald-500" :
                        product.stock_status === "low_stock" ? "bg-amber-500" :
                        "bg-red-500"
                      }`} title={getStockStatusText(product.stock_status)} />
                    </div>
                  </div>

                  {/* Product Info — compact */}
                  <div className="p-3">
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-1 mb-0.5">{product.name}</h3>
                    <p className="text-[10px] text-gray-400 font-mono mb-1">{product.article_number || "—"}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-base text-gray-900">
                        {Number.parseFloat(product.price.toString()).toFixed(2)} <span className="text-gray-400 font-medium text-xs">CHF</span>
                      </span>
                      <span className="text-xs text-gray-400 font-medium">{product.stock} Stk.</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600">{getCategoryDisplay(product.category)}</span>
                      {product.badge && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600">{product.badge}</span>
                      )}
                    </div>
                  </div>

                  {/* Fixed footer buttons */}
                  <div className="flex border-t border-gray-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); showEditProductModal(product.id) }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 transition-colors rounded-bl-xl"
                    >
                      <Edit className="w-3 h-3" />
                      Bearbeiten
                    </button>
                    <div className="w-px bg-gray-100" />
                    <button
                      onClick={(e) => { e.stopPropagation(); showDeleteProductModal(product.id, product.name) }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors rounded-br-xl"
                    >
                      <Trash2 className="w-3 h-3" />
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {filteredProducts.length > PRODS_PER_PAGE && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => { setProductsPage(p => p - 1); productsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }}
                  disabled={productsPage === 0}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 bg-white text-gray-500 hover:bg-brand hover:text-white hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.ceil(filteredProducts.length / PRODS_PER_PAGE) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => { setProductsPage(i); productsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                      i === productsPage
                        ? "bg-brand text-white shadow-md"
                        : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => { setProductsPage(p => p + 1); productsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }}
                  disabled={productsPage === Math.ceil(filteredProducts.length / PRODS_PER_PAGE) - 1}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 bg-white text-gray-500 hover:bg-brand hover:text-white hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">Keine Produkte gefunden</p>
                <p className="text-gray-400 text-sm mt-1">Versuche andere Filteroptionen</p>
              </div>
            )}
          </TabsContent>

          {/* ── Blog Tab ── */}
          <TabsContent value="blog">
            {/* Blog Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Blog</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{blogPosts.length} Beiträge</p>
                </div>
              </div>
              <Button onClick={() => openBlogModal()} className="bg-gradient-to-r from-brand to-brand-mid hover:from-brand-dark hover:to-brand text-white gap-2 rounded-xl shadow-sm shadow-green-500/20">
                <Plus className="w-4 h-4" /> Neuer Beitrag
              </Button>
            </div>

            {blogLoading && (
              <div className="space-y-4">
                {[0,1,2].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            )}

            {!blogLoading && blogPosts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-orange-300" />
                </div>
                <p className="text-gray-500 font-medium">Noch keine Beiträge</p>
                <p className="text-gray-400 text-sm mt-1">Erstelle den ersten Blogbeitrag!</p>
              </div>
            )}

            <div className="space-y-4">
              {blogPosts.map(post => (
                <div key={post.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-0 hover:shadow-md hover:border-gray-200 transition-all duration-300">
                  {post.hero_image_url && (
                    <div className="w-32 sm:w-44 flex-shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                      <img src={post.hero_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-orange-500">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(post.created_at).toLocaleDateString("de-CH")}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 truncate text-base">{post.title}</h3>
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1.5 leading-relaxed">{post.content}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => openBlogModal(post)} className="gap-1.5 rounded-lg text-xs h-8 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200">
                        <Edit className="w-3.5 h-3.5" /> Bearbeiten
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteBlogId(post.id)} className="gap-1.5 rounded-lg text-xs h-8 border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200">
                        <Trash2 className="w-3.5 h-3.5" /> Löschen
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Gallery Tab ── */}
          <TabsContent value="gallery">
            {/* Gallery Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20">
                  <Images className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Galerie</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{galleryImages.length} Bilder</p>
                </div>
              </div>
              <Button onClick={openGalleryModal} className="bg-gradient-to-r from-brand to-brand-mid hover:from-brand-dark hover:to-brand text-white gap-2 rounded-xl shadow-sm shadow-green-500/20">
                <Plus className="w-4 h-4" /> Bild hochladen
              </Button>
            </div>

            {galleryLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {[0,1,2,3].map(i => <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            )}

            {!galleryLoading && galleryImages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mb-4">
                  <Images className="w-8 h-8 text-pink-300" />
                </div>
                <p className="text-gray-500 font-medium">Noch keine Bilder</p>
                <p className="text-gray-400 text-sm mt-1">Lade das erste Bild hoch!</p>
              </div>
            )}

            {!galleryLoading && galleryImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {galleryImages.map(img => (
                  <div key={img.id} className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                    <div className="aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                      <img src={img.image_url} alt={img.title ?? ""} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <Button size="sm" variant="outline" onClick={() => setDeleteGalleryId(img.id)} className="w-full gap-1.5 rounded-lg text-xs h-8 bg-white/90 backdrop-blur-sm border-red-200 text-red-500 hover:bg-red-50 shadow-md">
                        <Trash2 className="w-3.5 h-3.5" /> Löschen
                      </Button>
                    </div>
                    {/* Info bar */}
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        {img.title ? (
                          <p className="text-xs font-semibold text-gray-700 truncate">{img.title}</p>
                        ) : (
                          <span />
                        )}
                        <span className="text-[10px] text-gray-400 font-medium shrink-0 ml-2">
                          {new Date(img.created_at).toLocaleDateString("de-CH")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Gutscheine Tab ── */}
          <TabsContent value="gutscheine">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-n-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-red-500" /> Geschenkgutscheine
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">Verkäufe und Vorlagen verwalten</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { loadGiftCards(); loadGiftCardPurchases() }} variant="outline" size="sm" className="rounded-xl">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Aktualisieren
                </Button>
              </div>
            </div>

            {!gcEnabled ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
                <RefreshCw className="w-10 h-10 animate-spin opacity-40" />
                <p className="text-base font-semibold">Roberto arbeitet an dieser Funktion</p>
              </div>
            ) : <>

            {/* Crear / Editar Gutschein modal */}
            {gcFormOpen && (
              <Card className="mb-6 border border-red-200 bg-red-50/30 rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="w-4 h-4 text-red-500" />
                    {gcEditItem ? "Gutschein bearbeiten" : "Neuen Gutschein erstellen"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGcFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Name *</label>
                        <input
                          required
                          value={gcFormData.name}
                          onChange={e => setGcFormData(p => ({ ...p, name: e.target.value }))}
                          placeholder="z.B. Gutschein CHF 50"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Betrag (CHF) *</label>
                        <input
                          required type="number" min="1" step="0.01"
                          value={gcFormData.amount}
                          onChange={e => setGcFormData(p => ({ ...p, amount: e.target.value }))}
                          placeholder="50.00"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Beschreibung</label>
                        <textarea
                          value={gcFormData.description}
                          onChange={e => setGcFormData(p => ({ ...p, description: e.target.value }))}
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Status</label>
                        <select
                          value={gcFormData.is_active}
                          onChange={e => setGcFormData(p => ({ ...p, is_active: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="1">Aktiv</option>
                          <option value="0">Inaktiv</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button type="submit" className="bg-brand hover:bg-brand-dark text-white rounded-xl flex-1">
                        {gcEditItem ? "Speichern" : "Erstellen"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setGcFormOpen(false); setGcEditItem(null) }} className="rounded-xl">
                        Abbrechen
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Plantillas existentes */}
            <Card className="mb-6 rounded-2xl border border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-700">Gutschein-Vorlagen</CardTitle>
              </CardHeader>
              <CardContent>
                {gcLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                ) : giftCards.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Keine Vorlagen vorhanden</p>
                ) : (
                  <div className="space-y-2">
                    {giftCards.map(gc => (
                      <div key={gc.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${gc.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{gc.name}</p>
                            {gc.description && <p className="text-xs text-gray-400">{gc.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ventas / Purchases */}
            <Card className="rounded-2xl border border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Verkäufe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gcPurchasesLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                ) : giftCardPurchases.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Noch keine Verkäufe</p>
                ) : (
                  <div className="space-y-2">
                    {giftCardPurchases.map(p => (
                      <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        {/* Info */}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{p.buyer_name || "—"}</p>
                          <p className="text-xs text-gray-400 truncate">{p.buyer_email || "—"} · {p.created_at?.slice(0,10)}</p>
                          {(() => { const o = orders.find(o => o.id === p.order_id); return o ? <p className="text-xs text-gray-400 mt-0.5">Gutschein Code: <span className="font-mono font-bold text-gray-800">{o.order_number}</span></p> : null })()}
                          {(p.status === "aktiv" || p.status === "used") ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 mt-1">
                              <CheckCircle className="w-3 h-3" /> Aktiv
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 ring-1 ring-red-200 mt-1">
                              <Clock className="w-3 h-3" /> Inaktiv
                            </span>
                          )}
                        </div>
                        {/* Betrag */}
                        <span className="text-sm font-black text-n-900 shrink-0">
                          CHF {Number(p.amount).toFixed(2)}
                        </span>
                        {/* Status chip */}
                        {p.status === "aktiv" || p.status === "used" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 shrink-0">
                            <CheckCircle className="w-3 h-3" /> Bezahlt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-200 shrink-0">
                            <Clock className="w-3 h-3" /> Offen
                          </span>
                        )}
                        {/* Acción */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.status === "offen" && (
                            <Button
                              onClick={() => handleMarkGcPaid(p)}
                              disabled={markingGcPaidId === p.id}
                              size="sm"
                              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg px-3 text-xs h-8"
                            >
                              {markingGcPaidId === p.id ? "..." : "Bezahlt"}
                            </Button>
                          )}
                          <Button
                            onClick={() => { if (window.confirm("Diesen Gutschein-Kauf wirklich löschen?")) handleDeleteGcPurchase(p) }}
                            disabled={deletingGcId === p.id}
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-500 hover:bg-red-50 rounded-lg px-2 text-xs h-8"
                          >
                            {deletingGcId === p.id ? "..." : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </>}
          </TabsContent>

          {/* ── Versand Tab ── */}
          <TabsContent value="versand">
            {/* Versand Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Versandkosten</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Preise in CHF nach Zone und Gewicht</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {shippingSavedMsg && (
                  <span className="text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-lg">{shippingSavedMsg}</span>
                )}
                <Button
                  onClick={saveShippingSettings}
                  disabled={isSavingShipping}
                  className="bg-gradient-to-r from-brand to-brand-mid hover:from-brand-dark hover:to-brand text-white gap-2 rounded-xl shadow-sm shadow-green-500/20"
                >
                  {isSavingShipping ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </div>

            {shippingLoading && (
              <div className="space-y-4">
                {[0,1].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            )}

            {!shippingLoading && shippingZones.filter(zone => zone.countries.split(",").includes("CH")).map((zone, i) => (
              <div key={zone.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-5 overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50/80 to-transparent border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${zone.enabled ? "bg-blue-100" : "bg-gray-100"}`}>
                      <Truck className={`w-4 h-4 ${zone.enabled ? "text-blue-500" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">{zone.name}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        {zone.countries === "*" ? "Alle anderen Länder" : zone.countries.split(",").map(c => c.trim()).join(" · ")}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShippingZones(prev => prev.map((z, j) => j === i ? { ...z, enabled: !z.enabled } : z))}
                    className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                      zone.enabled
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {zone.enabled ? "Aktiv" : "Deaktiviert"}
                  </button>
                </div>

                {zone.enabled && (
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {shippingRanges.map(range => (
                        <div key={range.id} className="group bg-gray-50/60 rounded-xl p-3 border border-gray-100">
                          <label className="text-xs text-gray-500 font-semibold block mb-2 leading-snug">
                            {range.label}{range.label.includes("Sperrgut") ? " / bis 30kg" : ""}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={getRate(zone.id, range.id) || ""}
                              placeholder="0"
                              onChange={e => setRate(zone.id, range.id, parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                            />
                            <span className="text-xs text-gray-400 font-medium shrink-0">CHF</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* ── Einstellungen / Zahlung Tab ── */}
          <TabsContent value="einstellungen">
            {/* Zahlung Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Zahlungsmethoden</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{features.caja ? "Aktiviere und konfiguriere die verfügbaren Zahlungsoptionen" : "Vorbereitet für später – heute läuft alles über WhatsApp"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {paySavedMsg && (
                  <span className="text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-lg">{paySavedMsg}</span>
                )}
                <Button
                  onClick={savePaymentSettings}
                  disabled={isSavingPay || !features.caja}
                  className="bg-gradient-to-r from-brand to-brand-mid hover:from-brand-dark hover:to-brand text-white gap-2 rounded-xl shadow-sm shadow-green-500/20"
                >
                  {isSavingPay ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </div>

            {/* Los metodos se enseñan a proposito aunque esten apagados: asi ella
                ve que la tienda ya los trae y solo falta encenderlos. Ver
                lib/features.ts. */}
            {!features.caja && (
              <div className="max-w-2xl mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">Gehört zu Paket {PAQUETE + 1}</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Bestellungen laufen aktuell über WhatsApp. Die Zahlungsarten sind
                      bereits eingebaut und können jederzeit freigeschaltet werden –
                      heute sind sie nur zum Anschauen da.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {payLoading && (
              <div className="space-y-4 max-w-2xl">
                {[0,1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            )}

            {!payLoading && (
              <div className={`space-y-5 max-w-2xl ${!features.caja ? "opacity-55 pointer-events-none select-none" : ""}`}>

                {/* Rechnung */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50/80 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <Landmark className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Rechnung</p>
                        <p className="text-xs text-gray-400">Zahlung per Banküberweisung</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaySettings(p => ({ ...p, enable_invoice: !p.enable_invoice }))}
                      className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                        paySettings.enable_invoice ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {paySettings.enable_invoice ? "Aktiv" : "Deaktiviert"}
                    </button>
                  </div>
                  {paySettings.enable_invoice && (
                    <div className="px-6 pb-5 pt-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <Label className="text-xs text-gray-400 font-medium">IBAN</Label>
                          <Input value={paySettings.bank_iban} onChange={e => setPaySettings(p => ({ ...p, bank_iban: e.target.value }))} placeholder="CH00 0000 0000 0000 0000 0" className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-gray-400 font-medium">Kontoinhaber</Label>
                            <Input value={paySettings.bank_holder} onChange={e => setPaySettings(p => ({ ...p, bank_holder: e.target.value }))} placeholder="Max Mustermann" className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-400 font-medium">Bank</Label>
                            <Input value={paySettings.bank_name} onChange={e => setPaySettings(p => ({ ...p, bank_name: e.target.value }))} placeholder="PostFinance" className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* PayPal */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50/40 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden">
                        <img src="/0014294_paypal-express-payment-plugin.png" alt="PayPal" className="w-8 h-8 object-contain" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">PayPal</p>
                        <p className="text-xs text-gray-400">Zahlung via PayPal</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaySettings(p => ({ ...p, enable_paypal: !p.enable_paypal }))}
                      className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                        paySettings.enable_paypal ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {paySettings.enable_paypal ? "Aktiv" : "Deaktiviert"}
                    </button>
                  </div>
                  {paySettings.enable_paypal && (
                    <div className="px-6 pb-5 pt-3">
                      <Label className="text-xs text-gray-400 font-medium">PayPal E-Mail</Label>
                      <Input value={paySettings.paypal_email} onChange={e => setPaySettings(p => ({ ...p, paypal_email: e.target.value }))} placeholder="paypal@beispiel.ch" className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                    </div>
                  )}
                </div>

                {/* Stripe */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50/40 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center gap-0.5 px-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 471" width="18" height="12">
                          <rect width="750" height="471" rx="40" fill="#fff" stroke="#DEDEDA" strokeWidth="20"/>
                          <path d="M278 333L313 141h56L334 333z" fill="#00579F"/>
                          <path d="M524 146c-11-4-28-9-50-9-55 0-93 29-94 71-1 31 28 48 49 58 22 11 29 18 29 27 0 15-17 22-33 22-22 0-34-3-52-11l-7-4-8 47c13 6 37 11 62 11 58 0 96-28 96-73 0-25-15-43-47-59-20-10-32-17-32-27 0-9 10-19 33-19 18 0 32 4 43 8l5 3 8-46z" fill="#00579F"/>
                          <path d="M616 141h-43c-13 0-23 4-29 18l-82 174h58l12-32h71l7 32h51L616 141zm-68 116l22-59 12 59h-34z" fill="#00579F"/>
                          <path d="M222 141l-54 131-6-29-18-93c-3-13-12-17-23-18h-88l-1 4c21 5 40 13 55 22l47 178h59l90-195h-61z" fill="#00579F"/>
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 471" width="18" height="12">
                          <rect width="750" height="471" rx="40" fill="#fff" stroke="#DEDEDA" strokeWidth="20"/>
                          <circle cx="280" cy="235" r="140" fill="#EB001B"/>
                          <circle cx="470" cy="235" r="140" fill="#F79E1B"/>
                          <path d="M375 103a140 140 0 0 1 0 265 140 140 0 0 1 0-265z" fill="#FF5F00"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Stripe (Kreditkarte)</p>
                        <p className="text-xs text-gray-400">Zahlung per Karte via Stripe</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaySettings(p => ({ ...p, enable_stripe: !p.enable_stripe }))}
                      className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                        paySettings.enable_stripe ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {paySettings.enable_stripe ? "Aktiv" : "Deaktiviert"}
                    </button>
                  </div>
                  {paySettings.enable_stripe && (
                    <div className="px-6 pb-5 pt-3 space-y-3">
                      <div>
                        <Label className="text-xs text-gray-400 font-medium">Publishable Key (pk_live_...)</Label>
                        <Input value={paySettings.stripe_publishable_key} onChange={e => setPaySettings(p => ({ ...p, stripe_publishable_key: e.target.value }))} placeholder="pk_live_..." className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 font-mono text-xs focus:bg-white" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 font-medium">Secret Key (sk_live_...)</Label>
                        <Input type="password" value={paySettings.stripe_secret_key} onChange={e => setPaySettings(p => ({ ...p, stripe_secret_key: e.target.value }))} placeholder="sk_live_..." className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 font-mono text-xs focus:bg-white" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 font-medium">Payment Method Config ID — TWINT QR (pmc_...)</Label>
                        <Input value={paySettings.stripe_pmc_id} onChange={e => setPaySettings(p => ({ ...p, stripe_pmc_id: e.target.value }))} placeholder="pmc_..." className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 font-mono text-xs focus:bg-white" />
                        <p className="text-[10px] text-gray-400 mt-1">Stripe Dashboard → Products → Payment method configurations</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* TWINT */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50/40 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center overflow-hidden px-1">
                        <img src="/twint-logo.svg" alt="Telefon" className="w-8 h-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">TWINT</p>
                        <p className="text-xs text-gray-400">Zahlung per TWINT (Schweiz)</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaySettings(p => ({ ...p, enable_twint: !p.enable_twint }))}
                      className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                        paySettings.enable_twint ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {paySettings.enable_twint ? "Aktiv" : "Deaktiviert"}
                    </button>
                  </div>
                  {paySettings.enable_twint && (
                    <div className="px-6 pb-5 pt-3">
                      <Label className="text-xs text-gray-400 font-medium">TWINT Telefonnummer</Label>
                      <Input value={paySettings.twint_phone} onChange={e => setPaySettings(p => ({ ...p, twint_phone: e.target.value }))} placeholder="+41 79 000 00 00" className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                    </div>
                  )}
                </div>

                {/* Abholung im Geschäft */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-50/50 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                        <Store className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Abholung im Geschäft</p>
                        <p className="text-xs text-gray-400">Bestellung wird reserviert, Zahlung bei Abholung</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaySettings(p => ({ ...p, enable_pickup: !p.enable_pickup }))}
                      className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                        paySettings.enable_pickup ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {paySettings.enable_pickup ? "Aktiv" : "Deaktiviert"}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </TabsContent>

          {/* ── Anzeigen (Announcements) Tab ── */}
          <TabsContent value="anuncios">
            {/* Anzeigen Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Megaphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Anzeigen & Aktionen</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Anzeigen verwalten, die beim Öffnen der Website erscheinen</p>
                </div>
              </div>
              <Button onClick={() => openAnnModal()} className="bg-gradient-to-r from-brand to-brand-mid hover:from-brand-dark hover:to-brand text-white rounded-xl gap-2 shadow-sm shadow-green-500/20">
                <Plus className="w-4 h-4" />
                Neue Anzeige
              </Button>
            </div>

            {annLoading ? (
              <div className="space-y-4">
                {[0,1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                  <Megaphone className="w-8 h-8 text-amber-300" />
                </div>
                <p className="text-gray-500 font-medium">Keine Anzeigen vorhanden</p>
                <p className="text-gray-400 text-sm mt-1">Erstelle deine erste Anzeige oder Aktion</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map(ann => (
                  <div key={ann.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                      {/* Image + Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Image or icon */}
                        {ann.image1_url ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-sm border border-gray-100">
                            <img src={ann.image1_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${ann.type === 'product' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                            <Megaphone className={`w-6 h-6 ${ann.type === 'product' ? 'text-blue-400' : 'text-orange-400'}`} />
                          </div>
                        )}
                        {/* Title + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${ann.type === 'product' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                              {ann.type === 'product' ? 'Produkt' : 'Allgemein'}
                            </span>
                            {ann.show_once && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">Einmalig</span>
                            )}
                          </div>
                          <p className="font-bold text-gray-900 truncate">{ann.title}</p>
                          {ann.subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{ann.subtitle}</p>}
                        </div>
                      </div>

                      {/* Status + Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                          ann.is_active
                            ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                            : 'bg-gray-50 text-gray-400 ring-1 ring-gray-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${ann.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {ann.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAnnouncement(ann.id)}
                          disabled={togglingAnnId === ann.id}
                          className={`rounded-lg text-xs h-8 ${ann.is_active ? 'border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200' : 'border-gray-200 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'}`}
                        >
                          {togglingAnnId === ann.id ? '...' : ann.is_active ? 'Deaktivieren' : 'Aktivieren'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openAnnModal(ann)} className="rounded-lg text-xs h-8 gap-1 border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200">
                          <Edit className="w-3 h-3" /> Bearbeiten
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteAnnId(ann.id)} className="rounded-lg text-xs h-8 border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Kunden (Registered Users) Tab ── */}
          <TabsContent value="kunden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Registrierte Kunden</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{users.length} {users.length === 1 ? "Kunde" : "Kunden"} registriert</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={loadUsers} variant="outline" className="rounded-xl gap-2" disabled={usersLoading}>
                  {usersLoading ? "Lädt..." : "Aktualisieren"}
                </Button>
                <Button onClick={copyAllEmails} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl gap-2 shadow-sm" disabled={users.length === 0}>
                  <Copy className="w-4 h-4" />
                  Alle E-Mails kopieren
                </Button>
              </div>
            </div>

            {usersError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{usersError}</div>
            )}

            {usersLoading && users.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Kunden werden geladen...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Keine registrierten Kunden gefunden.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {users.map((u) => (
                  <div key={u.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="px-5 py-4 bg-gradient-to-r from-amber-50/60 to-transparent border-b border-gray-100">
                      <p className="font-bold text-gray-900 truncate">{u.firstName} {u.lastName}</p>
                      {u.createdAt && <p className="text-xs text-gray-400 mt-0.5">Registriert: {u.createdAt.split(" ")[0]}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        Letzter Login: {(() => {
                          if (!u.lastAccess) return "Nie"
                          const [d, t] = u.lastAccess.replace("T", " ").split(" ")
                          const [y, m, day] = (d || "").split("-")
                          if (!y || !m || !day) return u.lastAccess
                          return `${day}.${m}.${y}${t ? " " + t.slice(0, 5) : ""}`
                        })()}
                      </p>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      {/* Email */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{u.email || "—"}</span>
                        </div>
                        {u.email && (
                          <button type="button" onClick={() => copyToClipboard(u.email, "E-Mail")} title="E-Mail kopieren" className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors shrink-0">
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {/* Phone */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{u.phone || "—"}</span>
                        </div>
                        {u.phone && (
                          <button type="button" onClick={() => copyToClipboard(u.phone, "Telefon")} title="Telefon kopieren" className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors shrink-0">
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {/* Address */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">
                          {[u.address, [u.postalCode, u.city].filter(Boolean).join(" "), u.canton].filter(Boolean).join(", ") || "—"}
                        </span>
                      </div>

                      {/* Orders toggle */}
                      <button
                        type="button"
                        onClick={() => toggleUserOrders(u)}
                        className="w-full flex items-center justify-center gap-2 mt-1 px-3 py-2 rounded-xl text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        {expandedUserId === u.id ? "Bestellungen verbergen" : "Bestellungen anzeigen"}
                      </button>

                      {expandedUserId === u.id && (
                        <div className="pt-1">
                          {userOrdersLoadingId === u.id ? (
                            <p className="text-xs text-gray-400 text-center py-3">Bestellungen werden geladen...</p>
                          ) : (userOrders[u.id]?.length ?? 0) === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">Keine Bestellungen für diesen Kunden.</p>
                          ) : (
                            <div className="space-y-2">
                              {userOrders[u.id].map((o) => (
                                <div key={o.id} className="border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/60">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono font-bold text-sm text-gray-800">#{o.order_number}</span>
                                    <span className="font-bold text-sm text-brand">{Number(o.total_amount).toFixed(2)} CHF</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 mt-1">
                                    <span className="text-xs text-gray-400">{(o.created_at || "").split(" ")[0]} · {o.items_count} Art.</span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                      o.status === "completed" ? "bg-emerald-100 text-emerald-700"
                                      : o.status === "cancelled" ? "bg-red-100 text-red-700"
                                      : o.status === "processing" ? "bg-blue-100 text-blue-700"
                                      : "bg-amber-100 text-amber-700"
                                    }`}>{o.status}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Inhalte (Site Content) Tab ── */}
          <TabsContent value="inhalte">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Inhalte bearbeiten</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Hero-Bereich & Footer-Texte der Startseite</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {siteSavedMsg && <span className="text-sm font-semibold text-emerald-600">{siteSavedMsg}</span>}
                <Button onClick={saveSiteSettings} disabled={siteSaving || siteLoading} className="bg-gradient-to-r from-brand to-brand-mid hover:from-brand-dark hover:to-brand text-white rounded-xl px-6 shadow-sm">
                  {siteSaving ? "Speichert..." : "Speichern"}
                </Button>
              </div>
            </div>

            {siteLoading ? (
              <div className="text-center py-16 text-gray-400">Inhalte werden geladen...</div>
            ) : (
              <div className="space-y-8 max-w-3xl">

                {/* Quick-Nav: salta a cada sección con autoscroll */}
                <div className="sticky top-0 z-10 -mt-2 flex flex-wrap items-center gap-2 rounded-2xl bg-white/90 backdrop-blur border border-gray-100 shadow-sm p-2.5">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">Springe zu:</span>
                  <button
                    type="button"
                    onClick={() => document.getElementById("inhalt-hero")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100 transition-all"
                  >
                    Hero-Bereich
                  </button>
                  {FOOTER_MODAL_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => document.getElementById(`inhalt-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100 transition-all"
                    >
                      {siteForm[`footer_${k}_title`] || FOOTER_LEGAL_DEFAULTS[k].title}
                    </button>
                  ))}
                </div>

                {/* HERO */}
                <div id="inhalt-hero" className="scroll-mt-24 bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                  <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Images className="w-5 h-5 text-brand" /> Hero-Bereich</h3>

                  {/* Imágenes */}
                  <Label className="text-xs text-gray-400 font-medium">Hintergrundbilder (3)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1 mb-5">
                    {[1, 2, 3].map((slot) => (
                      <div key={slot} className="space-y-2">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                          {siteImagePreviews[slot] && (
                            <img src={siteImagePreviews[slot]} alt={`Hero ${slot}`} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <Input type="file" accept="image/*" onChange={(e) => handleSiteImageChange(slot, e.target.files?.[0] || null)} className="bg-white text-xs" />
                      </div>
                    ))}
                  </div>

                  {/* Badges */}
                  <Label className="text-xs text-gray-400 font-medium">Trust-Bar Badges (4)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 mb-5">
                    {[1, 2, 3, 4].map((i) => (
                      <Input
                        key={i}
                        value={siteForm[`hero_badge_${i}`] ?? ""}
                        onChange={(e) => setSiteForm(p => ({ ...p, [`hero_badge_${i}`]: e.target.value }))}
                        placeholder={`Badge ${i}`}
                        className="bg-gray-50/80 border-gray-200 rounded-xl focus:bg-white"
                      />
                    ))}
                  </div>

                  {/* Título */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <div>
                      <Label className="text-xs text-gray-400 font-medium">Titel – Zeile 1</Label>
                      <Input value={siteForm["hero_title_1"] ?? ""} onChange={(e) => setSiteForm(p => ({ ...p, hero_title_1: e.target.value }))} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400 font-medium">Titel – Zeile 2 (grün)</Label>
                      <Input value={siteForm["hero_title_2"] ?? ""} onChange={(e) => setSiteForm(p => ({ ...p, hero_title_2: e.target.value }))} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                    </div>
                  </div>

                  {/* Subtítulo */}
                  <div className="mb-5">
                    <Label className="text-xs text-gray-400 font-medium">Untertitel</Label>
                    <Textarea value={siteForm["hero_subtitle"] ?? ""} onChange={(e) => setSiteForm(p => ({ ...p, hero_subtitle: e.target.value }))} rows={2} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                  </div>

                  {/* Stats */}
                  <Label className="text-xs text-gray-400 font-medium">Statistik-Boxen (3)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50/40">
                        <Input value={siteForm[`hero_stat${i}_val`] ?? ""} onChange={(e) => setSiteForm(p => ({ ...p, [`hero_stat${i}_val`]: e.target.value }))} placeholder="Wert (z.B. 500+)" className="bg-white border-gray-200 rounded-lg text-sm" />
                        <Input value={siteForm[`hero_stat${i}_label`] ?? ""} onChange={(e) => setSiteForm(p => ({ ...p, [`hero_stat${i}_label`]: e.target.value }))} placeholder="Label" className="bg-white border-gray-200 rounded-lg text-sm" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* FOOTER MODALS */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                  <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-brand" /> Footer-Texte (Modale)</h3>
                  <div className="space-y-5">
                    {FOOTER_MODAL_KEYS.map((k) => (
                      <div key={k} id={`inhalt-${k}`} className="scroll-mt-24 border border-gray-100 rounded-xl p-4 bg-gray-50/40">
                        <div className="mb-2">
                          <Label className="text-xs text-gray-400 font-medium">Titel</Label>
                          <Input value={siteForm[`footer_${k}_title`] ?? ""} onChange={(e) => setSiteForm(p => ({ ...p, [`footer_${k}_title`]: e.target.value }))} className="bg-white border-gray-200 rounded-lg mt-1 font-semibold" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400 font-medium">Inhalt</Label>
                          <Textarea value={siteForm[`footer_${k}_content`] ?? ""} onChange={(e) => setSiteForm(p => ({ ...p, [`footer_${k}_content`]: e.target.value }))} rows={8} className="bg-white border-gray-200 rounded-lg mt-1 text-sm font-mono" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Package className="w-6 h-6 text-gray-600" />
                  <span>{selectedOrder.order_number}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-lg mb-3">Kundeninformationen</h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Name:</span> {selectedOrder.customer_first_name}{" "}
                      {selectedOrder.customer_last_name}
                    </p>
                    <p>
                      <span className="font-medium">E-Mail:</span> {selectedOrder.customer_email}
                    </p>
                    <p>
                      <span className="font-medium">Telefon:</span> {selectedOrder.customer_phone}
                    </p>
                    <p>
                      <span className="font-medium">Adresse:</span> {selectedOrder.customer_address}
                    </p>
                    <p>
                      <span className="font-medium">Stadt:</span> {selectedOrder.customer_city}
                    </p>
                    <p>
                      <span className="font-medium">Postleitzahl:</span> {selectedOrder.customer_postal_code}
                    </p>
                    <p>
                      <span className="font-medium">Kanton:</span> {selectedOrder.customer_canton}
                    </p>
                    {selectedOrder.customer_notes && (
                      <p>
                        <span className="font-medium">Notizen:</span> {selectedOrder.customer_notes}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Bestellinformationen</h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Gesamt:</span>{" "}
                      {(Number.parseFloat(selectedOrder.total_amount.toString()) || 0).toFixed(2)} CHF
                    </p>
                    {(Number.parseFloat(selectedOrder.shipping_cost.toString()) || 0) > 0 && (
                      <p>
                        <span className="font-medium">Versandkosten:</span>{" "}
                        {(Number.parseFloat(selectedOrder.shipping_cost.toString()) || 0).toFixed(2)} CHF
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Zahlungsmethode:</span> {selectedOrder.payment_method}
                    </p>
                    <p>
                      <span className="font-medium">Zahlungsstatus:</span> {selectedOrder.payment_status}
                    </p>
                    <p>
                      <span className="font-medium">Erstellungsdatum:</span> {formatDate(selectedOrder.created_at)}
                    </p>
                    <p>
                      <span className="font-medium">Letzte Aktualisierung:</span> {formatDate(selectedOrder.updated_at)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-lg mb-3">Bestellpositionen</h3>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item) => (
                      <Card key={item.product_id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{item.product_name}</h4>
                            <div className="flex items-center gap-6 text-sm text-gray-700">
                              <span>{item.quantity}x</span>
                              <span>{Number.parseFloat(item.price.toString()).toFixed(2)} CHF</span>
                              <span className="font-semibold text-brand">
                                {Number.parseFloat(item.subtotal.toString()).toFixed(2)} CHF
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t mt-4">
                <Button
                  onClick={() => downloadInvoicePDF(selectedOrder)}
                  className="bg-brand hover:bg-brand-dark text-white rounded-full px-5 text-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Rechnung als PDF herunterladen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Product Limit Modal */}
        <Dialog open={isLimitModalOpen} onOpenChange={setIsLimitModalOpen}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Produktlimit erreicht
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                Die Datenbank unterstützt maximal <strong>1000 Produkte</strong>.
                Aktuell sind <strong>{products.length}</strong> Produkte gespeichert.
              </p>
              <p>
                Um das Limit auf <strong>3000 Produkte</strong> zu erhöhen,
                kontaktieren Sie bitte <strong>lweb</strong> für ein Angebot.
              </p>
              <p className="text-gray-500">
                Sie können weiterhin Produkte bearbeiten oder löschen. Sobald die Anzahl
                unter {PRODUCT_LIMIT} liegt, können wieder neue Produkte hinzugefügt werden.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsLimitModalOpen(false)} className="bg-red-600 hover:bg-red-700 text-white">
                Verstanden
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Product Add/Edit Modal */}
        <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
          <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-full max-w-full h-full max-h-full rounded-none sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-2xl sm:h-auto sm:max-h-[80vh] sm:rounded-lg overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>{isDuplicating ? "Produkt duplizieren" : currentEditingProduct ? "Produkt bearbeiten" : "Produkt hinzufügen"}</DialogTitle>
            </DialogHeader>

            <form key={`${currentEditingProduct?.id ?? "new"}-${isDuplicating ? "dup" : "edit"}`} onSubmit={handleProductSubmit} className="space-y-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Produktname *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={currentEditingProduct?.name || ""}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="article_number">Referenznummer</Label>
                  <Input
                    id="article_number"
                    name="article_number"
                    defaultValue={isDuplicating ? "" : currentEditingProduct?.article_number || ""}
                    className="bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preis (CHF) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={currentEditingProduct?.price || ""}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Lagerbestand *</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    required
                    defaultValue={currentEditingProduct?.stock || "0"}
                    className="bg-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={currentEditingProduct?.description || ""}
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="category">Kategorie *</Label>
                <Select name="category" defaultValue={currentEditingProduct?.category || ""} required>
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder="Kategorie auswählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {categories.map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
            
                </div>
                <div>
                  <Label htmlFor="rating">Bewertung (0-5)</Label>
                  <Input
                    id="rating"
                    name="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    defaultValue={currentEditingProduct?.rating || ""}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="badge">Badge</Label>
                  <Input
                    id="badge"
                    name="badge"
                    placeholder="z.B. Neue, Aktion"
                    defaultValue={currentEditingProduct?.badge || ""}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="origin">Hersteller</Label>
                  <Input
                    id="origin"
                    name="origin"
                    placeholder="z.B. Pohl Force, Walther"
                    defaultValue={currentEditingProduct?.origin || ""}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier">Lieferant</Label>
                  <Input
                    id="supplier"
                    name="supplier"
                    placeholder="z.B. Airsoft, Böker"
                    defaultValue={currentEditingProduct?.supplier || ""}
                    className="bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  {/* Versand auf Anfrage: no se vende online (contactar / recogida) */}
                  <input type="hidden" name="shipping_on_request" value={productOnRequest ? "1" : "0"} />
                  <label className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={productOnRequest}
                      onChange={e => setProductOnRequest(e.target.checked)}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span className="text-sm font-medium text-amber-800">Versand auf Anfrage — nicht online kaufbar (Kontakt / Abholung im Laden)</span>
                  </label>
                </div>
                {!productOnRequest && (
                <div>
                  <Label htmlFor="weight_kg">Gewicht (kg)</Label>
                  <Input
                    id="weight_kg"
                    name="weight_kg"
                    type="number"
                    step="0.001"
                    min="0"
                    defaultValue={currentEditingProduct?.weight_kg ?? "0.500"}
                    placeholder="z.B. 0.350"
                    className="bg-white"
                  />
                </div>
                )}
              </div>

              <div>
                <Label>Produktbilder</Label>
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`image_${index}`}>Bild {index + 1}</Label>
                      <Input
                        id={`image_${index}`}
                        name={`image_${index}`}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange(index)}
                        className="bg-white"
                      />
                      {imagePreviews[index] && (
                        <div className="relative">
                          <img
                            src={imagePreviews[index] || "/placeholder.svg"}
                            alt={`Vorschau ${index + 1}`}
                            className="w-full h-32 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              const newPreviews = [...imagePreviews]
                              newPreviews[index] = null
                              setImagePreviews(newPreviews)
                              if (currentEditingProduct) {
                                const newRemoved = [...removedImages]
                                newRemoved[index] = true
                                setRemovedImages(newRemoved)
                              }
                            }}
                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                {currentEditingProduct && !isDuplicating && (
                  <Button type="button" variant="outline" onClick={duplicateCurrentProduct} className="mr-auto bg-white text-brand border-brand hover:bg-brand/10">
                    Duplizieren
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)} className="bg-white text-gray-700 hover:bg-gray-50">
                  Abbrechen
                </Button>
                <Button type="submit" className="bg-brand hover:bg-brand-dark text-white rounded-full px-6">
                  {currentEditingProduct && !isDuplicating ? "Aktualisieren" : "Erstellen"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Category Create/Edit Modal */}
        {/* Modal filtro rápido de categoría */}
        <Dialog open={showCategoryFilterModal} onOpenChange={setShowCategoryFilterModal}>
          <DialogContent className="sm:max-w-xs rounded-2xl p-0 overflow-hidden">
            <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Filter className="w-4 h-4 text-blue-600" />
                Kategorie auswählen
              </DialogTitle>
            </DialogHeader>
            <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
              <button
                onClick={() => { setProductFilters(prev => ({ ...prev, category: "" })); setShowCategoryFilterModal(false) }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  !productFilters.category ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                Alle Kategorien
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => { setProductFilters(prev => ({ ...prev, category: cat.slug })); setShowCategoryFilterModal(false) }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    productFilters.category === cat.slug ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryModalOpen} onOpenChange={(open) => { setIsCategoryModalOpen(open); if (!open) { setEditingCategory(null); setForceHaupt(false); setCatIsHaupt(false); setCatCreateKind(null) } }}>
          <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-full max-w-full h-full max-h-full rounded-none flex flex-col overflow-hidden p-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md sm:h-auto sm:max-h-[80vh] sm:rounded-lg bg-white">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <DialogTitle>{editingCategory ? (editingCategory.is_haupt ? "Hauptkategorie bearbeiten" : "Kategorie bearbeiten") : (forceHaupt ? "Neue Hauptkategorie" : catCreateKind === "subkategorie" ? "Neue Subkategorie" : "Neue Kategorie")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCategorySubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <Label htmlFor="cat-name" className="text-sm font-medium">Name *</Label>
                  <Input
                    id="cat-name"
                    name="name"
                    required
                    defaultValue={editingCategory?.name || ""}
                    key={editingCategory?.id ?? "new"}
                    placeholder="z.B. Rubs & Gewürze"
                    className="bg-white h-12 text-base sm:h-10 sm:text-sm mt-1"
                  />
                  {!editingCategory && (
                    <p className="text-xs text-gray-400 mt-1">Der Slug wird automatisch generiert</p>
                  )}
                  {editingCategory && (
                    <p className="text-xs text-gray-400 mt-1">Slug: <span className="font-mono">{editingCategory.slug}</span> (wird nicht geändert)</p>
                  )}
                </div>
                <input type="hidden" name="is_haupt" value={catIsHaupt ? "1" : "0"} />
                {/* Convertir entre Kategorie y Hauptkategorie (oculto al crear una Subkategorie) */}
                {catCreateKind !== "subkategorie" && (
                <label className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={catIsHaupt}
                    onChange={e => setCatIsHaupt(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Als Hauptkategorie (oberste Ebene)</span>
                </label>
                )}
                {catIsHaupt && (
                  <div>
                    <Label htmlFor="cat-image" className="text-sm font-medium">Bild (optional)</Label>
                    {editingCategory?.image && (
                      <img src={editingCategory.image} alt="" className="mt-2 w-full h-32 object-cover rounded-lg border border-gray-200" />
                    )}
                    <input
                      id="cat-image"
                      type="file"
                      name="image"
                      accept="image/*"
                      className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {editingCategory?.image && <p className="text-xs text-gray-400 mt-1">Neues Bild wählen, um das aktuelle zu ersetzen.</p>}
                  </div>
                )}
                {!catIsHaupt && (
                <div>
                  <Label htmlFor="cat-parent" className="text-sm font-medium">Übergeordnete Kategorie</Label>
                  <select
                    id="cat-parent"
                    name="parent_id"
                    defaultValue={editingCategory?.parent_id ?? ""}
                    key={(editingCategory?.id ?? "new") + "-parent"}
                    className="w-full mt-1 h-12 sm:h-10 px-3 text-base sm:text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">— Keine (lose Kategorie) —</option>
                    {(() => {
                      // No se puede elegir como padre: la propia categoría ni sus descendientes (evita bucles)
                      const blocked = new Set<number>()
                      if (editingCategory) {
                        blocked.add(editingCategory.id)
                        for (let added = true; added;) {
                          added = false
                          for (const c of categories)
                            if (c.parent_id != null && blocked.has(c.parent_id) && !blocked.has(c.id)) { blocked.add(c.id); added = true }
                        }
                      }
                      const isHauptId = (id: number | null) => id != null && categories.some(h => h.is_haupt && h.id === id)
                      const hauptList = categories.filter(c => c.is_haupt && !blocked.has(c.id))
                      const katList = categories.filter(c => !c.is_haupt && (c.parent_id === null || isHauptId(c.parent_id)) && !blocked.has(c.id))
                      // Kategorie erstellen → solo Haupts · Subkategorie erstellen → solo Kategorien · editar → ambas
                      const showHaupt = catCreateKind !== "subkategorie"
                      const showKat = catCreateKind !== "kategorie"
                      return (
                        <>
                          {showHaupt && hauptList.length > 0 && (
                            <optgroup label="In Hauptkategorie (→ wird Kategorie)">
                              {hauptList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </optgroup>
                          )}
                          {showKat && katList.length > 0 && (
                            <optgroup label="In Kategorie (→ wird Subkategorie)">
                              {katList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </optgroup>
                          )}
                        </>
                      )
                    })()}
                  </select>
                </div>
                )}
                <div>
                  <Label htmlFor="cat-description" className="text-sm font-medium">Beschreibung</Label>
                  <Textarea
                    id="cat-description"
                    name="description"
                    rows={4}
                    defaultValue={editingCategory?.description || ""}
                    key={(editingCategory?.id ?? "new") + "-desc"}
                    placeholder="Kurze Beschreibung der Kategorie..."
                    className="bg-white text-base sm:text-sm mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-white shrink-0">
                <Button type="button" variant="outline" onClick={() => { setIsCategoryModalOpen(false); setEditingCategory(null) }} className="bg-white text-gray-700 hover:bg-gray-50">
                  Abbrechen
                </Button>
                <Button type="submit" className="bg-brand hover:bg-brand-dark text-white rounded-full px-6">
                  {editingCategory ? "Speichern" : "Erstellen"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Product Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Löschen bestätigen</DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p className="text-gray-600">
                Sind Sie sicher, dass Sie dieses Produkt löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="bg-white text-gray-700 hover:bg-gray-50">
                Abbrechen
              </Button>
              <Button onClick={confirmDeleteProduct} className="bg-red-500 hover:bg-red-600 text-white">
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Category Modal */}
        <Dialog open={!!categoryToDelete} onOpenChange={open => { if (!open) setCategoryToDelete(null) }}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Kategorie löschen</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {categoryToDelete && (() => {
                const count = products.filter(p => p.category === categoryToDelete.slug).length
                return (
                  <p className="text-gray-600">
                    Kategorie <strong>{categoryToDelete.name}</strong> wirklich löschen?
                    {count > 0 && <> Dabei werden auch <strong>{count} Produkte</strong> gelöscht.</>}
                    {" "}Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                )
              })()}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCategoryToDelete(null)} className="bg-white text-gray-700 hover:bg-gray-50">
                Abbrechen
              </Button>
              <Button onClick={() => { const cat = categoryToDelete; setCategoryToDelete(null); if (cat) handleDeleteCategory(cat) }} className="bg-red-500 hover:bg-red-600 text-white">
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Blog Post Modal ── */}
        <Dialog open={isBlogModalOpen} onOpenChange={open => { setIsBlogModalOpen(open); if (!open) setCurrentEditingPost(null) }}>
          <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-full max-w-full h-full max-h-full rounded-none flex flex-col overflow-hidden p-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-lg bg-white">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <DialogTitle>{currentEditingPost ? "Beitrag bearbeiten" : "Neuer Beitrag"}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Titel *</Label>
                <Input value={blogForm.title} onChange={e => setBlogForm(f => ({ ...f, title: e.target.value }))} placeholder="Beitragstitel..." className="rounded-xl h-12 text-base sm:h-10 sm:text-sm" />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Inhalt *</Label>
                <Textarea value={blogForm.content} onChange={e => setBlogForm(f => ({ ...f, content: e.target.value }))} placeholder="Schreibe deinen Beitrag hier..." rows={8} className="rounded-xl resize-none text-base sm:text-sm" />
              </div>

              {/* Images */}
              {["Hero-Bild", "Bild 2", "Bild 3", "Bild 4"].map((label, i) => (
                <div key={i}>
                  <Label className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> {label}
                  </Label>

                  {/* Current preview */}
                  {(blogImagePreviews[i] && !blogRemovedImages[i]) ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-n-150 mb-2">
                      <img src={blogImagePreviews[i]!} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          const r = [...blogRemovedImages]; r[i] = true; setBlogRemovedImages(r)
                          const p = [...blogImagePreviews]; p[i] = null; setBlogImagePreviews(p)
                          const f = [...blogImageFiles]; f[i] = null; setBlogImageFiles(f)
                          const u = [...blogImageUrls]; u[i] = ""; setBlogImageUrls(u)
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      ><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Upload file */}
                      <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-n-250 rounded-xl cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors">
                        <Upload className="w-4 h-4 text-n-400 mb-1" />
                        <span className="text-[11px] text-n-400">Datei hochladen</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0]; if (!file) return
                          const files = [...blogImageFiles]; files[i] = file; setBlogImageFiles(files)
                          const previews = [...blogImagePreviews]; previews[i] = URL.createObjectURL(file); setBlogImagePreviews(previews)
                          const r = [...blogRemovedImages]; r[i] = false; setBlogRemovedImages(r)
                          const u = [...blogImageUrls]; u[i] = ""; setBlogImageUrls(u)
                        }} />
                      </label>
                      {/* URL input */}
                      <div className="flex flex-col gap-1">
                        <input
                          type="url"
                          placeholder="https://..."
                          value={blogImageUrls[i]}
                          onChange={e => {
                            const u = [...blogImageUrls]; u[i] = e.target.value; setBlogImageUrls(u)
                            if (e.target.value) {
                              const p = [...blogImagePreviews]; p[i] = e.target.value; setBlogImagePreviews(p)
                              const f = [...blogImageFiles]; f[i] = null; setBlogImageFiles(f)
                            }
                          }}
                          className="h-20 text-xs px-3 border border-n-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand placeholder-n-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white shrink-0">
              <Button onClick={saveBlogPost} disabled={blogSaving} className="flex-1 bg-brand hover:bg-brand-dark text-white rounded-xl">
                {blogSaving ? "Speichern..." : currentEditingPost ? "Aktualisieren" : "Veröffentlichen"}
              </Button>
              <Button variant="outline" onClick={() => setIsBlogModalOpen(false)} className="rounded-xl">Abbrechen</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Blog Delete Confirm ── */}
        <Dialog open={!!deleteBlogId} onOpenChange={open => { if (!open) setDeleteBlogId(null) }}>
          <DialogContent className="max-w-sm bg-white">
            <DialogHeader><DialogTitle>Beitrag löschen?</DialogTitle></DialogHeader>
            <p className="text-sm text-n-600">Dieser Beitrag wird dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="destructive" onClick={() => deleteBlogId && deleteBlogPost(deleteBlogId)} className="flex-1 rounded-xl">Löschen</Button>
              <Button variant="outline" onClick={() => setDeleteBlogId(null)} className="rounded-xl">Abbrechen</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Gallery Upload Modal ── */}
        <Dialog open={isGalleryModalOpen} onOpenChange={open => { setIsGalleryModalOpen(open); if (!open) { setGalleryFile(null); setGalleryPreview(null); setGalleryTitle("") } }}>
          <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-full max-w-full h-full max-h-full rounded-none flex flex-col overflow-hidden p-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md sm:h-auto sm:max-h-[85vh] sm:rounded-lg bg-white">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <DialogTitle>Bild hochladen</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Titel (optional)</Label>
                <Input value={galleryTitle} onChange={e => setGalleryTitle(e.target.value)} placeholder="Bildbeschreibung..." className="rounded-xl h-12 text-base sm:h-10 sm:text-sm" />
              </div>

              <div>
                <Label className="text-sm font-semibold mb-1.5 flex items-center gap-1.5 block">
                  <ImageIcon className="w-3.5 h-3.5" /> Bild *
                </Label>
                {galleryPreview ? (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border border-n-150">
                    <img src={galleryPreview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setGalleryFile(null); setGalleryPreview(null) }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    ><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-n-250 rounded-xl cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors">
                    <Upload className="w-8 h-8 text-n-400 mb-2" />
                    <span className="text-sm text-n-400 font-medium">Datei auswählen</span>
                    <span className="text-[11px] text-n-300 mt-1">JPG, PNG, GIF, WebP — max. 8MB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0]; if (!file) return
                      setGalleryFile(file)
                      setGalleryPreview(URL.createObjectURL(file))
                    }} />
                  </label>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white shrink-0">
              <Button onClick={saveGalleryImage} disabled={gallerySaving || !galleryFile} className="flex-1 bg-brand hover:bg-brand-dark text-white rounded-xl">
                {gallerySaving ? "Hochladen..." : "Hochladen"}
              </Button>
              <Button variant="outline" onClick={() => setIsGalleryModalOpen(false)} className="rounded-xl">Abbrechen</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Gallery Delete Confirm ── */}
        <Dialog open={!!deleteGalleryId} onOpenChange={open => { if (!open) setDeleteGalleryId(null) }}>
          <DialogContent className="max-w-sm bg-white">
            <DialogHeader><DialogTitle>Bild löschen?</DialogTitle></DialogHeader>
            <p className="text-sm text-n-600">Dieses Bild wird dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="destructive" onClick={() => deleteGalleryId && deleteGalleryImage(deleteGalleryId)} className="flex-1 rounded-xl">Löschen</Button>
              <Button variant="outline" onClick={() => setDeleteGalleryId(null)} className="rounded-xl">Abbrechen</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Announcement Create/Edit Modal ── */}
        <Dialog open={isAnnModalOpen} onOpenChange={open => { setIsAnnModalOpen(open); if (!open) setEditingAnn(null) }}>
          <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto" onInteractOutside={e => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{editingAnn ? "Anzeige bearbeiten" : "Neue Anzeige erstellen"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              {/* Type selection */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Typ</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(['general', 'product'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setAnnForm(f => ({ ...f, type: t }))}
                      className={`p-3 rounded-xl border-2 text-sm font-semibold flex flex-col items-center gap-1.5 transition-all ${annForm.type === t ? 'border-brand bg-brand/5 text-brand' : 'border-n-150 text-n-500 hover:border-n-300'}`}
                    >
                      {t === 'general' ? <Bell className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                      {t === 'general' ? 'Allgemeine Anzeige' : 'Produktaktion'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Titel *</Label>
                <Input value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} placeholder={annForm.type === 'product' ? "z.B. NEU: Edition \"Nordlicht\" verfügbar" : "z.B. Sommerferien – wir sind zurück!"} className="rounded-xl" />
              </div>

              {/* Subtitle */}
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Untertitel (optional)</Label>
                <Textarea value={annForm.subtitle} onChange={e => setAnnForm(f => ({ ...f, subtitle: e.target.value }))} placeholder={annForm.type === 'product' ? "z.B. Jetzt 10% Rabatt sichern – nur für kurze Zeit!" : "z.B. Wir sind wieder da mit neuen heissen Produkten."} className="rounded-xl max-h-40" rows={3} />
              </div>

              {/* Product URL — only for product type */}
              {annForm.type === 'product' && (
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">Produkt-URL</Label>
                  <Input value={annForm.product_url} onChange={e => setAnnForm(f => ({ ...f, product_url: e.target.value }))} placeholder="https://..." className="rounded-xl" />
                  <p className="text-xs text-n-400 mt-1">Wird als «Produkt ansehen»-Button angezeigt</p>
                </div>
              )}

              {/* Images */}
              {(annForm.type === 'general' ? [0, 1] : [0]).map(i => (
                <div key={i}>
                  <Label className="text-sm font-semibold mb-1.5 flex items-center gap-1.5 block">
                    <ImageIcon className="w-3.5 h-3.5" /> {i === 0 ? 'Bild 1' : 'Bild 2'} {i === 0 && annForm.type === 'product' ? '' : '(optional)'}
                  </Label>
                  {(annImagePreviews[i] && !annRemovedImages[i]) ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-n-150">
                      <img src={annImagePreviews[i]!} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          const r: [boolean,boolean] = [...annRemovedImages] as [boolean,boolean]; r[i] = true; setAnnRemovedImages(r)
                          const p: [string|null,string|null] = [...annImagePreviews] as [string|null,string|null]; p[i] = null; setAnnImagePreviews(p)
                          const f: [File|null,File|null] = [...annImageFiles] as [File|null,File|null]; f[i] = null; setAnnImageFiles(f)
                          const u: [string,string] = [...annImageUrls] as [string,string]; u[i] = ""; setAnnImageUrls(u)
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      ><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-n-250 rounded-xl cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors">
                        <Upload className="w-4 h-4 text-n-400 mb-1" />
                        <span className="text-[11px] text-n-400">Datei hochladen</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0]; if (!file) return
                          const files: [File|null,File|null] = [...annImageFiles] as [File|null,File|null]; files[i] = file; setAnnImageFiles(files)
                          const previews: [string|null,string|null] = [...annImagePreviews] as [string|null,string|null]; previews[i] = URL.createObjectURL(file); setAnnImagePreviews(previews)
                          const r: [boolean,boolean] = [...annRemovedImages] as [boolean,boolean]; r[i] = false; setAnnRemovedImages(r)
                          const u: [string,string] = [...annImageUrls] as [string,string]; u[i] = ""; setAnnImageUrls(u)
                        }} />
                      </label>
                      <div className="flex flex-col gap-1">
                        <input
                          type="url"
                          placeholder="https://..."
                          value={annImageUrls[i]}
                          onChange={e => {
                            const u: [string,string] = [...annImageUrls] as [string,string]; u[i] = e.target.value; setAnnImageUrls(u)
                            if (e.target.value) {
                              const p: [string|null,string|null] = [...annImagePreviews] as [string|null,string|null]; p[i] = e.target.value; setAnnImagePreviews(p)
                              const f: [File|null,File|null] = [...annImageFiles] as [File|null,File|null]; f[i] = null; setAnnImageFiles(f)
                            }
                          }}
                          className="h-20 text-xs px-3 border border-n-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand placeholder-n-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Show once */}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-n-150 hover:border-n-300 transition-colors">
                <input
                  type="checkbox"
                  checked={annForm.show_once}
                  onChange={e => setAnnForm(f => ({ ...f, show_once: e.target.checked }))}
                  className="w-4 h-4 accent-brand"
                />
                <div>
                  <p className="text-sm font-semibold text-n-900">Nur einmal anzeigen</p>
                  <p className="text-xs text-n-500">Nutzer sehen die Anzeige nur beim ersten Besuch</p>
                </div>
              </label>

              <div className="flex gap-3 pt-1">
                <Button onClick={saveAnnouncement} disabled={annSaving} className="flex-1 bg-brand hover:bg-brand-dark text-white rounded-xl">
                  {annSaving ? "Speichern..." : editingAnn ? "Aktualisieren" : "Erstellen"}
                </Button>
                <Button variant="outline" onClick={() => setIsAnnModalOpen(false)} className="rounded-xl">Abbrechen</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Ship Confirm ── */}
        <Dialog open={!!shipConfirmOrder} onOpenChange={open => { if (!open) setShipConfirmOrder(null) }}>
          <DialogContent className="max-w-sm bg-white">
            <DialogHeader><DialogTitle>📦 Versandbestätigung senden?</DialogTitle></DialogHeader>
            <p className="text-sm text-n-600">
              Es wird eine E-Mail an <span className="font-semibold text-n-900">{shipConfirmOrder?.customer_email}</span> gesendet, um zu bestätigen, dass die Bestellung auf dem Weg ist.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => { if (shipConfirmOrder) { sendShippingNotification(shipConfirmOrder); setShipConfirmOrder(null) } }}
                className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
              >
                Ja, senden
              </Button>
              <Button variant="outline" onClick={() => setShipConfirmOrder(null)} className="rounded-xl">Abbrechen</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Hersteller verwalten ── */}
        <Dialog open={showBrandsModal} onOpenChange={open => { setShowBrandsModal(open); if (!open) { setRenamingBrand(null); setNewBrandName("") } }}>
          <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-full max-w-full h-full max-h-full rounded-none flex flex-col overflow-hidden p-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md sm:h-auto sm:max-h-[80vh] sm:rounded-lg bg-white">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <DialogTitle>Hersteller verwalten</DialogTitle>
              <p className="text-xs text-gray-500 mt-1">Markennamen umbenennen. Der neue Name wird bei allen Produkten dieser Marke angewendet.</p>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {(() => {
                // Group brands case-insensitively and space-insensitively
                const groupMap = new Map<string, { variants: Map<string, number>; total: number; displayName: string }>()
                products.forEach(p => {
                  const o = (p.origin || "").trim()
                  if (!o) return
                  const key = o.toLowerCase().replace(/\s+/g, "")
                  if (!groupMap.has(key)) groupMap.set(key, { variants: new Map(), total: 0, displayName: o })
                  const g = groupMap.get(key)!
                  g.variants.set(o, (g.variants.get(o) || 0) + 1)
                  g.total++
                  // Use the variant with most products as display name
                  g.displayName = Array.from(g.variants.entries()).reduce((a, b) => a[1] >= b[1] ? a : b)[0]
                })
                const brands = Array.from(groupMap.entries()).sort((a, b) => a[1].displayName.localeCompare(b[1].displayName))
                if (brands.length === 0) {
                  return <p className="text-sm text-gray-500 text-center py-8">Keine Hersteller vorhanden.</p>
                }
                return (
                  <ul className="divide-y divide-gray-100">
                    {brands.map(([key, { variants, total, displayName }]) => {
                      const variantList = Array.from(variants.keys())
                      return (
                        <li key={key} className="py-2.5">
                          {renamingBrand === key ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newBrandName}
                                onChange={e => setNewBrandName(e.target.value)}
                                placeholder={displayName}
                                autoFocus
                                disabled={brandSaving}
                                className="flex-1"
                                onKeyDown={e => {
                                  if (e.key === "Enter") renameBrandGroup(variantList, newBrandName)
                                  if (e.key === "Escape") { setRenamingBrand(null); setNewBrandName("") }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => renameBrandGroup(variantList, newBrandName)}
                                disabled={brandSaving || !newBrandName.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                {brandSaving ? "…" : "Speichern"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setRenamingBrand(null); setNewBrandName("") }}
                                disabled={brandSaving}
                              >
                                Abbrechen
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                                <p className="text-xs text-gray-500">{total} Produkt{total === 1 ? "" : "e"}{variantList.length > 1 && <span className="ml-1 text-amber-500">({variantList.length} Varianten)</span>}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setRenamingBrand(key); setNewBrandName(displayName) }}
                                className="shrink-0"
                              >
                                <Edit className="w-3.5 h-3.5 mr-1.5" />
                                Umbenennen
                              </Button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )
              })()}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
              <Button variant="outline" onClick={() => setShowBrandsModal(false)} className="w-full">Schließen</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Announcement Delete Confirm ── */}
        <Dialog open={!!deleteAnnId} onOpenChange={open => { if (!open) setDeleteAnnId(null) }}>
          <DialogContent className="max-w-sm bg-white">
            <DialogHeader><DialogTitle>Anzeige löschen?</DialogTitle></DialogHeader>
            <p className="text-sm text-n-600">Diese Anzeige wird dauerhaft gelöscht.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="destructive" onClick={() => deleteAnnId && deleteAnnouncement(deleteAnnId)} className="flex-1 rounded-xl">Löschen</Button>
              <Button variant="outline" onClick={() => setDeleteAnnId(null)} className="rounded-xl">Abbrechen</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
