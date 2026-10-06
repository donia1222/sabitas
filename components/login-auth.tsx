"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, Eye, EyeOff, Mail, KeyRound, CheckCircle, AlertCircle, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

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

interface LoginAuthProps {
  onLoginSuccess?: (user: UserData) => void
  onLogout?: () => void
  onShowProfile?: () => void
  className?: string
  variant?: "button" | "inline"
  buttonText?: string
  isLightSection?: boolean
}

// Exportable Admin Login Button Component
export function AdminLoginButton({
  className = "",
  isLightSection = false,
  onOpenAuth,
}: {
  className?: string
  isLightSection?: boolean
  onOpenAuth: () => void
}) {
  return (
    <Button
      onClick={onOpenAuth}
      variant="ghost"
      size="sm"
      className={`p-2 rounded-xl transition-all duration-300 ${
        isLightSection
          ? "text-gray-900/10 hover:bg-white/20 text-white border-white/20"
          : "text-gray-900/5 hover:bg-white/10 text-gray-600 hover:text-gray-800"
      } ${className}`}
    >
      <User className="w-6 h-6 text-gray-200" />
    </Button>
  )
}

export function LoginAuth({
  onLoginSuccess,
  onLogout,
  onShowProfile,
  className = "",
  variant = "button",
  buttonText = "Anmelden",
  isLightSection = false,
}: LoginAuthProps) {
  // User states
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)

  // Modal states
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")

  // Login states
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  })
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginErrors, setLoginErrors] = useState<any>({})
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginStatus, setLoginStatus] = useState<"idle" | "success" | "error">("idle")
  const [loginMessage, setLoginMessage] = useState("")

  // Register states
  const [registerData, setRegisterData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [registerErrors, setRegisterErrors] = useState<any>({})
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerStatus, setRegisterStatus] = useState<"idle" | "success" | "error">("idle")
  const [registerMessage, setRegisterMessage] = useState("")

  // Password Reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetStatus, setResetStatus] = useState<"idle" | "success" | "error">("idle")
  const [resetMessage, setResetMessage] = useState("")
  const [resetErrors, setResetErrors] = useState<any>({})

  const router = useRouter()
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  // Check if user is logged in on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log("🔍 LoginAuth: Inicializando autenticación...")
      const sessionToken = localStorage.getItem("user-session-token")
      if (sessionToken) {
        console.log("🎫 Token encontrado:", sessionToken.substring(0, 20) + "...")
        const isValid = await verifyAndLoadUser(sessionToken)
        if (!isValid) {
          console.log("❌ Token inválido, limpiando...")
          localStorage.removeItem("user-session-token")
        }
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
        const userData = {
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
        }

        setIsLoggedIn(true)
        setCurrentUser(userData)

        // Notify parent component
        if (onLoginSuccess) {
          onLoginSuccess(userData)
        }

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

  const handleUserIconClick = () => {
    if (isLoggedIn) {
      setShowUserMenu(true)
    } else {
      setShowAuthModal(true)
      setAuthMode("login")
    }
  }

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true)
      setLoginStatus("idle")
      setLoginErrors({})
      console.log("🔄 Iniciando sesión...")

      // Basic validation
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

        const userData = {
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
        }

        setIsLoggedIn(true)
        setCurrentUser(userData)
        setLoginStatus("success")
        setLoginMessage("¡Anmeldung erfolgreich!")

        // Clear login data
        setLoginData({
          email: "",
          password: "",
        })

        // Notify parent component
        if (onLoginSuccess) {
          onLoginSuccess(userData)
        }

        // Navigate to profile after success
        setTimeout(() => {
          setShowAuthModal(false)
          setLoginStatus("idle")
          router.push("/profile")
        }, 1500)

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

      // More specific messages
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

  const handleRegister = async () => {
    try {
      setIsRegistering(true)
      setRegisterStatus("idle")
      setRegisterErrors({})
      console.log("🔄 Registrando usuario...")

      // Basic validation
      const errors: any = {}
      if (!registerData.firstName.trim()) errors.firstName = "Vorname ist erforderlich"
      if (!registerData.lastName.trim()) errors.lastName = "Nachname ist erforderlich"
      if (!registerData.email.trim()) errors.email = "E-Mail ist erforderlich"
      if (!registerData.password.trim()) errors.password = "Passwort ist erforderlich"
      if (registerData.password.length < 6) errors.password = "Passwort muss mindestens 6 Zeichen haben"
      if (registerData.password !== registerData.confirmPassword) {
        errors.confirmPassword = "Passwörter stimmen nicht überein"
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (registerData.email && !emailRegex.test(registerData.email)) {
        errors.email = "Ungültige E-Mail-Adresse"
      }

      if (Object.keys(errors).length > 0) {
        setRegisterErrors(errors)
        return
      }

      const response = await fetch(`${API_BASE_URL}/create_user.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
        }),
      })

      console.log("📡 Respuesta de registro:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error HTTP:", response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("✅ Respuesta de registro:", result)

      if (result.success && result.sessionToken) {
        const sessionToken = result.sessionToken
        console.log("💾 Guardando token de registro:", sessionToken.substring(0, 20) + "...")
        localStorage.setItem("user-session-token", sessionToken)

        const userData = {
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
        }

        setIsLoggedIn(true)
        setCurrentUser(userData)
        setRegisterStatus("success")
        setRegisterMessage("¡Konto erfolgreich erstellt!")

        // Clear register data
        setRegisterData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
        })

        // Notify parent component
        if (onLoginSuccess) {
          onLoginSuccess(userData)
        }

        // Close modal after success
        setTimeout(() => {
          setShowAuthModal(false)
          setRegisterStatus("idle")
        }, 1500)

        console.log("✅ Registro exitoso")
      } else {
        throw new Error(result.error || "Registration failed")
      }
    } catch (error: unknown) {
      console.error("❌ Error en registro:", error)
      setRegisterStatus("error")
      let errorMessage = "Error desconocido"

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      if (errorMessage.includes("Load failed") || errorMessage.includes("Failed to fetch")) {
        errorMessage = "Verbindungsfehler. Bitte versuchen Sie es erneut."
      } else if (errorMessage.includes("Email already exists")) {
        errorMessage = "Diese E-Mail-Adresse ist bereits registriert"
      }

      setRegisterMessage(errorMessage)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleLogout = () => {
    console.log("🚪 Cerrando sesión...")
    localStorage.removeItem("user-session-token")
    setIsLoggedIn(false)
    setCurrentUser(null)
    setShowUserMenu(false)

    // Notify parent component
    if (onLogout) {
      onLogout()
    }
  }

  const handleShowProfile = () => {
    setShowUserMenu(false)
    if (onShowProfile) {
      onShowProfile()
    }
  }

  const handlePasswordReset = async () => {
    try {
      setIsResettingPassword(true)
      setResetStatus("idle")
      setResetErrors({})
      console.log("🔄 Iniciando reset de contraseña...")

      // Basic validation
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
    setResetEmail(loginData.email)
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

  return (
    <>
      {/* User Icon Button */}
      <button
        onClick={handleUserIconClick}
        className={`relative flex flex-col items-center p-2 hover:bg-n-50 rounded min-w-[64px] focus:outline-none focus-visible:outline-none ${className}`}
      >
        <User className={`w-6 h-6 ${isLoggedIn ? "text-brand" : "text-n-700"}`} />
        <span className="text-xs text-n-700 mt-0.5 leading-none text-center font-medium">
          {isLoggedIn && currentUser ? currentUser.firstName || "Konto" : "Anmelden"}
        </span>
        {isLoggedIn && currentUser && (
          <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
        )}
      </button>

      {/* Auth Modal (Login/Register) */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-full max-w-full h-full max-h-full rounded-none sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-sm sm:h-auto sm:max-h-[90vh] sm:rounded-2xl p-0 gap-0 bg-n-50 border-0 overflow-y-auto">
          {/* Hidden accessible title */}
          <DialogTitle className="sr-only">
            {authMode === "login" ? "Anmelden" : "Registrieren"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {authMode === "login" ? "Melden Sie sich mit Ihrem Konto an" : "Erstellen Sie ein neues Konto"}
          </DialogDescription>

          {/* Logo area */}
          <div className="flex flex-col items-center pt-8 pb-6 bg-white border-b border-gray-100">
            <img src="/sabitas/logo.png" alt="Sabitas" className="h-14 w-auto object-contain mb-2" />
            <span className="text-xs text-n-500 tracking-widest uppercase mt-0.5">Handgemachte Unikate</span>
          </div>

          {/* Form card */}
          <div className="mx-4 my-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

            {/* Mode Toggle */}
            <div className="flex bg-gray-100 rounded-full p-1 mb-5">
              <button
                onClick={() => setAuthMode("login")}
                className={`flex-1 py-1.5 px-4 rounded-full text-sm font-semibold transition-all duration-200 ${
                  authMode === "login" ? "bg-white text-n-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Anmelden
              </button>
              <button
                onClick={() => setAuthMode("register")}
                className={`flex-1 py-1.5 px-4 rounded-full text-sm font-semibold transition-all duration-200 ${
                  authMode === "register" ? "bg-white text-n-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Registrieren
              </button>
            </div>

            {/* Login Form */}
            {authMode === "login" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-n-900">Anmelden</h2>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Geben Sie Ihre E-Mail-Adresse ein</p>
                  <Input
                    id="loginEmail"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                    className={`rounded-full bg-white border-gray-200 text-gray-900 h-12 px-5 ${loginErrors.email ? "border-red-500" : ""}`}
                    placeholder="E-Mail"
                  />
                  {loginErrors.email && <p className="text-red-500 text-sm mt-1 pl-2">{loginErrors.email}</p>}
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Passwort</p>
                  <div className="relative">
                    <Input
                      id="loginPassword"
                      type={showLoginPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                      className={`rounded-full bg-white border-gray-200 text-gray-900 h-12 px-5 pr-12 ${loginErrors.password ? "border-red-500" : ""}`}
                      placeholder="Ihr Passwort"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </Button>
                  </div>
                  {loginErrors.password && <p className="text-red-500 text-sm mt-1 pl-2">{loginErrors.password}</p>}
                  <button
                    type="button"
                    onClick={openPasswordReset}
                    className="text-sm text-brand underline mt-1.5 pl-1 hover:text-brand-dark"
                  >
                    Passwort vergessen?
                  </button>
                </div>

                <Button
                  onClick={handleLogin}
                  disabled={isLoggingIn || !loginData.email || !loginData.password}
                  className="w-full h-12 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold text-base"
                >
                  {isLoggingIn ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>Anmelden &nbsp;→</>
                  )}
                </Button>

                {loginStatus === "success" && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-green-700 text-sm">{loginMessage}</p>
                  </div>
                )}
                {loginStatus === "error" && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <p className="text-red-700 text-sm">{loginMessage}</p>
                  </div>
                )}
              </div>
            )}

            {/* Register Form */}
            {authMode === "register" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-n-900">Konto erstellen</h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vorname</p>
                    <Input
                      id="firstName"
                      value={registerData.firstName}
                      onChange={(e) => setRegisterData((prev) => ({ ...prev, firstName: e.target.value }))}
                      className={`rounded-full bg-white border-gray-200 text-gray-900 h-11 px-4 ${registerErrors.firstName ? "border-red-500" : ""}`}
                      placeholder="Max"
                    />
                    {registerErrors.firstName && <p className="text-red-500 text-xs mt-1 pl-1">{registerErrors.firstName}</p>}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Nachname</p>
                    <Input
                      id="lastName"
                      value={registerData.lastName}
                      onChange={(e) => setRegisterData((prev) => ({ ...prev, lastName: e.target.value }))}
                      className={`rounded-full bg-white border-gray-200 text-gray-900 h-11 px-4 ${registerErrors.lastName ? "border-red-500" : ""}`}
                      placeholder="Mustermann"
                    />
                    {registerErrors.lastName && <p className="text-red-500 text-xs mt-1 pl-1">{registerErrors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">E-Mail-Adresse</p>
                  <Input
                    id="registerEmail"
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData((prev) => ({ ...prev, email: e.target.value }))}
                    className={`rounded-full bg-white border-gray-200 text-gray-900 h-12 px-5 ${registerErrors.email ? "border-red-500" : ""}`}
                    placeholder="ihre@email.com"
                  />
                  {registerErrors.email && <p className="text-red-500 text-sm mt-1 pl-2">{registerErrors.email}</p>}
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Passwort</p>
                  <div className="relative">
                    <Input
                      id="registerPassword"
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerData.password}
                      onChange={(e) => setRegisterData((prev) => ({ ...prev, password: e.target.value }))}
                      className={`rounded-full bg-white border-gray-200 text-gray-900 h-12 px-5 pr-12 ${registerErrors.password ? "border-red-500" : ""}`}
                      placeholder="Mindestens 6 Zeichen"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent" onClick={() => setShowRegisterPassword(!showRegisterPassword)}>
                      {showRegisterPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </Button>
                  </div>
                  {registerErrors.password && <p className="text-red-500 text-sm mt-1 pl-2">{registerErrors.password}</p>}
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Passwort bestätigen</p>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className={`rounded-full bg-white border-gray-200 text-gray-900 h-12 px-5 pr-12 ${registerErrors.confirmPassword ? "border-red-500" : ""}`}
                      placeholder="Passwort wiederholen"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </Button>
                  </div>
                  {registerErrors.confirmPassword && <p className="text-red-500 text-sm mt-1 pl-2">{registerErrors.confirmPassword}</p>}
                </div>

                <Button
                  onClick={handleRegister}
                  disabled={isRegistering || !registerData.email || !registerData.password || !registerData.firstName || !registerData.lastName}
                  className="w-full h-12 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold text-base"
                >
                  {isRegistering ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>Konto erstellen &nbsp;→</>
                  )}
                </Button>

                {registerStatus === "success" && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-green-700 text-sm">{registerMessage}</p>
                  </div>
                )}
                {registerStatus === "error" && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <p className="text-red-700 text-sm">{registerMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom tagline */}
          <p className="text-center text-sm text-gray-500 pb-6 px-4">
            Auswahl · Qualität · <span className="text-brand font-semibold">Service</span> · Schweiz
          </p>
        </DialogContent>
      </Dialog>

      {/* User Menu Modal */}
      <Dialog open={showUserMenu} onOpenChange={setShowUserMenu}>
        <DialogContent className="p-0 gap-0 sm:max-w-sm bg-n-50 border-0 overflow-hidden rounded-2xl">
          <DialogTitle className="sr-only">Mein Konto</DialogTitle>
          <DialogDescription className="sr-only">Angemeldet als {currentUser?.firstName} {currentUser?.lastName}</DialogDescription>

          {/* Logo area */}
          <div className="flex flex-col items-center pt-8 pb-6 bg-white border-b border-gray-100">
            <img src="/sabitas/logo.png" alt="Sabitas" className="h-14 w-auto object-contain mb-2" />
            <span className="text-xs text-n-500 tracking-widest uppercase mt-0.5">Handgemachte Unikate</span>
          </div>

          {/* Card */}
          <div className="mx-4 my-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6 text-brand" />
              </div>
              <p className="font-bold text-n-900 text-lg">{currentUser?.firstName} {currentUser?.lastName}</p>
              <p className="text-sm text-gray-500">{currentUser?.email}</p>
            </div>

            <Button
              onClick={handleShowProfile}
              className="w-full h-12 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold text-base"
            >
              <Settings className="w-4 h-4 mr-2" />
              Profil anzeigen &nbsp;→
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full h-12 rounded-full border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500 pb-6 px-4">
            Auswahl · Qualität · <span className="text-brand font-semibold">Service</span> · Schweiz
          </p>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={showPasswordReset} onOpenChange={setShowPasswordReset}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <KeyRound className="w-5 h-5 mr-2 text-orange-600" />
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

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handlePasswordReset}
                disabled={isResettingPassword || !resetEmail.trim() || resetStatus === "success"}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
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
                className="flex-1 bg-transparent"
              >
                {resetStatus === "success" ? "Schließen" : "Abbrechen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
