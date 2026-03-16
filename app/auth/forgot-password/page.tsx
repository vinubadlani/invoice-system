"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase, getSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const { toast } = useToast()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const client = getSupabaseClient()
      if (!client) {
        setError("Service temporarily unavailable. Please try again later.")
        return
      }
      
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setEmailSent(true)
      toast({
        title: "Reset email sent!",
        description: "Check your email for password reset instructions.",
      })
    } catch (error) {
      console.error("Reset password error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/landing" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Homepage
            </Link>
            
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                HisabKitab
              </span>
            </div>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Email Sent!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-gray-600 leading-relaxed">
                We've sent password reset instructions to <strong>{email}</strong>. 
                Please check your email and follow the link to reset your password.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  The reset link will expire in 1 hour for security reasons.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Didn't receive the email? Check your spam folder.
                </p>
                
                <Button 
                  variant="outline" 
                  className="w-full h-11"
                  onClick={() => setEmailSent(false)}
                >
                  Try Different Email
                </Button>
              </div>

              <Link href="/auth/login">
                <Button className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  Back to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/auth/login" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Link>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              HisabKitab
            </span>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
          <p className="text-gray-600">Enter your email to reset your password</p>
        </div>

        {/* Reset Form */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-center text-xl text-gray-900">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50 text-red-800">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <p className="text-sm text-gray-500">
                  We'll send you a link to reset your password
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{" "}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-600 mb-2">
              Having trouble? Contact support
            </p>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
              support@hisakitab.com
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
