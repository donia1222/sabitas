"use client"

import { useState, useEffect, useMemo } from "react"
import { features } from "@/lib/features"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Package,
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  MapPin,
  User,
  UserPlus,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
  Minus,
  Plus,
  Flame,
  Truck,
  ReceiptText,
  Home,
  Landmark,
  Store,
  LogOut,
  Trash2,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ContactModal from "@/components/contact-modal"
import { UserProfile } from "./user-profile"
import { StripePayment } from "./stripe-payment"
import { StripeTwintPayment } from "./stripe-twint-payment"

interface Product {
  id: number
  name: string
  price: number
  image: string
  description: string
  heatLevel: number
  rating: number
  badge?: string
  origin?: string
  weight_kg?: number
  shipping_on_request?: number
}

interface CartItem extends Product {
  quantity: number
  image_url?: string
  image_url_candidates?: string[]
}

interface CheckoutPageProps {
  cart: CartItem[]
  onBackToStore: () => void
  onClearCart?: () => void
  onAddToCart?: (product: CartItem) => void
  onRemoveFromCart?: (productId: number) => void
}

interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  canton: string
  notes: string
  country: string
}

interface BillingAddress {
  firstName: string
  lastName: string
  address: string
  city: string
  postalCode: string
  canton: string
}

interface UserData {
  id?: number
  email: string
  firstName: string
  lastName: string
  phone: string
  address: string
  city: string
  postalCode: string
  canton: string
  notes: string
}

// ⚠️ Cambiar a false para reactivar la tienda
const STORE_UNDER_MAINTENANCE = false

