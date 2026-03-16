"use client"

import type React from "react"

import { useState } from "react"
import { supabase, getSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, Mail, Lock, User, CheckCircle, Copy, Check, Eye, EyeOff, Shield, KeyRound, Building2 } from "lucide-react"
import Image from "next/image"

// Password strength checker
const checkPasswordStrength = (password: string) => {
  let score = 0
  const feedback = []
  
  if (password.length >= 8) score += 20
  else feedback.push("At least 8 characters")
  
  if (/[a-z]/.test(password)) score += 20
  else feedback.push("Lowercase letter")
  
  if (/[A-Z]/.test(password)) score += 20
  else feedback.push("Uppercase letter")
  
  if (/\d/.test(password)) score += 20
  else feedback.push("Number")
  
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20
  else feedback.push("Special character")
  
  return { score, feedback }
}

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [copiedAdmin, setCopiedAdmin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] as string[] })

  const copyAdminCredentials = async () => {
    try {
      await navigator.clipboard.writeText("admin@hisabkitaab.com")
      setCopiedAdmin(true)
      setEmail("admin@hisabkitaab.com")
      setPassword("admin123456")
      setTimeout(() => setCopiedAdmin(false), 2000)
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword)
    const strength = checkPasswordStrength(newPassword)
    setPasswordStrength(strength)
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    // Client-side validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    if (!fullName.trim() || fullName.length < 2) {
      setError("Please enter your full name (at least 2 characters)")
      setLoading(false)
      return
    }

    try {
      const client = getSupabaseClient()
      if (!client) {
        setError("Service temporarily unavailable. Please try again later.")
        setLoading(false)
        return
      }
      
      const { data, error } = await client.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (error) throw error

      if (data.user && !data.user.email_confirmed_at) {
        setShowConfirmation(true)
        setMessage("Please check your email and click the confirmation link to complete your registration.")
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    // Client-side validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    if (!password) {
      setError("Please enter your password")
      setLoading(false)
      return
    }

    try {
      const client = getSupabaseClient()
      if (!client) {
        setError("Unable to connect to authentication service")
        setLoading(false)
        return
      }

      // Add timeout to prevent hanging login
      const signInPromise = client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timeout - please try again')), 10000)
      )

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as any

      if (error) throw error

      // Skip email confirmation check for faster login (handle it in auth state)
      if (data.user && !data.user.email_confirmed_at && email.trim().toLowerCase() !== "admin@hisabkitaab.com") {
        setError("Please confirm your email address before signing in. Check your inbox for a confirmation link.")
        await client.auth.signOut()
        return
      }

      // Success - let AuthProvider handle the rest
    } catch (error: any) {
      console.error('Sign in error:', error)
      
      // Better error messages
      let errorMessage = error.message
      if (error.message.includes('timeout')) {
        errorMessage = 'Sign in is taking longer than expected. Please check your connection and try again.'
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="w-full max-w-md shadow-xl dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center">
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-800 dark:text-green-400">Check Your Email</CardTitle>
            <CardDescription className="dark:text-gray-300">We've sent you a confirmation link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                A confirmation email has been sent to <strong>{email}</strong>
                <br />
                <br />
                Please click the link in the email to verify your account, then return here to sign in.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
              onClick={() => {
                setShowConfirmation(false)
                setEmail("")
                setPassword("")
                setFullName("")
              }}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Enhanced Header with 40% Bigger Logo */}
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <div className="relative w-44 h-44">
              <Image
                src="/logo.png"
                alt="Hisab Kitaab Logo"
                width={180}
                height={180}
                className="dark:hidden object-contain"
                priority
              />
              <Image
                src="/logo2.png"
                alt="Hisab Kitaab Logo"
                width={180}
                height={180}
                className="hidden dark:block object-contain"
                priority
              />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Hisab Kitaab
            </h1>
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
              <Building2 className="h-4 w-4" />
              <p className="text-sm">Secure Invoicing & Accounting System</p>
            </div>
          </div>
        </div>

        {/* Admin Account Info */}
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-400 flex items-center text-lg">
              <CheckCircle className="h-5 w-5 mr-2" />
              Quick Start - Admin Account
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Use this pre-configured account to test the application immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <Label className="text-green-800 dark:text-green-400 font-medium">Email:</Label>
                  <div className="text-sm font-mono dark:text-gray-300">admin@hisabkitaab.com</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyAdminCredentials}
                  className="bg-white hover:bg-green-50 border-green-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  {copiedAdmin ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="p-3 bg-white/70 dark:bg-gray-800/50 rounded-lg">
                <Label className="text-green-800 dark:text-green-400 font-medium">Password:</Label>
                <div className="text-sm font-mono dark:text-gray-300">admin123456</div>
              </div>
              <Badge variant="outline" className="bg-white text-green-800 border-green-300 dark:bg-gray-800 dark:text-green-400 dark:border-green-700">
                <KeyRound className="h-3 w-3 mr-1" />
                Includes sample business data
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Login/Signup Form */}
        <Card className="shadow-xl border-0 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white rounded-t-lg">
            <CardTitle className="text-center">Welcome Back</CardTitle>
            <CardDescription className="text-blue-100 dark:text-blue-200 text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 dark:bg-gray-700">
                <TabsTrigger value="signin" className="flex items-center gap-2 dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white">
                  <Lock className="h-4 w-4" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2 dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white">
                  <User className="h-4 w-4" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="dark:text-gray-200">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="dark:text-gray-200">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-10 w-10 dark:hover:bg-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-700 dark:to-purple-700 dark:hover:from-blue-800 dark:hover:to-purple-800" disabled={loading}>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Signing in...
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="dark:text-gray-200">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10 h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        required
                        minLength={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="dark:text-gray-200">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="dark:text-gray-200">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a secure password"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        className="pl-10 pr-10 h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        minLength={6}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-10 w-10 dark:hover:bg-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Password strength</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {passwordStrength.score < 40 ? 'Weak' : 
                             passwordStrength.score < 80 ? 'Medium' : 'Strong'}
                          </span>
                        </div>
                        <Progress 
                          value={passwordStrength.score} 
                          className="h-2"
                        />
                        {passwordStrength.feedback.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Missing: {passwordStrength.feedback.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-700 dark:to-purple-700 dark:hover:from-blue-800 dark:hover:to-purple-800" 
                    disabled={loading || passwordStrength.score < 40}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating account...
                      </div>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mt-4 dark:border-red-800 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="dark:text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="mt-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-300">{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-400">Security Notice</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Your data is protected with enterprise-grade security. All communications are encrypted and your passwords are never stored in plain text.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Setup Warning */}
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            <strong>First time setup?</strong> Make sure you've run the database setup scripts in your Supabase
            dashboard. The app will guide you through this process if needed.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
