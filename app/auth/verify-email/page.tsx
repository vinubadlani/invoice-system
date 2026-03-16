"use client"

import Link from "next/link"
import { Building2, Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
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

        {/* Verification Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600 leading-relaxed">
              We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    What's next?
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Check your email inbox</li>
                    <li>• Click the verification link</li>
                    <li>• Complete your account setup</li>
                    <li>• Start using HisabKitab</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or request a new one.
              </p>
              
              <Button 
                variant="outline" 
                className="w-full h-11"
                onClick={() => {
                  // TODO: Implement resend verification email
                  alert("Resend verification email functionality will be implemented soon!")
                }}
              >
                Resend Verification Email
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                Already verified your email?
              </p>
              <Link href="/auth/login">
                <Button className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  Sign In to Your Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-600 mb-2">
              Need help? Contact our support team
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
