"use client"

import { useState, useEffect } from "react"
import {
  User,
  Package,
  Edit,
  Save,
  X,
  Eye,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Trash2,
  AlertTriangle,
  Lock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  Download,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  CheckCircle,
  Clock,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserData {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  address: string
  city: string
  postal_code: string
  canton: string
  notes: string
  created_at: string
  last_login: string
}

interface OrderStats {
  total_orders: number
  total_spent: number
  last_order_date: string
}

interface OrderItem {
  product_id: number
  product_name: string
  product_description: string
  product_image: string
  price: number
  quantity: number
  subtotal: number
  heat_level: number
  rating: number
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
  total_amount: number
  shipping_cost: number
  status: string
  payment_method: string
  payment_status: string
  created_at: string
  updated_at: string
  items_count: number
  items?: OrderItem[]
}

interface OrdersResponse {
  success: boolean
  data: Order[]
  pagination: {
    current_page: number
    total_pages: number
    total_orders: number
    per_page: number
    has_next: boolean
    has_prev: boolean
  }
  stats: {
    total_orders: number
    total_revenue: number
    avg_order_value: number
    completed_orders: number
    pending_orders: number
    processing_orders: number
    cancelled_orders: number
  }
}

interface UserProfileProps {
  onClose: () => void
  onAccountDeleted?: () => void
}

export function UserProfile({ onClose, onAccountDeleted }: UserProfileProps) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState("")

  // Pagination and filtering states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [showOrderItems, setShowOrderItems] = useState<{ [key: number]: boolean }>({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<UserData>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Estados para eliminación de cuenta
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  // Estados para cambio de contraseña
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  useEffect(() => {
    loadUserProfile()
  }, [])

  useEffect(() => {
    if (userData) {
      loadUserOrders()
    }
  }, [userData, currentPage, statusFilter, searchTerm])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      const sessionToken = localStorage.getItem("user-session-token")
      console.log("UserProfile: Loading with token:", sessionToken?.substring(0, 10) + "...")

      if (!sessionToken) {
        throw new Error("No session token found")
      }

      const response = await fetch(`${API_BASE_URL}/get_user.php`, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          sessionToken: sessionToken,
        }),
      })

      console.log("UserProfile: Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("UserProfile: HTTP Error:", response.status, errorText)

        if (response.status === 401) {
          localStorage.removeItem("user-session-token")
          throw new Error("Sesión expirada. Por favor, inicie sesión nuevamente.")
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("UserProfile: Response data:", data)

      if (data.success) {
        setUserData(data.user)
        setOrderStats(data.orderStats)
        setEditData(data.user)
      } else {
        throw new Error(data.error || "Failed to load user profile")
      }
    } catch (err: any) {
      setError(err.message)
      console.error("Error loading user profile:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadUserOrders = async () => {
    try {
      setOrdersLoading(true)
      setOrdersError("")

      if (!userData?.email) {
        console.log("No user email available for orders")
        return
      }

      console.log("Loading orders for user:", userData.email)

      // Construir parámetros de consulta
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        email: userData.email,
        include_items: "true",
      })

      if (statusFilter) {
        params.append("status", statusFilter)
      }

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim())
      }

      const response = await fetch(`${API_BASE_URL}/get_ordersuser.php?${params.toString()}`, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "Cache-Control": "no-cache",
        },
      })

      console.log("Orders response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Orders HTTP Error:", response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data: OrdersResponse = await response.json()
      console.log("Orders response data:", data)

      if (data.success) {
        setOrders(data.data || [])
        setTotalPages(data.pagination?.total_pages || 1)
        setTotalOrders(data.pagination?.total_orders || 0)

        // Actualizar estadísticas si están disponibles
        if (data.stats) {
          setOrderStats({
            total_orders: data.stats.total_orders,
            total_spent: data.stats.total_revenue,
            last_order_date: data.data?.[0]?.created_at || "",
          })
        }
      } else {
        throw new Error("Failed to load orders")
      }
    } catch (err: any) {
      setOrdersError(err.message)
      console.error("Error loading orders:", err)
    } finally {
      setOrdersLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const sessionToken = localStorage.getItem("user-session-token")

      if (!sessionToken) {
        throw new Error("No session token found")
      }

      const response = await fetch(`${API_BASE_URL}/update_user.php`, {
        method: "PUT",
        mode: "cors",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          sessionToken: sessionToken,
          firstName: editData.first_name,
          lastName: editData.last_name,
          phone: editData.phone,
          address: editData.address,
          city: editData.city,
          postalCode: editData.postal_code,
          canton: editData.canton,
          notes: editData.notes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setUserData((prev) => (prev ? { ...prev, ...editData } : null))
        setIsEditing(false)
      } else {
        throw new Error(data.error || "Failed to update user")
      }
    } catch (err: any) {
      alert(`Error updating profile: ${err.message}`)
      console.error("Error updating user:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Bitte geben Sie Ihr Passwort ein")
      return
    }

    try {
      setIsDeleting(true)
      setDeleteError("")
      const sessionToken = localStorage.getItem("user-session-token")

      if (!sessionToken) {
        throw new Error("No session token found")
      }

      console.log("🗑️ Iniciando eliminación de cuenta...")

      const response = await fetch(`${API_BASE_URL}/delete_user.php`, {
        method: "DELETE",
        mode: "cors",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          sessionToken: sessionToken,
          confirmPassword: deletePassword,
        }),
      })

      console.log("📡 Respuesta del servidor:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error HTTP:", response.status, errorText)

        if (response.status === 401) {
          throw new Error("Passwort ist falsch oder Sitzung ist abgelaufen")
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("✅ Respuesta de eliminación:", data)

      if (data.success) {
        localStorage.removeItem("user-session-token")
        localStorage.removeItem("cantina-customer-info")
        localStorage.removeItem("cantina-cart")

        setShowDeleteDialog(false)
        alert("Ihr Konto wurde erfolgreich gelöscht. Sie werden zur Startseite weitergeleitet.")

        if (onAccountDeleted) {
          onAccountDeleted()
        }

        onClose()

        setTimeout(() => {
          window.location.href = "/"
        }, 1000)
      } else {
        throw new Error(data.error || "Failed to delete account")
      }
    } catch (error: unknown) {
      console.error("❌ Error eliminando cuenta:", error)

      let errorMessage = "Error desconocido"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      if (errorMessage.includes("Passwort ist falsch")) {
        setDeleteError("Das eingegebene Passwort ist falsch")
      } else if (errorMessage.includes("Sitzung ist abgelaufen")) {
        setDeleteError("Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.")
      } else if (errorMessage.includes("Load failed") || errorMessage.includes("Failed to fetch")) {
        setDeleteError("Verbindungsfehler. Bitte versuchen Sie es erneut.")
      } else {
        setDeleteError(`Fehler beim Löschen des Kontos: ${errorMessage}`)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword.trim()) {
      setPasswordError("Bitte geben Sie Ihr aktuelles Passwort ein")
      return
    }

    if (!passwordData.newPassword.trim()) {
      setPasswordError("Bitte geben Sie ein neues Passwort ein")
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError("Das neue Passwort muss mindestens 8 Zeichen lang sein")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Die neuen Passwörter stimmen nicht überein")
      return
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError("Das neue Passwort muss sich vom aktuellen unterscheiden")
      return
    }

    try {
      setIsChangingPassword(true)
      setPasswordError("")
      const sessionToken = localStorage.getItem("user-session-token")

      if (!sessionToken) {
        throw new Error("No session token found")
      }

      console.log("🔑 Iniciando cambio de contraseña...")

      const response = await fetch(`${API_BASE_URL}/change_password.php`, {
        method: "PUT",
        mode: "cors",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          sessionToken: sessionToken,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      })

      console.log("📡 Respuesta del servidor:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error HTTP:", response.status, errorText)

        if (response.status === 401) {
          throw new Error("Das aktuelle Passwort ist falsch oder die Sitzung ist abgelaufen")
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("✅ Respuesta de cambio de contraseña:", data)

      if (data.success) {
        setShowPasswordDialog(false)
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })

        alert("Ihr Passwort wurde erfolgreich geändert!")
      } else {
        throw new Error(data.error || "Failed to change password")
      }
    } catch (error: unknown) {
      console.error("❌ Error cambiando contraseña:", error)

      let errorMessage = "Error desconocido"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      if (errorMessage.includes("aktuelle Passwort ist falsch")) {
        setPasswordError("Das aktuelle Passwort ist falsch")
      } else if (errorMessage.includes("Sitzung ist abgelaufen")) {
        setPasswordError("Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.")
      } else if (errorMessage.includes("Load failed") || errorMessage.includes("Failed to fetch")) {
        setPasswordError("Verbindungsfehler. Bitte versuchen Sie es erneut.")
      } else {
        setPasswordError(`Fehler beim Ändern des Passworts: ${errorMessage}`)
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleCancel = () => {
    setEditData(userData || {})
    setIsEditing(false)
  }

  const openDeleteDialog = () => {
    setShowDeleteDialog(true)
    setDeletePassword("")
    setDeleteError("")
  }

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false)
    setDeletePassword("")
    setDeleteError("")
  }

  const openPasswordDialog = () => {
    setShowPasswordDialog(true)
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    setPasswordError("")
  }

  const closePasswordDialog = () => {
    setShowPasswordDialog(false)
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    setPasswordError("")
  }

  const getVisibleNotes = (notes: string) =>
    notes
      .split("\n")
      .filter(
        (l) =>
          !l.startsWith("Kauf auf Rechnung") &&
          !l.startsWith("Stock actualizado") &&
          !l.startsWith("PayPal Payer ID")
      )
      .join("\n")
      .trim()

  const downloadInvoicePDF = async (order: Order) => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

    const pageW = doc.internal.pageSize.getWidth()
    const margin = 15

    // --- Logo ---
    try {
      const img = new window.Image()
      img.src = "/Secuxrity_n.jpg"
      await new Promise<void>((res) => {
        img.onload = () => res()
        img.onerror = () => res()
      })
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth || 1
      canvas.height = img.naturalHeight || 1
      canvas.getContext("2d")?.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL("image/jpeg")
      const logoH = 20
      const logoW = img.naturalWidth ? (img.naturalWidth / img.naturalHeight) * logoH : logoH
      doc.addImage(dataUrl, "JPEG", margin, 10, logoW, logoH)
    } catch (_) {/* kein Logo */}

    // --- Firmendaten (links, unter Logo) ---
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(44, 95, 46)
    doc.text("Sabitas", margin, 36)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text("FOTOGRAFIE-EDITIONEN", margin, 41)
    doc.text("9608 Ganterschwil", margin, 46)
    doc.text("Tel: 000 000 00 00", margin, 51)
    doc.text("hallo@sabitas.ch", margin, 56)

    // --- Titel Rechnung (rechts) ---
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(44, 95, 46)
    doc.text("RECHNUNG", pageW - margin, 36, { align: "right" })

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Bestellnummer: ${order.order_number}`, pageW - margin, 43, { align: "right" })
    doc.text(`Rechnungsnummer: #FA${String(order.order_number).padStart(8, '0')}`, pageW - margin, 49, { align: "right" })
    doc.text(`Datum: ${formatDate(order.created_at)}`, pageW - margin, 55, { align: "right" })

    // --- Trennlinie ---
    doc.setDrawColor(44, 95, 46)
    doc.setLineWidth(0.5)
    doc.line(margin, 62, pageW - margin, 62)

    // --- Kundendaten ---
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    doc.text("Lieferadresse:", margin, 70)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    const lines = [
      `${order.customer_first_name} ${order.customer_last_name}`,
      order.customer_address,
      `${order.customer_postal_code} ${order.customer_city}`,
      order.customer_canton,
      order.customer_email,
      order.customer_phone,
    ].filter(Boolean)
    lines.forEach((l, i) => doc.text(l, margin, 77 + i * 5.5))

    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(40, 40, 40)
    doc.text("Rechnungsadresse:", pageW / 2 + 5, 70)
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(100, 100, 100)
    doc.text("(identisch mit Lieferadresse)", pageW / 2 + 5, 76)

    // Zahlungsstatus unter RECHNUNG-Titel
    const payStatusLabel = order.payment_status === "completed" ? "Bezahlt" : order.payment_status === "pending" ? "Ausstehend" : order.payment_status === "failed" ? "Fehlgeschlagen" : order.payment_status
    const payStatusColor: [number, number, number] = order.payment_status === "completed" ? [44, 95, 46] : order.payment_status === "failed" ? [180, 0, 0] : [180, 130, 0]
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...payStatusColor)
    doc.text(`Zahlungsstatus: ${payStatusLabel}`, pageW - margin, 84, { align: "right" })
    doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal")
    doc.text(`Zahlung: ${order.payment_method}`, pageW - margin, 90, { align: "right" })
    doc.setTextColor(40, 40, 40)

    // --- Artikeltabelle ---
    let y = 118
    doc.setFillColor(44, 95, 46)
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.rect(margin, y, pageW - margin * 2, 8, "F")
    doc.text("Artikel", margin + 2, y + 5.5)
    const colQty   = 125
    const colPrice = 165
    const colTotal = pageW - margin - 8

    doc.text("Menge", colQty, y + 5.5)
    doc.text("Stückpreis", colPrice, y + 5.5, { align: "right" })
    doc.text("Gesamt", colTotal, y + 5.5, { align: "right" })
    y += 10

    doc.setFont("helvetica", "normal")
    doc.setTextColor(40, 40, 40)
    const items = order.items || []
    items.forEach((item, idx) => {
      const subtotal = Number(item.subtotal) || 0
      const itemMwst = Math.round(subtotal * 0.081 / 0.05) * 0.05
      const rowH = 18
      if (idx % 2 === 0) {
        doc.setFillColor(245, 248, 245)
        doc.rect(margin, y - 2, pageW - margin * 2, rowH, "F")
      }
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

    // --- Totales ---
    y += 4
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    const itemsSubtotal = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
    const onlyGutscheine = items.length > 0 && items.every(i => Number(i.product_id) < 0)
    const shipping = onlyGutscheine ? 0 : (Number(order.shipping_cost) || 0)
    const mwstAmount = onlyGutscheine ? 0 : Math.round(itemsSubtotal * 0.081 / 0.05) * 0.05
    const grossTotal = itemsSubtotal + shipping + mwstAmount
    const roundedTotal = onlyGutscheine ? itemsSubtotal : Math.ceil(grossTotal / 0.5) * 0.5

    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(40, 40, 40)
    doc.text("Zwischensumme (Artikel):", pageW - 75, y)
    doc.text(`${itemsSubtotal.toFixed(2)} CHF`, pageW - margin, y, { align: "right" })
    y += 6
    if (!onlyGutscheine) {
      doc.text("MwSt. 8.1%:", pageW - 75, y)
      doc.text(`${mwstAmount.toFixed(2)} CHF`, pageW - margin, y, { align: "right" })
      y += 6
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

    // --- Footer ---
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text("Vielen Dank für Ihren Einkauf!", pageW / 2, 285, { align: "center" })

    doc.save(`Rechnung_${order.order_number}.pdf`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const toggleOrderItems = (orderId: number) => {
    setShowOrderItems((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }))
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handleRefreshOrders = () => {
    loadUserOrders()
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value === "all" ? "" : value)
    setCurrentPage(1) // Reset to first page when filtering
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-n-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
              <p className="text-gray-600">Lade Benutzerprofil...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full">
              <CardContent className="text-center p-8">
                <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-700 mb-2">Fehler</h2>
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={onClose} className="bg-red-600 hover:bg-red-700">
                  Zurück
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/80">
      <div className="flex flex-col">
        {/* Modern Header */}
        <div className="sticky top-0 z-30 flex-shrink-0">
          <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
            <div className="px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-brand hover:text-white transition-all flex-shrink-0"
                    type="button"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand-mid rounded-xl flex items-center justify-center shadow-sm shadow-green-500/20">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base font-black text-gray-900 tracking-tight">Mein Profil</h1>
                    <p className="text-xs text-gray-400">{userData?.email}</p>
                  </div>
                </div>

                <div />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-gray-50/80">
          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <div className="max-w-6xl mx-auto">

              {/* Stats Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-lg shadow-blue-500/20">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
                  <div className="relative">
                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-2">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <p className="text-3xl font-black">{totalOrders || 0}</p>
                    <p className="text-xs text-blue-100 mt-0.5">Bestellungen</p>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-lg shadow-emerald-500/20">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
                  <div className="relative">
                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-2">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <p className="text-3xl font-black">{Math.round(Number(orderStats?.total_spent) || 0)}</p>
                    <p className="text-xs text-emerald-100 mt-0.5">CHF ausgegeben</p>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-4 text-white shadow-lg shadow-violet-500/20">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
                  <div className="relative">
                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-2">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-black mt-1">{userData?.created_at ? new Date(userData.created_at).toLocaleDateString("de-CH") : "-"}</p>
                    <p className="text-xs text-violet-100 mt-0.5">Mitglied seit</p>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-white shadow-lg shadow-amber-500/20">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
                  <div className="relative">
                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-2">
                      <Clock className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-black mt-1">{orderStats?.last_order_date ? new Date(orderStats.last_order_date).toLocaleDateString("de-CH") : "-"}</p>
                    <p className="text-xs text-amber-100 mt-0.5">Letzte Bestellung</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Info */}
                <div className="lg:col-span-1 space-y-5">
                  {/* Personal Data */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-gray-50/80 to-transparent border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm">Persönliche Daten</h3>
                      </div>
                      {!isEditing ? (
                        <Button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }}
                          size="sm"
                          type="button"
                          className="rounded-lg text-xs h-8 px-3 bg-blue-50 text-blue-600 hover:bg-blue-100 border-0 shadow-none"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          Bearbeiten
                        </Button>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }}
                            disabled={isSaving}
                            size="sm"
                            type="button"
                            className="rounded-lg text-xs h-8 px-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-0 shadow-none"
                          >
                            <Save className="w-3.5 h-3.5 mr-1" />
                            {isSaving ? "..." : "Speichern"}
                          </Button>
                          <Button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancel(); }}
                            size="sm"
                            type="button"
                            className="rounded-lg text-xs h-8 w-8 p-0 bg-gray-100 text-gray-500 hover:bg-gray-200 border-0 shadow-none"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-400 font-medium">Vorname</Label>
                          {isEditing ? (
                            <Input id="firstName" value={editData.first_name || ""} onChange={(e) => setEditData((prev) => ({ ...prev, first_name: e.target.value }))} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                          ) : (
                            <p className="text-sm font-medium text-gray-800 mt-1">{userData?.first_name}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400 font-medium">Nachname</Label>
                          {isEditing ? (
                            <Input id="lastName" value={editData.last_name || ""} onChange={(e) => setEditData((prev) => ({ ...prev, last_name: e.target.value }))} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                          ) : (
                            <p className="text-sm font-medium text-gray-800 mt-1">{userData?.last_name}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 font-medium">E-Mail</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-sm text-gray-600">{userData?.email}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 font-medium">Telefon</Label>
                        {isEditing ? (
                          <Input id="phone" value={editData.phone || ""} onChange={(e) => setEditData((prev) => ({ ...prev, phone: e.target.value }))} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" placeholder="+41 XX XXX XX XX" />
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-sm text-gray-800">{userData?.phone || "-"}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-gray-50/80 to-transparent border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm">Adresse</h3>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <div>
                        <Label className="text-xs text-gray-400 font-medium">Strasse</Label>
                        {isEditing ? (
                          <Input id="address" value={editData.address || ""} onChange={(e) => setEditData((prev) => ({ ...prev, address: e.target.value }))} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                        ) : (
                          <p className="text-sm font-medium text-gray-800 mt-1">{userData?.address || "-"}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-400 font-medium">PLZ</Label>
                          {isEditing ? (
                            <Input id="postalCode" value={editData.postal_code || ""} onChange={(e) => setEditData((prev) => ({ ...prev, postal_code: e.target.value }))} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" placeholder="1234" />
                          ) : (
                            <p className="text-sm font-medium text-gray-800 mt-1">{userData?.postal_code || "-"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400 font-medium">Stadt</Label>
                          {isEditing ? (
                            <Input id="city" value={editData.city || ""} onChange={(e) => setEditData((prev) => ({ ...prev, city: e.target.value }))} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" />
                          ) : (
                            <p className="text-sm font-medium text-gray-800 mt-1">{userData?.city || "-"}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 font-medium">Kanton</Label>
                        {isEditing ? (
                          <Input id="canton" value={editData.canton || ""} onChange={(e) => setEditData((prev) => ({ ...prev, canton: e.target.value }))} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" placeholder="z.B. Zürich, Bern..." />
                        ) : (
                          <p className="text-sm font-medium text-gray-800 mt-1">{userData?.canton || "-"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 font-medium">Anmerkungen</Label>
                        {isEditing ? (
                          <Textarea id="notes" value={editData.notes || ""} onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))} className="bg-gray-50/80 border-gray-200 rounded-xl mt-1 focus:bg-white" rows={2} placeholder="Lieferhinweise..." />
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">{userData?.notes || "Keine"}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-emerald-50/60 to-transparent border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Lock className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm">Sicherheit</h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <Button onClick={openPasswordDialog} className="w-full bg-gradient-to-r from-brand to-brand-mid hover:from-brand-dark hover:to-brand text-white rounded-xl shadow-sm shadow-green-500/20" size="sm">
                        <Lock className="w-4 h-4 mr-2" />
                        Passwort ändern
                      </Button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-red-50/60 to-transparent border-b border-red-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <h3 className="font-bold text-red-600 text-sm">Gefahrenzone</h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-gray-500 mb-3">Das Löschen ist unwiderruflich.</p>
                      <Button onClick={openDeleteDialog} variant="destructive" className="w-full bg-red-500 hover:bg-red-600 rounded-xl" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Konto löschen
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Orders Section */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-gray-50/80 to-transparent border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">Meine Bestellungen</h3>
                          <p className="text-[10px] text-gray-400">{totalOrders} Gesamt</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleRefreshOrders}
                        variant="outline"
                        size="sm"
                        disabled={ordersLoading}
                        className="rounded-xl border-gray-200 text-gray-500 hover:bg-gray-50 h-8"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                    <div className="p-5">
                      {/* Search */}
                      <div className="mb-5">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Bestellnummer oder Produkt suchen..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10 bg-gray-50/80 border-gray-200 rounded-xl h-10 focus:bg-white transition-colors"
                          />
                        </div>
                      </div>

                      {/* Orders Loading */}
                      {ordersLoading && (
                        <div className="space-y-3">
                          {[0,1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
                        </div>
                      )}

                      {/* Orders Error */}
                      {ordersError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                          <div>
                            <p className="text-red-700 font-medium text-sm">Fehler beim Laden</p>
                            <p className="text-red-500 text-xs mt-0.5">{ordersError}</p>
                          </div>
                        </div>
                      )}

                      {/* Orders List */}
                      {!ordersLoading && !ordersError && (
                        <>
                          {orders.length > 0 ? (
                            <div className="space-y-3">
                              {orders.map((order) => (
                                <div key={order.id} className="rounded-xl border border-gray-100 bg-white hover:shadow-md transition-shadow overflow-hidden">
                                  <div className="p-4">
                                    {/* Order header row */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                          order.status === "completed" ? "bg-emerald-100 text-emerald-600" :
                                          order.status === "processing" ? "bg-blue-100 text-blue-600" :
                                          order.status === "cancelled" ? "bg-red-100 text-red-600" :
                                          "bg-amber-100 text-amber-600"
                                        }`}>
                                          {order.status === "completed" ? <CheckCircle className="w-4 h-4" /> :
                                           order.status === "processing" ? <Truck className="w-4 h-4" /> :
                                           order.status === "cancelled" ? <X className="w-4 h-4" /> :
                                           <Clock className="w-4 h-4" />}
                                        </div>
                                        <div>
                                          <h4 className="font-bold text-sm text-gray-900">{order.order_number}</h4>
                                          <p className="text-[10px] text-gray-400">{formatDate(order.created_at)}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-black text-base text-gray-900">{(Number(order.total_amount) || 0).toFixed(2)} <span className="text-xs text-gray-400 font-medium">CHF</span></p>
                                        <p className="text-[10px] text-gray-400">{order.items_count} Artikel</p>
                                      </div>
                                    </div>

                                    {/* Badges row */}
                                    <div className="flex items-center gap-2 flex-wrap mb-3">
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                        order.status === "completed" ? "bg-emerald-50 text-emerald-600" :
                                        order.status === "processing" ? "bg-blue-50 text-blue-600" :
                                        order.status === "cancelled" ? "bg-red-50 text-red-600" :
                                        "bg-amber-50 text-amber-600"
                                      }`}>
                                        {getStatusText(order.status)}
                                      </span>
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                        order.payment_status === "completed" ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" :
                                        order.payment_status === "failed" ? "bg-red-50 text-red-600 ring-1 ring-red-200" :
                                        "bg-amber-50 text-amber-600 ring-1 ring-amber-200"
                                      }`}>
                                        <CreditCard className="w-2.5 h-2.5" />
                                        {order.payment_status === "completed" ? "Bezahlt" : order.payment_status === "failed" ? "Fehlgeschlagen" : "Ausstehend"}
                                      </span>
                                      <span className="text-[10px] text-gray-400">{order.payment_method}</span>
                                    </div>

                                    {getVisibleNotes(order.customer_notes || "") && (
                                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">{getVisibleNotes(order.customer_notes || "")}</p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                                      <Button onClick={() => toggleOrderItems(order.id)} size="sm" className="rounded-lg text-xs h-8 px-3 bg-blue-50 text-blue-600 hover:bg-blue-100 border-0 shadow-none">
                                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                                        {showOrderItems[order.id] ? "Ausblenden" : "Artikel"}
                                      </Button>
                                      <Button onClick={() => downloadInvoicePDF(order)} size="sm" className="rounded-lg text-xs h-8 px-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-0 shadow-none">
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        PDF
                                      </Button>
                                    </div>

                                    {/* Order Items */}
                                    {showOrderItems[order.id] && order.items && order.items.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                                        {order.items.map((item, index) => (
                                          <div key={index} className="flex items-center justify-between bg-gray-50/80 rounded-lg px-3 py-2">
                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-semibold text-gray-800 truncate">{item.product_name}</p>
                                              <p className="text-[10px] text-gray-400">{item.quantity}x {(Number(item.price) || 0).toFixed(2)} CHF</p>
                                            </div>
                                            <p className="text-xs font-bold text-gray-900 ml-3">{(Number(item.subtotal) || 0).toFixed(2)} CHF</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {/* Pagination */}
                              {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4">
                                  <p className="text-xs text-gray-400">Seite {currentPage}/{totalPages}</p>
                                  <div className="flex items-center gap-2">
                                    <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} variant="outline" size="sm" className="rounded-xl h-8 border-gray-200">
                                      <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">{currentPage}</span>
                                    <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} variant="outline" size="sm" className="rounded-xl h-8 border-gray-200">
                                      <ChevronRight className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12">
                              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                                <Package className="w-7 h-7 text-gray-300" />
                              </div>
                              <p className="text-gray-500 font-medium text-sm">Keine Bestellungen</p>
                              {searchTerm || statusFilter ? (
                                <Button onClick={() => { setSearchTerm(""); setStatusFilter(""); setCurrentPage(1) }} variant="ghost" size="sm" className="mt-2 text-xs text-gray-400 hover:text-gray-600">
                                  Filter zurücksetzen
                                </Button>
                              ) : (
                                <p className="text-gray-400 text-xs mt-1">Noch keine Bestellungen aufgegeben</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      {showDeleteDialog && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md bg-white mx-4 max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Konto löschen
              </DialogTitle>
              <DialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden. Ihr Konto und alle damit verbundenen Daten werden
                permanent gelöscht.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 text-sm">
                    <li>Ihr Benutzerkonto und Profil</li>
                    <li>Alle Bestellungen und Bestellhistorie</li>
                    <li>Warenkorb und Favoriten</li>
                    <li>Alle Sitzungen und Anmeldedaten</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="deletePassword">Passwort zur Bestätigung</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Geben Sie Ihr Passwort ein"
                  className="bg-white"
                />
                {deleteError && <p className="text-sm text-red-600 mt-1">{deleteError}</p>}
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button onClick={closeDeleteDialog} variant="outline" className="w-full sm:w-auto">
                Abbrechen
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deletePassword.trim()}
                variant="destructive"
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Lösche Konto..." : "Konto endgültig löschen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Change Password Dialog */}
      {showPasswordDialog && (
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md bg-white mx-4 max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle className="flex items-center text-brand">
                <Lock className="w-5 h-5 mr-2" />
                Passwort ändern
              </DialogTitle>
              <DialogDescription>
                Geben Sie Ihr aktuelles Passwort ein und wählen Sie ein neues sicheres Passwort.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Ihr aktuelles Passwort"
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Mindestens 8 Zeichen"
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="confirmNewPassword">Neues Passwort bestätigen</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Neues Passwort wiederholen"
                  className="bg-white"
                />
              </div>

              {passwordError && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-600">{passwordError}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Passwort-Anforderungen:</strong>
                  <ul className="list-disc list-inside mt-2 text-sm">
                    <li>Mindestens 8 Zeichen lang</li>
                    <li>Unterschiedlich vom aktuellen Passwort</li>
                    <li>Verwenden Sie eine Kombination aus Buchstaben, Zahlen und Symbolen</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button onClick={closePasswordDialog} variant="outline" className="w-full sm:w-auto">
                Abbrechen
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={
                  isChangingPassword || !passwordData.currentPassword.trim() || !passwordData.newPassword.trim()
                }
                className="w-full sm:w-auto bg-brand hover:bg-brand-dark"
              >
                <Lock className="w-4 h-4 mr-2" />
                {isChangingPassword ? "Ändere Passwort..." : "Passwort ändern"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