export function CheckoutPage({ cart, onBackToStore, onClearCart, onAddToCart, onRemoveFromCart }: CheckoutPageProps) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    canton: "",
    notes: "",
    country: "CH",
  })

  const [orderStatus, setOrderStatus] = useState<"pending" | "processing" | "completed" | "error">("pending")
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [formErrors, setFormErrors] = useState<Partial<CustomerInfo>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  // Los ajustes del sitio, para el numero de WhatsApp. Mismo patron que el hero.
  const [siteContent, setSiteContent] = useState<Record<string, string>>({})
  useEffect(() => {
    fetch(`/api/site-settings`)
      .then((r) => r.json())
      .then((data) => { if (data.success && data.settings) setSiteContent(data.settings) })
      .catch(() => {})
  }, [])

  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "invoice" | "stripe" | "twint" | "twint_stripe" | "pickup">("invoice")

  // Billing address states
  const [useDifferentBillingAddress, setUseDifferentBillingAddress] = useState(false)
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    canton: "",
  })
  const [billingErrors, setBillingErrors] = useState<Partial<BillingAddress>>({})

  // User account states
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [createAccountData, setCreateAccountData] = useState({
    password: "",
    confirmPassword: "",
    saveData: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [accountErrors, setAccountErrors] = useState<any>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)
  const router = useRouter()
  const [showUserProfile, setShowUserProfile] = useState(false)

  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [accountCreationStatus, setAccountCreationStatus] = useState<"idle" | "success" | "error">("idle")
  const [accountCreationMessage, setAccountCreationMessage] = useState("")

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

  // Login states
  const [showLogin, setShowLogin] = useState(false)
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  })
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginErrors, setLoginErrors] = useState<any>({})
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginStatus, setLoginStatus] = useState<"idle" | "success" | "error">("idle")
  const [loginMessage, setLoginMessage] = useState("")

  // Shipping states
  const [shippingCost, setShippingCost]     = useState(0)
  const [shippingInfo, setShippingInfo]     = useState({ zone: "", range: "" })
  const [enabledCountries, setEnabledCountries] = useState<string[]>(["CH"])

  // Payment settings
  const [paySettings, setPaySettings] = useState({
    enable_paypal: false, enable_stripe: false, enable_twint: false, enable_invoice: true, enable_pickup: false,
    paypal_email: "", stripe_publishable_key: "", stripe_secret_key: "", stripe_pmc_id: "", twint_phone: "",
    bank_iban: "", bank_holder: "", bank_name: "",
  })

  // Stripe payment states
  const [stripePaymentStatus, setStripePaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle")
  const [stripeError, setStripeError] = useState("")

  // Password Reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetStatus, setResetStatus] = useState<"idle" | "success" | "error">("idle")
  const [resetMessage, setResetMessage] = useState("")
  const [resetErrors, setResetErrors] = useState<any>({})

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  // Load payment settings + enabled countries on mount
  useEffect(() => {
    // Payment settings
    fetch(`/api/payment-settings`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.settings) {
          const s = data.settings
          setPaySettings(s)
          // Auto-select first active method: invoice > paypal > stripe > twint
          if (s.enable_invoice)      setPaymentMethod("invoice")
          else if (s.enable_paypal)  setPaymentMethod("paypal")
          else if (s.enable_stripe)  setPaymentMethod("stripe")
          else if (s.enable_twint)   setPaymentMethod("twint" as any)
          else if (s.enable_pickup)  setPaymentMethod("pickup")
        }
      })
      .catch(() => {})

    // Shipping countries
    fetch(`/api/shipping-settings`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.zones) {
          const countries: string[] = []
          let hasWildcard = false
          for (const z of data.zones) {
            if (!z.enabled) continue
            if (z.countries === "*") { hasWildcard = true; continue }
            z.countries.split(",").map((c: string) => c.trim()).forEach((c: string) => {
              if (c && !countries.includes(c)) countries.push(c)
            })
          }
          if (hasWildcard) countries.push("OTHER")
          if (countries.length > 0) {
            setEnabledCountries(countries)
            setCustomerInfo(prev => ({
              ...prev,
              country: countries.includes(prev.country) ? prev.country : (countries[0] || "CH"),
            }))
          }
        }
      })
      .catch(() => {})
  }, [])

  // Detectar retorno desde Stripe TWINT (QR code flow)
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const redirectStatus = params.get("redirect_status")
    const twintOrder = params.get("twint_order")
    const twintTotal = params.get("twint_total")
    if (redirectStatus === "succeeded" && twintOrder) {
      setOrderStatus("completed")
      setOrderDetails({
        id: twintOrder,
        status: "PAID",
        customerInfo: customerInfo,
        cart: [],
        total: twintTotal ? parseFloat(twintTotal) : 0,
      })
      if (onClearCart) onClearCart()
      window.history.replaceState({}, "", window.location.pathname)
    } else if (redirectStatus === "failed" && twintOrder) {
      setOrderStatus("error")
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  // Recalculate shipping when cart or country changes
  useEffect(() => {
    if (cart.length === 0) { setShippingCost(0); setShippingInfo({ zone: "", range: "" }); return }
    // Abholung im Geschäft: kein Versand
    if (paymentMethod === "pickup") { setShippingCost(0); setShippingInfo({ zone: "", range: "" }); return }
    // Gift cards (item_type === "gutschein") have no shipping cost
    const onlyGutscheine = cart.every(item => (item as any).item_type === "gutschein")
    if (onlyGutscheine) { setShippingCost(0); setShippingInfo({ zone: "", range: "" }); return }
    // Productos "Versand auf Anfrage": no suman envío. Si TODO el carrito es así, envío 0.
    const onlyOnRequest = cart.length > 0 && cart.every(item => item.shipping_on_request)
    if (onlyOnRequest) { setShippingCost(0); setShippingInfo({ zone: "", range: "" }); return }
    const totalWeight = cart.reduce((sum, item) => sum + (item.shipping_on_request ? 0 : (item.weight_kg ?? 0.5)) * item.quantity, 0)
    fetch(`${API_BASE_URL}/calculate_shipping.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: customerInfo.country, weight_kg: totalWeight }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setShippingCost(data.price ?? 0)
          setShippingInfo({ zone: data.zone ?? "", range: data.range ?? "" })
        }
      })
      .catch(() => {})
  }, [cart, customerInfo.country, paymentMethod])

  // Check if user is logged in on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log("🔍 CheckoutPage: Inicializando autenticación...")
      const sessionToken = localStorage.getItem("user-session-token")

      if (sessionToken) {
        console.log("🎫 Token encontrado:", sessionToken.substring(0, 20) + "...")

        const isValid = await verifyAndLoadUser(sessionToken)
        if (!isValid) {
          console.log("❌ Token inválido, limpiando...")
          localStorage.removeItem("user-session-token")
          loadSavedCustomerInfo()
        }
      } else {
        console.log("❌ No hay token, cargando info guardada...")
        loadSavedCustomerInfo()
      }
    }

    initializeAuth()
  }, [])

  const verifyAndLoadUser = async (sessionToken: string): Promise<boolean> => {
    try {
      console.log("🔄 Verificando token con el servidor...")

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

      console.log("📡 Respuesta del servidor:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error HTTP:", response.status, errorText)
        return false
      }

      const data = await response.json()
      console.log("✅ Datos del usuario recibidos:", data)

      if (data.success && data.user) {
        setIsLoggedIn(true)
        setCurrentUser({
          id: data.user.user_id || data.user.id,
          email: data.user.email,
          firstName: data.user.first_name || "",
          lastName: data.user.last_name || "",
          phone: data.user.phone || "",
          address: data.user.address || "",
          city: data.user.city || "",
          postalCode: data.user.postal_code || "",
          canton: data.user.canton || "",
          notes: data.user.notes || "",
        })

        // Auto-fill form with user data
        setCustomerInfo({
          firstName: data.user.first_name || "",
          lastName: data.user.last_name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          address: data.user.address || "",
          city: data.user.city || "",
          postalCode: data.user.postal_code || "",
          canton: data.user.canton || "",
          country: data.user.country || "CH",
          notes: data.user.notes || "",
        })

        setShowCreateAccount(false)
        setAccountCreationStatus("idle")

        console.log("✅ Usuario logueado exitosamente")
        return true
      } else {
        console.error("❌ Respuesta inválida del servidor:", data)
        return false
      }
    } catch (error) {
      console.error("❌ Error verificando token:", error)
      return false
    }
  }

  const reloadUserData = async () => {
    console.log("🔄 Recargando datos del usuario...")
    const sessionToken = localStorage.getItem("user-session-token")

    if (sessionToken && isLoggedIn) {
      const isValid = await verifyAndLoadUser(sessionToken)
      if (isValid) {
        console.log("✅ Datos del usuario recargados exitosamente")
      }
    }
  }

  const loadSavedCustomerInfo = () => {
    const savedCustomerInfo = localStorage.getItem("cantina-customer-info")
    if (savedCustomerInfo) {
      try {
        const parsedInfo = JSON.parse(savedCustomerInfo)
        setCustomerInfo(parsedInfo)
        console.log("✅ Info del cliente cargada desde localStorage")
      } catch (error) {
        console.error("❌ Error cargando info del cliente:", error)
      }
    }
  }

  // Save user data to localStorage whenever it changes (only if not logged in)
  useEffect(() => {
    if (!isLoggedIn) {
      const hasData = Object.values(customerInfo).some((value) => value.trim() !== "")
      if (hasData) {
        localStorage.setItem("cantina-customer-info", JSON.stringify(customerInfo))
      }
    }
  }, [customerInfo, isLoggedIn])

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getShippingCost = () => paymentMethod === "pickup" ? 0 : shippingCost

  const isOnlyGutscheine = () => cart.length > 0 && cart.every(item => (item as any).item_type === "gutschein")
const getFinalTotal = () => (isOnlyGutscheine() || paymentMethod === "pickup") ? getTotalPrice() : Math.ceil((getTotalPrice() + shippingCost) / 0.5) * 0.5

  const createUserAccount = async () => {
    try {
      setIsCreatingAccount(true)
      setAccountCreationStatus("idle")

      console.log("🔄 Creando cuenta de usuario...")

      const requestData = {
        email: customerInfo.email,
        password: createAccountData.password,
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        phone: customerInfo.phone,
        address: customerInfo.address,
        city: customerInfo.city,
        postalCode: customerInfo.postalCode,
        canton: customerInfo.canton,
        notes: customerInfo.notes,
      }

      console.log("📤 Enviando datos:", requestData)

      const response = await fetch(`${API_BASE_URL}/create_user.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestData),
      })

      console.log("📡 Respuesta recibida:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error HTTP:", response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("✅ Respuesta de creación de cuenta:", result)

      if (result.success && result.sessionToken) {
        const sessionToken = result.sessionToken
        console.log("💾 Guardando token:", sessionToken.substring(0, 20) + "...")
        localStorage.setItem("user-session-token", sessionToken)

        // Configurar directamente el estado del usuario
        setIsLoggedIn(true)
        setCurrentUser({
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName || "",
          lastName: result.user.lastName || "",
          phone: result.user.phone || "",
          address: result.user.address || "",
          city: result.user.city || "",
          postalCode: result.user.postalCode || "",
          canton: result.user.canton || "",
          notes: result.user.notes || "",
        })

        setAccountCreationStatus("success")
        setAccountCreationMessage("¡Cuenta creada exitosamente! Ahora estás conectado.")
        setShowCreateAccount(false)

        setCreateAccountData({
          password: "",
          confirmPassword: "",
          saveData: false,
        })

        return result.user.id
      } else {
        throw new Error(result.error || "Error creating account")
      }
    } catch (error: unknown) {
      console.error("❌ Error creando cuenta:", error)
      setAccountCreationStatus("error")

      let errorMessage = "Error desconocido"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      // Mensajes más específicos para errores comunes
      if (errorMessage.includes("Load failed") || errorMessage.includes("Failed to fetch")) {
        errorMessage = "Error de conexión. Verifique su conexión a internet y que el servidor esté disponible."
      } else if (errorMessage.includes("CORS")) {
        errorMessage = "Error de configuración del servidor (CORS). Contacte al administrador."
      }

      setAccountCreationMessage(`Error al crear la cuenta: ${errorMessage}`)
      throw error
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const saveOrderToDatabase = async (orderDataOverrides = {}) => {
    try {
      let userId = null

      // Create user account if requested
      if (showCreateAccount && createAccountData.saveData && !isLoggedIn) {
        userId = await createUserAccount()
      }

      const orderData = getOrderData({
        userId: currentUser?.id || null,
        ...orderDataOverrides
      })

      const response = await fetch(`${API_BASE_URL}/add_order.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Error saving order")
      }

      return result.data
    } catch (error) {
      console.error("Error saving order to database:", error)
      throw error
    }
  }

  const handlePayPalPayment = () => {
    if (!validateForm()) {
      return
    }

    if (!validateBillingAddress()) {
      return
    }

    if (showCreateAccount && !validateAccountCreation()) {
      return
    }

    // CRÍTICO: Asegurar que los datos estén guardados antes de ir a PayPal
    const customerData = {
      firstName: customerInfo.firstName,
      lastName: customerInfo.lastName,
      email: customerInfo.email,
      phone: customerInfo.phone,
      address: customerInfo.address,
      city: customerInfo.city,
      postalCode: customerInfo.postalCode,
      canton: customerInfo.canton,
      notes: customerInfo.notes,
      accountPassword: showCreateAccount ? createAccountData.password : "",
      billingAddress: useDifferentBillingAddress ? {
        firstName: billingAddress.firstName,
        lastName: billingAddress.lastName,
        address: billingAddress.address,
        city: billingAddress.city,
        postalCode: billingAddress.postalCode,
        canton: billingAddress.canton,
      } : null,
    }

    // Guardar en localStorage Y sessionStorage para máxima seguridad
    localStorage.setItem("cantina-customer-info", JSON.stringify(customerData))
    sessionStorage.setItem("cantina-customer-info", JSON.stringify(customerData))
    
    // Asegurar que el carrito esté guardado también
    localStorage.setItem("cantina-cart", JSON.stringify(cart))
    sessionStorage.setItem("cantina-cart", JSON.stringify(cart))

    // Crear un ID único para este pedido
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Guardar datos del pedido con ID único para recuperación garantizada
    const orderData = {
      orderId,
      customerInfo: customerData,
      cart: cart,
      total: getFinalTotal(),
      timestamp: new Date().toISOString()
    }
    
    localStorage.setItem(`cantina-order-${orderId}`, JSON.stringify(orderData))
    sessionStorage.setItem(`cantina-order-${orderId}`, JSON.stringify(orderData))
    localStorage.setItem("cantina-current-order-id", orderId)
    sessionStorage.setItem("cantina-current-order-id", orderId)


    const total = getFinalTotal()
    const paypalEmail = paySettings.paypal_email || "info@cantinatexmex.ch"
    const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(paypalEmail)}&amount=${total.toFixed(2)}&currency_code=CHF&item_name=Sabitas Order&custom=${orderId}&return=${window.location.origin}/success&cancel_return=${window.location.origin}/cancel`

    setOrderStatus("processing")
    // USAR LA MISMA PESTAÑA para que localStorage esté disponible
    window.location.href = paypalUrl
  }

  const handleInvoicePayment = async () => {
    if (!validateForm()) {
      return
    }

    if (!validateBillingAddress()) {
      return
    }

    if (showCreateAccount && !validateAccountCreation()) {
      return
    }

    setIsSubmitting(true)

    try {
      const savedOrder = await saveOrderToDatabase()

      setOrderStatus("completed")
      setOrderDetails({
        id: savedOrder.orderNumber,
        status: "INVOICE_SENT",
        customerInfo: customerInfo,
        cart: cart,
        total: getFinalTotal(),
        createdAt: savedOrder.createdAt,
      })

      if (onClearCart) {
        onClearCart()
      }

      localStorage.removeItem("cantina-cart")
    } catch (error: any) {
      console.error("Error saving order:", error)
      alert(`Error al guardar el pedido: ${error.message}`)
      setOrderStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePickupOrder = async () => {
    if (!validateForm()) return
    if (showCreateAccount && !validateAccountCreation()) return

    setIsSubmitting(true)
    try {
      const savedOrder = await saveOrderToDatabase({
        paymentMethod: "pickup",
        paymentStatus: "pending",
        shippingCost: 0,
      })

      setOrderStatus("completed")
      setOrderDetails({
        id: savedOrder.orderNumber,
        status: "PICKUP_RESERVED",
        customerInfo: customerInfo,
        cart: cart,
        total: getFinalTotal(),
        createdAt: savedOrder.createdAt,
      })

      if (onClearCart) onClearCart()
      localStorage.removeItem("cantina-cart")
    } catch (error: any) {
      console.error("Error saving pickup order:", error)
      alert(`Fehler beim Speichern der Bestellung: ${error.message}`)
      setOrderStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Guarda el pedido en DB antes de redirigir a Stripe TWINT
  const handleStripeTwintSaveOrder = async (): Promise<string> => {
    if (!validateForm()) throw new Error("Bitte füllen Sie alle Pflichtfelder aus")
    if (!validateBillingAddress()) throw new Error("Rechnungsadresse ungültig")
    if (showCreateAccount && !validateAccountCreation()) throw new Error("Konto-Daten ungültig")
    const savedOrder = await saveOrderToDatabase({
      paymentMethod: "stripe_twint",
      paymentStatus: "pending",
    })
    return savedOrder.orderNumber
  }

  const handleTwintPayment = async () => {
    if (!validateForm()) return
    if (!validateBillingAddress()) return
    if (showCreateAccount && !validateAccountCreation()) return

    setIsSubmitting(true)
    try {
      const savedOrder = await saveOrderToDatabase({
        paymentMethod: "twint",
        paymentStatus: "pending",
      })

      setOrderStatus("completed")
      setOrderDetails({
        id: savedOrder.orderNumber,
        status: "TWINT_PENDING",
        customerInfo: customerInfo,
        cart: cart,
        total: getFinalTotal(),
        createdAt: savedOrder.createdAt,
        twintPhone: paySettings.twint_phone,
      })

      if (onClearCart) onClearCart()
      localStorage.removeItem("cantina-cart")
    } catch (error: any) {
      console.error("Error saving TWINT order:", error)
      alert(`Fehler beim Speichern der Bestellung: ${error.message}`)
      setOrderStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentConfirmation = async (success: boolean) => {
    if (success) {
      setIsSubmitting(true)

      try {
        const savedOrder = await saveOrderToDatabase()

        setOrderStatus("completed")
        setOrderDetails({
          id: savedOrder.orderNumber,
          status: "COMPLETED",
          customerInfo: customerInfo,
          cart: cart,
          total: getFinalTotal(),
          createdAt: savedOrder.createdAt,
        })

        if (onClearCart) {
          onClearCart()
        }

        localStorage.removeItem("cantina-cart")
      } catch (error: any) {
        console.error("Error saving order:", error)
        alert(`Error al guardar el pedido: ${error.message}`)
        setOrderStatus("error")
      } finally {
        setIsSubmitting(false)
      }
    } else {
      setOrderStatus("error")
    }
  }

  const getOrderData = (overrides = {}) => {
    return {
      customerInfo: customerInfo,
      billingAddress: useDifferentBillingAddress ? billingAddress : null,
      cart: cart,
      totalAmount: getFinalTotal(),
      shippingCost: getShippingCost(),
      paymentMethod: paymentMethod,
      paymentStatus: (paymentMethod === "invoice" || paymentMethod === "pickup") ? "pending" : "completed",
      userId: currentUser?.id || null,
      ...overrides
    }
  }

  const handleStripeSuccess = async (paymentIntent: any) => {
    try {
      setStripePaymentStatus("success")
      setIsSubmitting(true)

      let userId = null

      // Create user account if requested
      if (showCreateAccount && createAccountData.saveData && !isLoggedIn) {
        userId = await createUserAccount()
      }

      // Actualizar orderData para incluir información de Stripe
      const stripeOrderData = {
        ...getOrderData(),
        paymentMethod: "stripe",
        paymentStatus: "completed",
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: paymentIntent.charges?.data?.[0]?.id || null,
        userId: userId || currentUser?.id || null
      }

      const savedOrder = await saveOrderToDatabase(stripeOrderData)
      setOrderStatus("completed")
      setOrderDetails({
        id: savedOrder.orderNumber,
        status: "COMPLETED",
        customerInfo: customerInfo,
        cart: cart,
        total: getFinalTotal(),        createdAt: savedOrder.createdAt,
        paymentMethod: "stripe",
        paymentId: paymentIntent.id
      })

      if (onClearCart) {
        onClearCart()
      }

      localStorage.removeItem("cantina-cart")
      console.log("✅ Stripe payment completed successfully:", paymentIntent.id)
    } catch (error: any) {
      console.error("❌ Error saving Stripe order:", error)
      setStripePaymentStatus("error")
      setStripeError(`Error al guardar el pedido: ${error.message}`)
      setOrderStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStripeError = (error: string) => {
    setStripePaymentStatus("error")
    setStripeError(error)
    console.error("❌ Stripe payment error:", error)
  }

  /**
   * Paquete 2: el pedido no se guarda en ninguna parte. Se arma un mensaje con
   * la cesta y se abre WhatsApp, igual que en su web de siempre pero con todo
   * dentro en vez de un producto suelto.
   *
   * El numero sale de los ajustes del sitio para que ella pueda cambiarlo desde
   * el panel sin tocar codigo.
   */
  const pedirPorWhatsApp = () => {
    const numero = (siteContent["whatsapp_number"] || "41786138084").replace(/[^0-9]/g, "")
    const lineas = cart.map(
      (item) => `• ${item.quantity}x ${item.name} — ${(item.price * item.quantity).toFixed(2)} CHF`,
    )
    const mensaje = [
      "Hallo Sabitas! Ich möchte gerne bestellen:",
      "",
      ...lineas,
      "",
      `Total: ${getTotalPrice().toFixed(2)} CHF`,
    ].join("\n")
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, "_blank")
  }

  const validateForm = () => {
    const errors: Partial<CustomerInfo> = {}

    if (!customerInfo.firstName.trim()) errors.firstName = "Vorname ist erforderlich"
    if (!customerInfo.lastName.trim()) errors.lastName = "Nachname ist erforderlich"
    if (!customerInfo.email.trim()) errors.email = "E-Mail ist erforderlich"
    if (!customerInfo.phone.trim()) errors.phone = "Telefon ist erforderlich"
    // Bei Abholung im Geschäft ist keine Lieferadresse erforderlich
    if (paymentMethod !== "pickup") {
      if (!customerInfo.address.trim()) errors.address = "Adresse ist erforderlich"
      if (!customerInfo.city.trim()) errors.city = "Stadt ist erforderlich"
      if (!customerInfo.postalCode.trim()) errors.postalCode = "PLZ ist erforderlich"
      if (!customerInfo.canton.trim()) errors.canton = "Kanton ist erforderlich"
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (customerInfo.email && !emailRegex.test(customerInfo.email)) {
      errors.email = "Ungültige E-Mail-Adresse"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateAccountCreation = () => {
    const errors: any = {}

    if (createAccountData.password.length < 6) {
      errors.password = "Passwort muss mindestens 6 Zeichen haben"
    }

    if (createAccountData.password !== createAccountData.confirmPassword) {
      errors.confirmPassword = "Passwörter stimmen nicht überein"
    }

    if (!createAccountData.saveData) {
      errors.saveData = "Bitte bestätigen Sie, dass Sie ein Konto erstellen möchten"
    }

    setAccountErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleBillingInputChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }))
    if (billingErrors[field]) {
      setBillingErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // Cart management functions
  const handleIncreaseQuantity = (item: CartItem) => {
    if (onAddToCart) {
      onAddToCart(item)
    }
  }

  const handleDecreaseQuantity = (item: CartItem) => {
    if (onRemoveFromCart) {
      onRemoveFromCart(item.id)
    }
  }

  const handleRemoveItem = (item: CartItem) => {
    if (onRemoveFromCart) {
      // Remove all quantity of this item
      for (let i = 0; i < item.quantity; i++) {
        onRemoveFromCart(item.id)
      }
    }
  }

  const validateBillingAddress = () => {
    if (!useDifferentBillingAddress) return true

    const errors: Partial<BillingAddress> = {}

    if (!billingAddress.firstName.trim()) errors.firstName = "Vorname ist erforderlich"
    if (!billingAddress.lastName.trim()) errors.lastName = "Nachname ist erforderlich"
    if (!billingAddress.address.trim()) errors.address = "Adresse ist erforderlich"
    if (!billingAddress.city.trim()) errors.city = "Stadt ist erforderlich"
    if (!billingAddress.canton.trim()) errors.canton = "Kanton ist erforderlich"

    setBillingErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Memoized validations to prevent infinite re-renders
  const isFormValid = useMemo(() => {
    return validateForm()
  }, [customerInfo, paymentMethod])

  const isBillingValid = useMemo(() => {
    return useDifferentBillingAddress ? validateBillingAddress() : true
  }, [useDifferentBillingAddress, billingAddress])

  const isAccountValid = useMemo(() => {
    return showCreateAccount ? validateAccountCreation() : true
  }, [showCreateAccount, createAccountData])

  const handleLogout = () => {
    console.log("🚪 Cerrando sesión...")
    localStorage.removeItem("user-session-token")
    setIsLoggedIn(false)
    setCurrentUser(null)
    setShowCreateAccount(false)
    setAccountCreationStatus("idle")
  }

  const handleCreateAccountOnly = async () => {
    if (!validateForm()) {
      return
    }

    if (!validateAccountCreation()) {
      return
    }

    try {
      await createUserAccount()
    } catch (error) {
      // Error already handled in createUserAccount
    }
  }

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true)
      setLoginStatus("idle")
      setLoginErrors({})

      console.log("🔄 Iniciando sesión...")

      // Validación básica
      const errors: any = {}
      if (!loginData.email.trim()) errors.email = "E-Mail ist erforderlich"
      if (!loginData.password.trim()) errors.password = "Passwort ist erforderlich"

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (loginData.email && !emailRegex.test(loginData.email)) {
        errors.email = "Ungültige E-Mail-Adresse"
      }

      if (Object.keys(errors).length > 0) {
        setLoginErrors(errors)
        return
      }

      const response = await fetch(`${API_BASE_URL}/login_user.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
        }),
      })

      console.log("📡 Respuesta de login:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error HTTP:", response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("✅ Respuesta de login:", result)

      if (result.success && result.sessionToken) {
        const sessionToken = result.sessionToken
        console.log("💾 Guardando token de login:", sessionToken.substring(0, 20) + "...")
        localStorage.setItem("user-session-token", sessionToken)

        // Configurar estado del usuario
        setIsLoggedIn(true)
        setCurrentUser({
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName || "",
          lastName: result.user.lastName || "",
          phone: result.user.phone || "",
          address: result.user.address || "",
          city: result.user.city || "",
          postalCode: result.user.postal_code || "",
          canton: result.user.canton || "",
          notes: result.user.notes || "",
        })

        // Auto-llenar formulario con datos del usuario
        setCustomerInfo({
          firstName: result.user.firstName || "",
          lastName: result.user.lastName || "",
          email: result.user.email || "",
          phone: result.user.phone || "",
          address: result.user.address || "",
          city: result.user.city || "",
          postalCode: result.user.postal_code || "",
          canton: result.user.canton || "",
          country: result.user.country || "CH",
          notes: result.user.notes || "",
        })

        setLoginStatus("success")
        setLoginMessage("¡Anmeldung erfolgreich!")
        setShowLogin(false)

        // Limpiar datos de login
        setLoginData({
          email: "",
          password: "",
        })

        console.log("✅ Login exitoso")
      } else {
        throw new Error(result.error || "Login failed")
      }
    } catch (error: unknown) {
      console.error("❌ Error en login:", error)
      setLoginStatus("error")

      let errorMessage = "Error desconocido"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      // Mensajes más específicos
      if (errorMessage.includes("Invalid email or password")) {
        errorMessage = "E-Mail oder Passwort ist falsch"
      } else if (errorMessage.includes("Load failed") || errorMessage.includes("Failed to fetch")) {
        errorMessage = "Verbindungsfehler. Bitte versuchen Sie es erneut."
      }

      setLoginMessage(errorMessage)
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Password Reset Functions
  const handlePasswordReset = async () => {
    try {
      setIsResettingPassword(true)
      setResetStatus("idle")
      setResetErrors({})

      console.log("🔄 Iniciando reset de contraseña...")

      // Validación básica
      const errors: any = {}
      if (!resetEmail.trim()) {
        errors.email = "E-Mail-Adresse ist erforderlich"
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (resetEmail && !emailRegex.test(resetEmail)) {
        errors.email = "Ungültige E-Mail-Adresse"
      }

      if (Object.keys(errors).length > 0) {
        setResetErrors(errors)
        return
      }

      const response = await fetch(`${API_BASE_URL}/reset_password.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: resetEmail.trim().toLowerCase(),
        }),
      })

      console.log("📡 Respuesta de reset:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error HTTP:", response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("✅ Respuesta de reset:", result)

      if (result.success) {
        setResetStatus("success")
        setResetMessage(result.message || "Ein neues Passwort wurde an Ihre E-Mail-Adresse gesendet.")

        // Limpiar el formulario
        setResetEmail("")

        console.log("✅ Reset de contraseña exitoso")
      } else {
        throw new Error(result.error || "Password reset failed")
      }
    } catch (error: unknown) {
      console.error("❌ Error en reset de contraseña:", error)
      setResetStatus("error")

      let errorMessage = "Error desconocido"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      // Mensajes más específicos
      if (errorMessage.includes("Load failed") || errorMessage.includes("Failed to fetch")) {
        errorMessage = "Verbindungsfehler. Bitte versuchen Sie es erneut."
      } else if (errorMessage.includes("CORS")) {
        errorMessage = "Serverfehler. Bitte kontaktieren Sie den Support."
      }

      setResetMessage(errorMessage)
    } finally {
      setIsResettingPassword(false)
    }
  }

  const openPasswordReset = () => {
    setShowPasswordReset(true)
    setResetEmail(loginData.email) // Pre-fill with login email if available
    setResetStatus("idle")
    setResetMessage("")
    setResetErrors({})
  }

  const closePasswordReset = () => {
    setShowPasswordReset(false)
    setResetEmail("")
    setResetStatus("idle")
    setResetMessage("")
    setResetErrors({})
  }

  if (orderStatus === "completed") {
    const isTwint = orderDetails?.status === "TWINT_PENDING"
    const isInvoice = orderDetails?.status === "INVOICE_SENT"
    const isPickup = orderDetails?.status === "PICKUP_RESERVED"

    return (
      <div className="min-h-screen bg-n-100">

        {/* Header — same style as checkout */}
        <div className="bg-white border-b border-n-150 px-4 py-3">
          <div className="container mx-auto max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/sabitas/logo.png" alt="Sabitas" className="h-10 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-n-500">
              <Shield className="w-4 h-4 text-brand" />
              <span>SSL gesichert</span>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl px-4 py-12">

          {/* Success Icon + Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand mb-5 shadow-lg">
              {isTwint
                ? <Phone className="w-9 h-9 text-white" />
                : <CheckCircle className="w-10 h-10 text-white" />
              }
            </div>
            <h1 className="text-3xl font-black text-n-900 tracking-tight mb-2">
              {isTwint ? "Bestellung aufgegeben!" : isPickup ? "Bestellung reserviert!" : "Bestellung bestätigt!"}
            </h1>
            <p className="text-n-600 text-base max-w-md mx-auto">
              {isTwint
                ? "Bitte kontaktieren Sie uns telefonisch, um die Zahlung zu vereinbaren und Ihre Bestellung zu bestätigen."
                : isInvoice
                ? "Vielen Dank! Wir senden Ihnen die Rechnung per E-Mail."
                : isPickup
                ? "Vielen Dank! Ihre Bestellung ist für Sie reserviert. Sie bezahlen bei der Abholung im Geschäft – wir melden uns, sobald sie bereit ist."
                : "Vielen Dank! Sie erhalten in Kürze eine Bestätigungs-E-Mail."
              }
            </p>
          </div>

          {/* Order Summary Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-n-150 overflow-hidden mb-5">
            <div className="bg-n-900 px-6 py-4 flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-n-400" />
              <span className="text-sm font-bold text-white tracking-wide uppercase">Bestelldetails</span>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-n-100">
                <span className="text-sm text-n-500">Bestellnummer</span>
                <span className="font-mono font-black text-n-900 text-lg tracking-widest">#{orderDetails?.id}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-n-100">
                <span className="text-sm text-n-500">Gesamtbetrag</span>
                <span className="font-black text-xl text-n-900">{orderDetails?.total?.toFixed(2) || "0.00"} CHF</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-n-100">
                <span className="text-sm text-n-500">Zahlungsstatus</span>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                  isTwint ? "bg-orange-100 text-orange-700" :
                  isInvoice ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-brand"
                }`}>
                  {isTwint ? "Ausstehend" : isInvoice ? "Rechnung" : "Bezahlt"}
                </span>
              </div>
              {isLoggedIn && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-n-500">Konto</span>
                  <span className="text-sm font-semibold text-brand">Gespeichert</span>
                </div>
              )}
            </div>
          </div>

          {/* Zahlung per Telefon */}
          {isTwint && (
            <div className="bg-white rounded-2xl shadow-sm border border-n-150 overflow-hidden mb-5">
              <div className="bg-black px-6 py-4 flex items-center justify-between">
                <span className="text-sm font-bold text-white tracking-wide uppercase">Jetzt per Telefon bezahlen</span>
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <p className="text-sm text-n-700">Kontaktieren Sie uns unter der folgenden Nummer – wir vereinbaren die Zahlung direkt mit Ihnen (z.B. <strong>TWINT</strong> oder andere App)</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <div className="flex-1">
                    <p className="text-sm text-n-700 mb-2">Betrag <strong>{orderDetails?.total?.toFixed(2)} CHF</strong> – unsere Telefonnummer:</p>
                    <div className="bg-n-50 rounded-xl px-5 py-3 text-center border border-n-200">
                      <p className="text-2xl font-black text-n-900 tracking-wider">{orderDetails?.twintPhone}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <div className="flex-1">
                    <p className="text-sm text-n-700 mb-2">Geben Sie als <strong>Mitteilung / Referenz</strong> ein:</p>
                    <div className="bg-n-50 rounded-xl px-5 py-3 text-center border border-n-200">
                      <p className="text-2xl font-black text-n-900 tracking-widest">#{orderDetails?.id}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-n-400 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                  Die Bestellnummer als Referenz ist wichtig, damit wir Ihre Zahlung zuordnen können.
                </p>
              </div>
            </div>
          )}

          {/* Delivery info */}
          {!isTwint && (
            <div className="bg-white rounded-2xl shadow-sm border border-n-150 px-6 py-4 mb-5 flex items-center gap-3">
              <Truck className="w-5 h-5 text-brand flex-shrink-0" />
              <p className="text-sm text-n-700">
                {isInvoice
                  ? "Der Verkäufer wird Sie per E-Mail oder Telefon kontaktieren, um die Bestellung abzuschließen."
                  : "Ihre Bestellung wird innerhalb von 2–3 Werktagen versendet."
                }
              </p>
            </div>
          )}

          {/* CTA */}
          <Button
            onClick={onBackToStore}
            className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-4 rounded-xl text-base shadow-lg transition-all"
          >
            <Home className="w-4 h-4 mr-2" />
            Zurück zum Shop
          </Button>

        </div>
      </div>
    )
  }

  if (orderStatus === "error") {
    return (
      <div className="min-h-screen bg-n-100">
        <div className="bg-white border-b border-n-150 px-4 py-3">
          <div className="container mx-auto max-w-4xl flex items-center justify-between">
            <img src="/sabitas/logo.png" alt="Sabitas" className="h-10 w-auto object-contain" />
            <div className="flex items-center gap-1.5 text-xs text-n-500">
              <Shield className="w-4 h-4 text-brand" />
              <span>SSL gesichert</span>
            </div>
          </div>
        </div>
        <div className="container mx-auto max-w-2xl px-4 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-600 mb-5 shadow-lg">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-n-900 tracking-tight mb-2">Fehler bei der Bestellung</h1>
            <p className="text-n-600 text-base">Es gab ein Problem beim Verarbeiten Ihrer Zahlung. Bitte versuchen Sie es erneut.</p>
          </div>
          <div className="space-y-3">
            <Button onClick={() => setOrderStatus("pending")} className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-4 rounded-xl text-base">
              Erneut versuchen
            </Button>
            <Button onClick={onBackToStore} variant="outline" className="w-full rounded-xl py-4">
              Zurück zum Shop
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-n-100">
      {/* Header */}
      <div className={`bg-white shadow-sm border-b border-n-200 sticky top-0 z-30 flex-shrink-0 transition-transform duration-300 ${headerVisible ? "translate-y-0" : "-translate-y-full"}`}>
        {/* 64px en movil, donde solo hay flecha, titulo y el sello de SSL.
            En escritorio 80, que es lo que pide el logo de 56 con aire. Antes
            eran 128 fijos: el doble de lo que hay que enseñar. */}
        <div className="container mx-auto px-4 max-w-7xl h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToStore}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-brand hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img src="/sabitas/logo.png" alt="Sabitas" className="h-12 w-auto object-contain hidden sm:block" />
            <span className="sm:hidden" style={{ fontFamily: "var(--font-display), Georgia, serif", color: '#111111', fontSize: '1.1rem' }}>Warenkorb</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-n-500">
            <Shield className="w-4 h-4 text-brand" />
            <span>SSL gesichert</span>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-7xl py-8">

          {isLoggedIn && currentUser && (
            <div className="flex items-center justify-between gap-4 bg-brand-wash border border-brand/20 rounded-2xl px-5 py-4 mb-8">
              {/* Avatar + info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-black">
                    {currentUser.firstName?.[0]?.toUpperCase()}{currentUser.lastName?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-brand uppercase tracking-widest">Angemeldet</p>
                  <p className="font-black text-n-900 text-sm leading-tight">{currentUser.firstName} {currentUser.lastName}</p>
                  <p className="text-xs text-n-500">{currentUser.email}</p>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => router.push("/profile?back=" + encodeURIComponent(window.location.pathname + window.location.search))}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl border border-brand/30 text-brand hover:bg-brand hover:text-white transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="text-[9px] font-semibold leading-none sm:hidden">Profil</span>
                  <span className="hidden sm:inline text-xs">Mein Profil</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-[9px] font-semibold leading-none sm:hidden">Logout</span>
                  <span className="hidden sm:inline text-xs">Abmelden</span>
                </button>
              </div>
            </div>
          )}
        <div className={`grid grid-cols-1 gap-8 ${features.caja ? "lg:grid-cols-2" : "max-w-2xl mx-auto"}`}>
          {features.caja && (<>
          {/* Customer form */}
          <div className="space-y-6">
            {/* Login Section — above the form */}
            {!isLoggedIn && (
              <Card className="rounded-2xl shadow-sm border-brand/20 bg-brand-wash">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="showLogin"
                      checked={showLogin}
                      onCheckedChange={(checked) => {
                        setShowLogin(checked as boolean)
                        if (checked) setShowCreateAccount(false)
                      }}
                    />
                    <Label htmlFor="showLogin" className="flex items-center cursor-pointer font-semibold text-brand">
                      <User className="w-4 h-4 mr-2" />
                      Ich habe bereits ein Konto — Anmelden
                    </Label>
                  </div>

                  {showLogin && (
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-brand/15">
                      <div>
                        <Label htmlFor="loginEmail">E-Mail *</Label>
                        <Input
                          id="loginEmail"
                          type="email"
                          value={loginData.email}
                          onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                          className={`bg-white ${loginErrors.email ? "border-red-500" : ""}`}
                          placeholder="ihre@email.com"
                        />
                        {loginErrors.email && <p className="text-red-500 text-sm mt-1">{loginErrors.email}</p>}
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="loginPassword">Passwort *</Label>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={openPasswordReset}
                            className="text-xs text-brand hover:text-brand-dark p-0 h-auto"
                          >
                            Passwort vergessen?
                          </Button>
                        </div>
                        <div className="relative">
                          <Input
                            id="loginPassword"
                            type={showLoginPassword ? "text" : "password"}
                            value={loginData.password}
                            onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                            className={`bg-white pr-10 ${loginErrors.password ? "border-red-500" : ""}`}
                            placeholder="Ihr Passwort"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        {loginErrors.password && <p className="text-red-500 text-sm mt-1">{loginErrors.password}</p>}
                      </div>

                      <div className="pt-4 border-t">
                        <Button
                          onClick={handleLogin}
                          disabled={isLoggingIn || !loginData.email || !loginData.password}
                          className="w-full bg-brand hover:bg-brand-dark text-white"
                        >
                          {isLoggingIn ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Anmeldung läuft...
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 mr-2" />
                              Anmelden
                            </>
                          )}
                        </Button>
                      </div>

                      {loginStatus === "error" && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                            <div>
                              <p className="text-red-700 font-medium">Anmeldung fehlgeschlagen</p>
                              <p className="text-red-600 text-sm mt-1">{loginMessage}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-brand-wash p-3 rounded-xl border border-brand/15">
                        <p className="text-sm text-brand font-semibold">Nach der Anmeldung:</p>
                        <ul className="text-sm text-brand/80 mt-1 space-y-1">
                          <li>• Ihre Daten werden automatisch ausgefüllt</li>
                          <li>• Schnellerer Checkout-Prozess</li>
                          <li>• Zugriff auf Ihr Profil und Bestellhistorie</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl shadow-sm border-n-150">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl">
                  <div className="flex items-center">
                    <User className="w-5 h-5 mr-2 text-brand" />
                    Persönliche Daten
                  </div>
                  {!isLoggedIn && (
                    <div className="flex items-center text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                      Automatisch gespeichert
                    </div>
                  )}
                  {isLoggedIn && (
                    <div className="flex items-center text-xs text-blue-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aus Ihrem Konto geladen
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input
                      id="firstName"
                      value={customerInfo.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      className={`bg-white ${formErrors.firstName ? "border-red-500" : ""}`}
                    />
                    {formErrors.firstName && <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input
                      id="lastName"
                      value={customerInfo.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      className={`bg-white ${formErrors.lastName ? "border-red-500" : ""}`}
                    />
                    {formErrors.lastName && <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`bg-white ${formErrors.email ? "border-red-500" : ""}`}
                    disabled={isLoggedIn}
                  />
                  {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`bg-white ${formErrors.phone ? "border-red-500" : ""}`}
                    placeholder="+41 XX XXX XX XX"
                  />
                  {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                </div>

                {/* Show success message when logged in */}
                {isLoggedIn && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <div>
                        <p className="text-green-700 font-medium">Sie sind angemeldet!</p>
                        <p className="text-green-600 text-sm">
                          Ihre Daten werden automatisch für zukünftige Bestellungen gespeichert.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Login Section placeholder removed — moved above */}
                {false && (
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id="showLogin"
                        checked={showLogin}
                        onCheckedChange={(checked) => {
                          setShowLogin(checked as boolean)
                          if (checked) {
                            setShowCreateAccount(false)
                          }
                        }}
                      />
                      <Label htmlFor="showLogin" className="flex items-center cursor-pointer">
                        <User className="w-4 h-4 mr-2 text-brand" />
                        Ich habe bereits ein Konto - Anmelden
                      </Label>
                    </div>

                    {showLogin && (
                      <div className="space-y-4 bg-brand-wash p-4 rounded-xl border border-brand/15">
                        <div>
                          <Label htmlFor="loginEmail">E-Mail *</Label>
                          <Input
                            id="loginEmail"
                            type="email"
                            value={loginData.email}
                            onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                            className={`bg-white ${loginErrors.email ? "border-red-500" : ""}`}
                            placeholder="ihre@email.com"
                          />
                          {loginErrors.email && <p className="text-red-500 text-sm mt-1">{loginErrors.email}</p>}
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="loginPassword">Passwort *</Label>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={openPasswordReset}
                              className="text-xs text-brand hover:text-brand-dark p-0 h-auto"
                            >
                              Passwort vergessen?
                            </Button>
                          </div>
                          <div className="relative">
                            <Input
                              id="loginPassword"
                              type={showLoginPassword ? "text" : "password"}
                              value={loginData.password}
                              onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                              className={`bg-white pr-10 ${loginErrors.password ? "border-red-500" : ""}`}
                              placeholder="Ihr Passwort"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                            >
                              {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                          {loginErrors.password && <p className="text-red-500 text-sm mt-1">{loginErrors.password}</p>}
                        </div>

                        {/* Login Button */}
                        <div className="pt-4 border-t">
                          <Button
                            onClick={handleLogin}
                            disabled={isLoggingIn || !loginData.email || !loginData.password}
                            className="w-full bg-brand hover:bg-brand-dark text-white"
                          >
                            {isLoggingIn ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Anmeldung läuft...
                              </>
                            ) : (
                              <>
                                <User className="w-4 h-4 mr-2" />
                                Anmelden
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Login Status Messages */}
                        {loginStatus === "error" && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center">
                              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                              <div>
                                <p className="text-red-700 font-medium">Anmeldung fehlgeschlagen</p>
                                <p className="text-red-600 text-sm mt-1">{loginMessage}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-brand-wash p-3 rounded-xl border border-brand/15">
                          <p className="text-sm text-brand font-semibold">
                            Nach der Anmeldung:
                          </p>
                          <ul className="text-sm text-brand/80 mt-1 space-y-1">
                            <li>• Ihre Daten werden automatisch ausgefüllt</li>
                            <li>• Schnellerer Checkout-Prozess</li>
                            <li>• Zugriff auf Ihr Profil und Bestellhistorie</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm border-n-150">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <MapPin className="w-5 h-5 mr-2 text-brand" />
                  Lieferadresse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="country">Land *</Label>
                  <select
                    id="country"
                    value={customerInfo.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {(["CH","DE","AT","FR","IT","NL","BE","ES","PL","PT","CZ","DK","SE","FI","NO","HU","RO","HR","SK","SI","LU","LI","OTHER"] as const)
                      .filter(c => enabledCountries.includes(c))
                      .map(c => {
                        const labels: Record<string, string> = {
                          CH:"🇨🇭 Schweiz", DE:"🇩🇪 Deutschland", AT:"🇦🇹 Österreich",
                          FR:"🇫🇷 Frankreich", IT:"🇮🇹 Italien", NL:"🇳🇱 Niederlande",
                          BE:"🇧🇪 Belgien", ES:"🇪🇸 Spanien", PL:"🇵🇱 Polen",
                          PT:"🇵🇹 Portugal", CZ:"🇨🇿 Tschechien", DK:"🇩🇰 Dänemark",
                          SE:"🇸🇪 Schweden", FI:"🇫🇮 Finnland", NO:"🇳🇴 Norwegen",
                          HU:"🇭🇺 Ungarn", RO:"🇷🇴 Rumänien", HR:"🇭🇷 Kroatien",
                          SK:"🇸🇰 Slowakei", SI:"🇸🇮 Slowenien", LU:"🇱🇺 Luxemburg",
                          LI:"🇱🇮 Liechtenstein", OTHER:"🌍 Andere",
                        }
                        return <option key={c} value={c}>{labels[c] ?? c}</option>
                      })
                    }
                  </select>
                  <p className="mt-1.5 text-xs text-n-500">
                    Für Lieferungen in andere Länder{" "}
                    <a
                      href="mailto:hello@sabitas.ch?subject=Anfrage%20internationale%20Lieferung"
                      className="text-brand font-semibold underline hover:text-brand-dark"
                    >
                      kontaktieren Sie uns bitte direkt
                    </a>
                    .
                  </p>
                </div>

                <div>
                  <Label htmlFor="address">Straße und Hausnummer *</Label>
                  <Input
                    id="address"
                    value={customerInfo.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className={`bg-white ${formErrors.address ? "border-red-500" : ""}`}
                  />
                  {formErrors.address && <p className="text-red-500 text-sm mt-1">{formErrors.address}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode">PLZ *</Label>
                    <Input
                      id="postalCode"
                      value={customerInfo.postalCode}
                      onChange={(e) => handleInputChange("postalCode", e.target.value)}
                      className={`bg-white ${formErrors.postalCode ? "border-red-500" : ""}`}
                      placeholder="1234"
                    />
                    {formErrors.postalCode && <p className="text-red-500 text-sm mt-1">{formErrors.postalCode}</p>}
                  </div>
                  <div>
                    <Label htmlFor="city">Stadt *</Label>
                    <Input
                      id="city"
                      value={customerInfo.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      className={`bg-white ${formErrors.city ? "border-red-500" : ""}`}
                    />
                    {formErrors.city && <p className="text-red-500 text-sm mt-1">{formErrors.city}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="canton">Kanton *</Label>
                  <Input
                    id="canton"
                    value={customerInfo.canton}
                    onChange={(e) => handleInputChange("canton", e.target.value)}
                    className={`bg-white ${formErrors.canton ? "border-red-500" : ""}`}
                    placeholder="z.B. Zürich, Bern, Basel..."
                  />
                  {formErrors.canton && <p className="text-red-500 text-sm mt-1">{formErrors.canton}</p>}
                </div>

                <div>
                  <Label htmlFor="notes">Anmerkungen (optional)</Label>
                  <Textarea
                    id="notes"
                    value={customerInfo.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Besondere Lieferhinweise..."
                    rows={3}
                    className="bg-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Billing Address Section */}
            <Card className="rounded-2xl shadow-sm border-n-150">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="differentBillingAddress"
                    checked={useDifferentBillingAddress}
                    onCheckedChange={(checked) => {
                      setUseDifferentBillingAddress(checked as boolean)
                      if (!checked) {
                        // Reset billing address when unchecked
                        setBillingAddress({
                          firstName: "",
                          lastName: "",
                          address: "",
                          city: "",
                          postalCode: "",
                          canton: "",
                        })
                        setBillingErrors({})
                      }
                    }}
                  />
                  <Label htmlFor="differentBillingAddress" className="flex items-center cursor-pointer">
                    <CreditCard className="w-4 h-4 mr-2 text-brand" />
                    Rechnungsadresse anders als Lieferadresse
                  </Label>
                </div>

                {useDifferentBillingAddress && (
                  <div className="space-y-4 bg-brand-wash p-4 rounded-xl border border-brand/20">
                    <h4 className="font-semibold text-brand mb-3">Rechnungsadresse</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billingFirstName">Vorname *</Label>
                        <Input
                          id="billingFirstName"
                          value={billingAddress.firstName}
                          onChange={(e) => handleBillingInputChange("firstName", e.target.value)}
                          className={`bg-white ${billingErrors.firstName ? "border-red-500" : ""}`}
                        />
                        {billingErrors.firstName && <p className="text-red-500 text-sm mt-1">{billingErrors.firstName}</p>}
                      </div>
                      <div>
                        <Label htmlFor="billingLastName">Nachname *</Label>
                        <Input
                          id="billingLastName"
                          value={billingAddress.lastName}
                          onChange={(e) => handleBillingInputChange("lastName", e.target.value)}
                          className={`bg-white ${billingErrors.lastName ? "border-red-500" : ""}`}
                        />
                        {billingErrors.lastName && <p className="text-red-500 text-sm mt-1">{billingErrors.lastName}</p>}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="billingAddress">Straße und Hausnummer *</Label>
                      <Input
                        id="billingAddress"
                        value={billingAddress.address}
                        onChange={(e) => handleBillingInputChange("address", e.target.value)}
                        className={`bg-white ${billingErrors.address ? "border-red-500" : ""}`}
                      />
                      {billingErrors.address && <p className="text-red-500 text-sm mt-1">{billingErrors.address}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billingPostalCode">PLZ *</Label>
                        <Input
                          id="billingPostalCode"
                          value={billingAddress.postalCode}
                          onChange={(e) => handleBillingInputChange("postalCode", e.target.value)}
                          className={`bg-white ${billingErrors.postalCode ? "border-red-500" : ""}`}
                          placeholder="1234"
                        />
                        {billingErrors.postalCode && <p className="text-red-500 text-sm mt-1">{billingErrors.postalCode}</p>}
                      </div>
                      <div>
                        <Label htmlFor="billingCity">Stadt *</Label>
                        <Input
                          id="billingCity"
                          value={billingAddress.city}
                          onChange={(e) => handleBillingInputChange("city", e.target.value)}
                          className={`bg-white ${billingErrors.city ? "border-red-500" : ""}`}
                        />
                        {billingErrors.city && <p className="text-red-500 text-sm mt-1">{billingErrors.city}</p>}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="billingCanton">Kanton *</Label>
                      <Input
                        id="billingCanton"
                        value={billingAddress.canton}
                        onChange={(e) => handleBillingInputChange("canton", e.target.value)}
                        className={`bg-white ${billingErrors.canton ? "border-red-500" : ""}`}
                        placeholder="z.B. Zürich, Bern, Basel..."
                      />
                      {billingErrors.canton && <p className="text-red-500 text-sm mt-1">{billingErrors.canton}</p>}
                    </div>

                    <div className="bg-brand-tint p-3 rounded-xl border border-brand/15">
                      <p className="text-sm text-brand">
                        <strong>Hinweis:</strong> Die Rechnungsadresse wird nur für die Rechnungsstellung verwendet und nicht in der Datenbank gespeichert.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Create Account Section - ONLY show if NOT logged in */}
            {!isLoggedIn && (
              <Card className="rounded-2xl shadow-sm border-n-150">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="createAccount"
                      checked={showCreateAccount}
                      onCheckedChange={(checked) => {
                        setShowCreateAccount(checked as boolean)
                        if (checked) {
                          setShowLogin(false) // Close login if create account is opened
                        }
                      }}
                    />
                    <Label htmlFor="createAccount" className="flex items-center cursor-pointer">
                      <UserPlus className="w-4 h-4 mr-2 text-brand" />
                      Konto erstellen und Daten für zukünftige Bestellungen speichern
                    </Label>
                  </div>

                  {showCreateAccount && (
                    <div className="space-y-4 bg-brand-wash p-4 rounded-xl border border-brand/15">
                      <div>
                        <Label htmlFor="password">Passwort *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={createAccountData.password}
                            onChange={(e) => setCreateAccountData((prev) => ({ ...prev, password: e.target.value }))}
                            className={`bg-white pr-10 ${accountErrors.password ? "border-red-500" : ""}`}
                            placeholder="Mindestens 6 Zeichen"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        {accountErrors.password && (
                          <p className="text-red-500 text-sm mt-1">{accountErrors.password}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Passwort bestätigen *</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={createAccountData.confirmPassword}
                            onChange={(e) =>
                              setCreateAccountData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                            }
                            className={`bg-white pr-10 ${accountErrors.confirmPassword ? "border-red-500" : ""}`}
                            placeholder="Passwort wiederholen"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        {accountErrors.confirmPassword && (
                          <p className="text-red-500 text-sm mt-1">{accountErrors.confirmPassword}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="saveData"
                          checked={createAccountData.saveData}
                          onCheckedChange={(checked) =>
                            setCreateAccountData((prev) => ({ ...prev, saveData: checked as boolean }))
                          }
                        />
                        <Label htmlFor="saveData" className="text-sm cursor-pointer">
                          Ich möchte ein Konto erstellen und meine Daten für zukünftige Bestellungen speichern
                        </Label>
                      </div>
                      {accountErrors.saveData && <p className="text-red-500 text-sm mt-1">{accountErrors.saveData}</p>}

                      {/* Create Account Button */}
                      <div className="pt-4 border-t">
                        <Button
                          onClick={handleCreateAccountOnly}
                          disabled={
                            isCreatingAccount || !createAccountData.password || !createAccountData.confirmPassword
                          }
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isCreatingAccount ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Konto wird erstellt...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Konto jetzt erstellen
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Sie können Ihr Konto jetzt erstellen oder später beim Bezahlen
                        </p>
                      </div>

                      {/* Account Creation Status Messages */}
                      {accountCreationStatus === "error" && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                            <div>
                              <p className="text-red-700 font-medium">Error al crear la cuenta</p>
                              <p className="text-red-600 text-sm mt-1">{accountCreationMessage}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-brand-wash p-3 rounded-xl border border-brand/15">
                        <p className="text-sm text-brand font-semibold">
                          Vorteile eines Kontos:
                        </p>
                        <ul className="text-sm text-brand/80 mt-1 space-y-1">
                          <li>• Automatisches Ausfüllen bei zukünftigen Bestellungen</li>
                          <li>• Bestellhistorie einsehen</li>
                          <li>• Adressdaten verwalten</li>
                          <li>• Schnellerer Checkout</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          </>)}

          {/* Order summary */}
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm border-n-150">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Package className="w-5 h-5 mr-2 text-brand" />
                  Ihre Bestellung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`font-semibold text-sm line-clamp-2 transition-colors ${ (item as any).item_type === "gutschein" ? "cursor-default text-gray-900" : "cursor-pointer text-brand hover:text-brand-dark" }`}
                            onClick={() => { if ((item as any).item_type === "gutschein") return; router.push(`/product/${item.id}`) }}
                          >{item.name}</h4>
                          <span className="text-sm font-bold text-brand whitespace-nowrap flex-shrink-0">
                            {(item.price * item.quantity).toFixed(2)} CHF
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDecreaseQuantity(item)}
                              className="h-8 w-8 p-0 bg-white hover:bg-gray-100"
                              disabled={!onRemoveFromCart}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="font-medium text-sm min-w-[2rem] text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleIncreaseQuantity(item)}
                              className="h-8 w-8 p-0 bg-white hover:bg-gray-100"
                              disabled={!onAddToCart}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(item)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 "
                            disabled={!onRemoveFromCart}
                          >
                           <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
          
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Zwischensumme:</span>
                    <span>{getTotalPrice().toFixed(2)} CHF</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{paymentMethod === "pickup" ? "Abholung:" : "Versand:"}</span>
                    <span>
                      {paymentMethod === "pickup"
                        ? <span className="font-semibold">Im Geschäft</span>
                        : getShippingCost() === 0
                        ? <span className="font-semibold">0.00 CHF</span>
                        : <span className="font-semibold">{getShippingCost().toFixed(2)} CHF</span>
                      }
                    </span>
                  </div>
                  {paymentMethod !== "pickup" && shippingInfo.zone && (
                    <div className="text-xs text-gray-500">
                      {shippingInfo.zone} · {shippingInfo.range}
                    </div>
                  )}
                  {paymentMethod !== "pickup" && cart.some(item => item.shipping_on_request) && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                      <p className="mb-2">Für einzelne Artikel (Versand auf Anfrage) wird der Versand separat vereinbart.</p>
                      <button
                        type="button"
                        onClick={() => setContactOpen(true)}
                        className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                      >
                        Kontaktieren
                      </button>
                    </div>
                  )}
                  <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} subject="Versand-/Abholanfrage" />
                  <Separator />
                  <div className="flex justify-between text-xl font-black">
                    <span>Gesamt:</span>
                    <span className="text-brand">{getFinalTotal().toFixed(2)} CHF</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {features.caja && (<>
            {/* Shipping information */}
            <Card className="bg-brand-wash border-brand/25 rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-semibold text-brand mb-2">📦 Versandinformationen</h3>
                <ul className="text-sm text-brand/80 space-y-1">
                  <li>• Lieferzeit: 2-3 Werktage</li>
                  <li>• Versand aus 9631 Ulisbach</li>
                  {shippingInfo.zone && <li>• Zone: {shippingInfo.zone} · {shippingInfo.range}</li>}
                </ul>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card className="rounded-2xl shadow-sm border-n-150">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <CreditCard className="w-5 h-5 mr-2 text-brand" />
                  Zahlungsart wählen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-6">

                  {/* PayPal */}
                  {paySettings.enable_paypal && (
                    <div
                      onClick={() => setPaymentMethod("paypal")}
                      className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${paymentMethod === "paypal" ? "border-brand bg-brand-wash" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${paymentMethod === "paypal" ? "border-brand bg-brand" : "border-gray-300"}`}>
                        {paymentMethod === "paypal" && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">PayPal</p>
                        <p className="text-xs text-gray-500">Sofortige Zahlung mit PayPal – Sie werden weitergeleitet</p>
                      </div>
                      <img src="/0014294_paypal-express-payment-plugin.png" alt="PayPal" className="h-8 w-auto object-contain flex-shrink-0" />
                    </div>
                  )}

                  {/* Kreditkarte */}
                  {paySettings.enable_stripe && (
                    <div
                      onClick={() => setPaymentMethod("stripe")}
                      className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${paymentMethod === "stripe" ? "border-brand bg-brand-wash" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${paymentMethod === "stripe" ? "border-brand bg-brand" : "border-gray-300"}`}>
                        {paymentMethod === "stripe" && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">Kreditkarte</p>
                        <p className="text-xs text-gray-500">Visa, Mastercard, AMEX – sichere SSL-Zahlung</p>
                      </div>
                      {/* Visa + Mastercard logos */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 471" width="42" height="26">
                          <rect width="750" height="471" rx="40" fill="#fff" stroke="#DEDEDA" strokeWidth="20"/>
                          <path d="M278 333L313 141h56L334 333z" fill="#00579F"/>
                          <path d="M524 146c-11-4-28-9-50-9-55 0-93 29-94 71-1 31 28 48 49 58 22 11 29 18 29 27 0 15-17 22-33 22-22 0-34-3-52-11l-7-4-8 47c13 6 37 11 62 11 58 0 96-28 96-73 0-25-15-43-47-59-20-10-32-17-32-27 0-9 10-19 33-19 18 0 32 4 43 8l5 3 8-46z" fill="#00579F"/>
                          <path d="M616 141h-43c-13 0-23 4-29 18l-82 174h58l12-32h71l7 32h51L616 141zm-68 116l22-59 12 59h-34z" fill="#00579F"/>
                          <path d="M222 141l-54 131-6-29-18-93c-3-13-12-17-23-18h-88l-1 4c21 5 40 13 55 22l47 178h59l90-195h-61z" fill="#00579F"/>
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 471" width="42" height="26">
                          <rect width="750" height="471" rx="40" fill="#fff" stroke="#DEDEDA" strokeWidth="20"/>
                          <circle cx="280" cy="235" r="140" fill="#EB001B"/>
                          <circle cx="470" cy="235" r="140" fill="#F79E1B"/>
                          <path d="M375 103a140 140 0 0 1 0 265 140 140 0 0 1 0-265z" fill="#FF5F00"/>
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* TWINT via Stripe QR (nuevo) */}
                  {paySettings.enable_stripe && paySettings.stripe_publishable_key && (
                    <div
                      onClick={() => setPaymentMethod("twint_stripe")}
                      className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${paymentMethod === "twint_stripe" ? "border-brand bg-brand-wash" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${paymentMethod === "twint_stripe" ? "border-brand bg-brand" : "border-gray-300"}`}>
                        {paymentMethod === "twint_stripe" && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">TWINT <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded ml-1">QR-Code</span></p>
                        <p className="text-xs text-gray-500">QR-Code scannen oder App-Weiterleitung – via Stripe</p>
                      </div>
                      <img src="/twint-logo-original.svg" alt="TWINT" className="h-7 w-auto object-contain flex-shrink-0" />
                    </div>
                  )}

                  {/* TWINT manual (respaldo) */}
                  {paySettings.enable_twint && (
                    <div
                      onClick={() => setPaymentMethod("twint")}
                      className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${paymentMethod === "twint" ? "border-brand bg-brand-wash" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${paymentMethod === "twint" ? "border-brand bg-brand" : "border-gray-300"}`}>
                        {paymentMethod === "twint" && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">Per Telefon <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded ml-1">z.B. TWINT oder andere App</span></p>
                        <p className="text-xs text-gray-500">Sie erhalten unsere Telefonnummer – Zahlung nach Absprache</p>
                      </div>
                      <img src="/twint-logo.svg" alt="Telefon" className="h-7 w-auto object-contain flex-shrink-0" />
                    </div>
                  )}

                  {/* Rechnung */}
                  {paySettings.enable_invoice && (
                    <div
                      onClick={() => setPaymentMethod("invoice")}
                      className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${paymentMethod === "invoice" ? "border-brand bg-brand-wash" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${paymentMethod === "invoice" ? "border-brand bg-brand" : "border-gray-300"}`}>
                        {paymentMethod === "invoice" && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">Kauf auf Rechnung & Vorkasse</p>
                        <p className="text-xs text-gray-500">Nach Abschluss der Bestellung wird der Verkäufer Sie so bald wie möglich per E-Mail oder Telefon kontaktieren, um die Bestellung abzuschließen.</p>
                      </div>
                      <Landmark className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    </div>
                  )}

                  {/* Abholung im Geschäft */}
                  {paySettings.enable_pickup && (
                    <div
                      onClick={() => setPaymentMethod("pickup")}
                      className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${paymentMethod === "pickup" ? "border-brand bg-brand-wash" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${paymentMethod === "pickup" ? "border-brand bg-brand" : "border-gray-300"}`}>
                        {paymentMethod === "pickup" && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">Abholung im Geschäft</p>
                        <p className="text-xs text-gray-500">Ihre Bestellung wird reserviert. Sie bezahlen bei der Abholung im Geschäft – kein Versand.</p>
                      </div>
                      <Store className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    </div>
                  )}

                </div>

                {/* Context info + action per method */}

                {/* Rechnung */}
                {paymentMethod === "invoice" && (
                  <>
                    {paySettings.bank_iban && (paySettings.enable_paypal || paySettings.enable_stripe || paySettings.enable_twint) && (
                      <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bankverbindung</p>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">IBAN</span>
                            <span className="text-sm font-mono font-semibold text-gray-800">{paySettings.bank_iban}</span>
                          </div>
                          {paySettings.bank_holder && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Kontoinhaber</span>
                              <span className="text-sm font-semibold text-gray-800">{paySettings.bank_holder}</span>
                            </div>
                          )}
                          {paySettings.bank_name && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Bank</span>
                              <span className="text-sm text-gray-700">{paySettings.bank_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <p className="text-sm text-green-700">Nach der Bestellung wird der Verkäufer Sie per E-Mail oder Telefon kontaktieren.</p>
                    </div>
                    <Button
                      onClick={handleInvoicePayment}
                      disabled={isSubmitting || STORE_UNDER_MAINTENANCE}
                      className="w-full min-h-14 h-auto py-3 text-base font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {STORE_UNDER_MAINTENANCE ? "Shop wird gerade überarbeitet" : isSubmitting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Verarbeitung...</> : `Bestellung abschließen · ${getFinalTotal().toFixed(2)} CHF`}
                    </Button>
                  </>
                )}

                {/* Abholung im Geschäft */}
                {paymentMethod === "pickup" && (
                  <>
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                      <p className="text-sm text-amber-700">
                        Ihre Bestellung wird für Sie reserviert. Die Bezahlung erfolgt bei der Abholung im Geschäft. Wir kontaktieren Sie, sobald die Bestellung zur Abholung bereit ist.
                      </p>
                    </div>
                    <Button
                      onClick={handlePickupOrder}
                      disabled={isSubmitting || STORE_UNDER_MAINTENANCE}
                      className="w-full min-h-14 h-auto py-3 text-base font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {STORE_UNDER_MAINTENANCE ? "Shop wird gerade überarbeitet" : isSubmitting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Verarbeitung...</> : `Reservieren & im Geschäft abholen · ${getFinalTotal().toFixed(2)} CHF`}
                    </Button>
                  </>
                )}

                {/* PayPal */}
                {paymentMethod === "paypal" && (
                  <>
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-700">
                        Sie werden zu <strong>PayPal</strong> weitergeleitet, um die Zahlung sicher abzuschließen.
                      </p>
                    </div>
                    <Button
                      onClick={handlePayPalPayment}
                      disabled={isSubmitting || STORE_UNDER_MAINTENANCE}
                      className="w-full min-h-14 h-auto py-3 text-base font-bold bg-[#0070BA] hover:bg-[#005ea6] text-white shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {STORE_UNDER_MAINTENANCE ? "Shop wird gerade überarbeitet" : isSubmitting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Weiterleitung...</> : `Mit PayPal bezahlen · ${getFinalTotal().toFixed(2)} CHF`}
                    </Button>
                  </>
                )}

                {/* Stripe */}
                {paymentMethod === "stripe" && (
                  <>
                    <div className="mb-4">
                      <StripePayment
                        amount={getFinalTotal()}
                        currency="CHF"
                        orderData={{ orderId: `ORDER-${Date.now()}`, customerInfo: customerInfo, cart: cart }}
                        onSuccess={handleStripeSuccess}
                        onError={handleStripeError}
                        disabled={!isFormValid || !isBillingValid || !isAccountValid || STORE_UNDER_MAINTENANCE}
                        publishableKey={paySettings.stripe_publishable_key || undefined}
                        secretKey={paySettings.stripe_secret_key || undefined}
                      />
                      {stripeError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <p className="text-sm">{stripeError}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* TWINT */}
                {paymentMethod === "twint" && (
                  <>
                    <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm text-orange-700">
                        Nach der Bestellung erhalten Sie unsere Telefonnummer – die Zahlung vereinbaren wir direkt mit Ihnen (z.B. TWINT oder andere App).
                        {paySettings.twint_phone && <><br/>Nummer: <strong>{paySettings.twint_phone}</strong></>}
                      </p>
                    </div>
                    <Button
                      onClick={handleTwintPayment}
                      disabled={isSubmitting || STORE_UNDER_MAINTENANCE}
                      className="w-full min-h-14 h-auto py-3 text-base font-bold bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {STORE_UNDER_MAINTENANCE ? "Shop wird gerade überarbeitet" : isSubmitting
                        ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Verarbeitung...</>
                        : <span className="flex flex-col items-center leading-tight"><span>Bestellen &amp; per Telefon bezahlen</span><span className="text-sm font-semibold opacity-90">{getFinalTotal().toFixed(2)} CHF</span></span>
                      }
                    </Button>
                  </>
                )}

                {/* TWINT via Stripe QR */}
                {paymentMethod === "twint_stripe" && (
                  <div className="mb-4">
                    <StripeTwintPayment
                      amount={getFinalTotal()}
                      orderData={{ customerInfo, cart }}
                      publishableKey={paySettings.stripe_publishable_key || undefined}
                      secretKey={paySettings.stripe_secret_key || undefined}
                      pmcId={paySettings.stripe_pmc_id || undefined}
                      disabled={!isFormValid || !isBillingValid || !isAccountValid || STORE_UNDER_MAINTENANCE}
                      returnUrl={typeof window !== "undefined" ? window.location.origin : ""}
                      onSaveOrder={handleStripeTwintSaveOrder}
                      onError={(msg) => setStripeError(msg)}
                    />
                    {stripeError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p className="text-sm">{stripeError}</p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-4 text-center">
                  Mit Ihrer Bestellung akzeptieren Sie unsere AGB und Datenschutzbestimmungen.
                </p>
              </CardContent>
            </Card>
            </>)}
            {/* --- PAQUETE 2: el pedido sale por WhatsApp --- */}
            {!features.caja && (
              <Card className="rounded-2xl shadow-sm border-n-150">
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-n-600">
                    Schick mir deinen Warenkorb per WhatsApp – ich melde mich mit
                    Verfügbarkeit, Versand und allem Weiteren. Du musst hier nichts ausfüllen.
                  </p>
                  <Button
                    onClick={pedirPorWhatsApp}
                    className="w-full min-h-14 h-auto py-3 text-base font-bold bg-[#25D366] hover:bg-[#1da851] text-white shadow-lg"
                  >
                    Per WhatsApp bestellen · {getTotalPrice().toFixed(2)} CHF
                  </Button>
                  <p className="text-xs text-n-400 text-center">
                    Es wird nichts gespeichert und nichts bezahlt. WhatsApp öffnet sich
                    mit deinem Warenkorb als Nachricht.
                  </p>
                </CardContent>
              </Card>
            )}

          </div>
        </div>

        {/* Password Reset Modal */}
        <Dialog open={showPasswordReset} onOpenChange={setShowPasswordReset}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <KeyRound className="w-5 h-5 mr-2 text-brand" />
                Passwort zurücksetzen
              </DialogTitle>
              <DialogDescription>
                Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen ein neues temporäres Passwort.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="resetEmail">E-Mail-Adresse *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className={`pl-10 ${resetErrors.email ? "border-red-500" : ""}`}
                    placeholder="ihre@email.com"
                    disabled={isResettingPassword}
                  />
                </div>
                {resetErrors.email && <p className="text-red-500 text-sm mt-1">{resetErrors.email}</p>}
              </div>

              {/* Status Messages */}
              {resetStatus === "success" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-green-700 font-medium">E-Mail gesendet!</p>
                      <p className="text-green-600 text-sm mt-1">{resetMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {resetStatus === "error" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <div>
                      <p className="text-red-700 font-medium">Fehler</p>
                      <p className="text-red-600 text-sm mt-1">{resetMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-brand-wash border border-brand/20 rounded-xl p-4">
                <h4 className="text-brand font-medium mb-2">ℹ️ Wichtige Hinweise:</h4>
                <ul className="text-brand/80 text-sm space-y-1">
                  <li>• Sie erhalten ein neues 8-stelliges Passwort per E-Mail</li>
                  <li>• Melden Sie sich sofort mit dem neuen Passwort an</li>
                  <li>• Ändern Sie das Passwort nach der Anmeldung in Ihrem Profil</li>
                  <li>• Alle bestehenden Sitzungen werden aus Sicherheitsgründen beendet</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword || !resetEmail.trim() || resetStatus === "success"}
                  className="flex-1 bg-brand hover:bg-brand-dark text-white rounded-xl"
                >
                  {isResettingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Neues Passwort anfordern
                    </>
                  )}
                </Button>
                <Button
                  onClick={closePasswordReset}
                  variant="outline"
                  disabled={isResettingPassword}
                  className="flex-1"
                >
                  {resetStatus === "success" ? "Schließen" : "Abbrechen"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Profile Modal */}
        {showUserProfile && (
          <UserProfile
            onClose={() => {
              setShowUserProfile(false)
              // Recargar datos del usuario después de cerrar el perfil
              setTimeout(() => {
                reloadUserData()
              }, 100)
            }}
          />
        )}

      </div>

      {/* ── Payment footer strip ── */}
      {paySettings && (paySettings.enable_invoice || paySettings.enable_stripe || paySettings.enable_twint || paySettings.enable_paypal) && (
        <div className="border-t border-n-200 py-5 bg-white mt-8">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-1.5 pr-4 border-r border-n-200">
                <Shield className="w-4 h-4 text-brand" />
                <span className="text-[11px] font-semibold text-n-700 tracking-widest uppercase">Sichere Zahlung</span>
              </div>
              {paySettings.enable_invoice && (
                <div className="h-9 px-4 rounded-lg bg-n-50 border border-n-200 flex items-center gap-2 shadow-sm">
                  <span className="text-lg">🏦</span>
                  <span className="text-[11px] font-bold text-n-700 tracking-tight">Rechnung</span>
                </div>
              )}
              {paySettings.enable_twint && (
                <div className="h-9 px-3 rounded-lg bg-black flex items-center shadow-sm">
                  <img src="/twint-logo.svg" alt="Telefon" className="h-7 w-auto" />
                </div>
              )}
              {paySettings.enable_stripe && (
                <>
                  <div className="h-9 px-5 rounded-lg bg-[#1A1F71] flex items-center shadow-sm">
                    <span className="font-black text-white text-base italic tracking-tight">VISA</span>
                  </div>
                  <div className="h-9 px-4 rounded-lg bg-white border border-n-200 flex items-center gap-1 shadow-sm">
                    <div className="w-5 h-5 rounded-full bg-[#EB001B] opacity-90" />
                    <div className="w-5 h-5 rounded-full bg-[#F79E1B] opacity-90 -ml-2" />
                    <span className="text-[11px] font-bold text-n-800 ml-1.5 tracking-tight">Mastercard</span>
                  </div>
                </>
              )}
              {paySettings.enable_paypal && (
                <div className="h-9 px-3 rounded-lg bg-white border border-n-200 flex items-center shadow-sm">
                  <img src="/0014294_paypal-express-payment-plugin.png" alt="PayPal" className="h-7 w-auto object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}