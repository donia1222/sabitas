"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Eye, EyeOff, Mail, KeyRound, CheckCircle, AlertCircle } from 'lucide-react'

interface LoginProps {
  isOpen?: boolean
  onClose?: () => void
  onLoginSuccess?: (userData: any) => void
  initialEmail?: string
  API_BASE_URL?: string
  showAsCard?: boolean
  title?: string
}

interface UserData {
  id: number
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

export function Login({ 
  isOpen = true,
  onClose,
  onLoginSuccess,
  initialEmail = "",
  API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL,
  showAsCard = false,
  title = "Anmelden"
}: LoginProps) {
  // Login states
  const [loginData, setLoginData] = useState({
    email: initialEmail,
    password: "",
  })
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginErrors, setLoginErrors] = useState<any>({})
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginStatus, setLoginStatus] = useState<"idle" | "success" | "error">("idle")
  const [loginMessage, setLoginMessage] = useState("")

  // Password Reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetStatus, setResetStatus] = useState<"idle" | "success" | "error">("idle")
  const [resetMessage, setResetMessage] = useState("")
  const [resetErrors, setResetErrors] = useState<any>({})

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

        // Preparar datos del usuario
        const userData: UserData = {
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

        setLoginStatus("success")
        setLoginMessage("¡Anmeldung erfolgreich!")

        // Limpiar datos de login
        setLoginData({
          email: "",
          password: "",
        })

        console.log("✅ Login exitoso")

        // Llamar callback de éxito
        if (onLoginSuccess) {
          onLoginSuccess({
            sessionToken,
            user: userData
          })
        }

        // Cerrar modal después de un breve delay
        setTimeout(() => {
          if (onClose) onClose()
        }, 1000)

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

  const LoginForm = () => (
    <div className="space-y-4">
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
            className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto"
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
      <div className="pt-4">
        <Button
          onClick={handleLogin}
          disabled={isLoggingIn || !loginData.email || !loginData.password}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
      {loginStatus === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <p className="text-green-700 font-medium">Anmeldung erfolgreich!</p>
              <p className="text-green-600 text-sm mt-1">Sie werden weitergeleitet...</p>
            </div>
          </div>
        </div>
      )}

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

      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Nach der Anmeldung:</strong>
        </p>
        <ul className="text-sm text-blue-600 mt-1 space-y-1">
          <li>• Ihre Daten werden automatisch ausgefüllt</li>
          <li>• Schnellerer Checkout-Prozess</li>
          <li>• Zugriff auf Ihr Profil und Bestellhistorie</li>
        </ul>
      </div>
    </div>
  )

  // Si se muestra como Card (para uso independiente)
  if (showAsCard) {
    return (
      <>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        {/* Password Reset Modal */}
        <Dialog open={showPasswordReset} onOpenChange={setShowPasswordReset}>
          <DialogContent className="sm:max-w-md">
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

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-blue-800 font-medium mb-2">ℹ️ Wichtige Hinweise:</h4>
                <ul className="text-blue-700 text-sm space-y-1">
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
                  className="flex-1"
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

  // Si se muestra como Modal (para uso en checkout u otros componentes)
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              {title}
            </DialogTitle>
            <DialogDescription>
              Melden Sie sich mit Ihren Zugangsdaten an.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <LoginForm />
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={showPasswordReset} onOpenChange={setShowPasswordReset}>
        <DialogContent className="sm:max-w-md">
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

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-blue-800 font-medium mb-2">ℹ️ Wichtige Hinweise:</h4>
              <ul className="text-blue-700 text-sm space-y-1">
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
                className="flex-1"
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
