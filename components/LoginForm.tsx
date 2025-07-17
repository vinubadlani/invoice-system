"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Mail, Lock, User, CheckCircle, Copy, Check } from "lucide-react"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [copiedAdmin, setCopiedAdmin] = useState(false)

  const copyAdminCredentials = async () => {
    try {
      await navigator.clipboard.writeText("admin@poshamherbals.com")
      setCopiedAdmin(true)
      setEmail("admin@poshamherbals.com")
      setPassword("admin123456")
      setTimeout(() => setCopiedAdmin(false), 2000)
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user && !data.user.email_confirmed_at && email !== "admin@poshamherbals.com") {
        setError("Please confirm your email address before signing in. Check your inbox for a confirmation link.")
        await supabase.auth.signOut()
        return
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Check Your Email</CardTitle>
            <CardDescription>We've sent you a confirmation link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                A confirmation email has been sent to <strong>{email}</strong>
                <br />
                <br />
                Please click the link in the email to verify your account, then return here to sign in.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full bg-transparent"
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Admin Account Info */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center text-lg">
              <CheckCircle className="h-5 w-5 mr-2" />
              Quick Start - Admin Account
            </CardTitle>
            <CardDescription className="text-green-700">
              Use this pre-configured account to test the application immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-green-800 font-medium">Email:</Label>
                  <div className="text-sm">admin@poshamherbals.com</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyAdminCredentials}
                  className="bg-white hover:bg-green-50"
                >
                  {copiedAdmin ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div>
                <Label className="text-green-800 font-medium">Password:</Label>
                <div className="text-sm">admin123456</div>
              </div>
              <Badge variant="outline" className="bg-white text-green-800 border-green-300">
                Includes sample business data
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Login/Signup Form */}
        <Card>
          <CardHeader>
            <CardTitle>Invoicing & Inventory System</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Database Setup Warning */}
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>First time setup?</strong> Make sure you've run the database setup scripts in your Supabase
            dashboard. The app will guide you through this process if needed.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
