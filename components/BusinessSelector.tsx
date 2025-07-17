"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "./AuthProvider"
import DatabaseSetup from "./DatabaseSetup"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Building2, AlertCircle, RefreshCw } from "lucide-react"

interface Business {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  gstin: string
  pan: string
  terms_conditions: string
}

interface BusinessSelectorProps {
  onBusinessSelect: (business: Business) => void
}

export default function BusinessSelector({ onBusinessSelect }: BusinessSelectorProps) {
  const { user } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [needsSetup, setNeedsSetup] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    gstin: "",
    pan: "",
    terms_conditions:
      "Payment due within 30 days\nGoods once sold will not be taken back\nInterest @ 18% p.a. will be charged on overdue amounts\nSubject to jurisdiction only",
  })

  const ensureUserExists = useCallback(async () => {
    if (!user) return false

    try {
      // Check if user exists in public.users
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is expected if user doesn't exist
        throw checkError
      }

      if (!existingUser) {
        // Create user in public.users table
        const { error: insertError } = await supabase.from("users").insert([
          {
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || user.email || "User",
          },
        ])

        if (insertError) {
          throw insertError
        }
      }

      return true
    } catch (error: any) {
      console.error("Error ensuring user exists:", error)
      setError(`Failed to create user record: ${error.message}`)
      return false
    }
  }, [user])

  const fetchBusinesses = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")
    setNeedsSetup(false)

    try {
      // Ensure user profile exists before fetching businesses
      const userProfileReady = await ensureUserExists()
      if (!userProfileReady) {
        setLoading(false)
        return // Stop if user profile couldn't be ensured
      }

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)

        // Check if it's a table doesn't exist error
        if (error.message.includes('relation "public.businesses" does not exist') || error.code === "42P01") {
          setNeedsSetup(true)
          setError("") // Clear specific error if it's a setup issue
          return
        }

        throw new Error(`Database error: ${error.message}`)
      }

      setBusinesses(data || [])
    } catch (error: any) {
      console.error("Error fetching businesses:", error)
      setError(error.message || "Failed to load businesses")
    } finally {
      setLoading(false)
    }
  }, [user, ensureUserExists])

  useEffect(() => {
    if (user) {
      fetchBusinesses()
    } else {
      setLoading(false) // If no user, stop loading and show login
      setBusinesses([])
      setNeedsSetup(false)
      setError("")
    }
  }, [user, fetchBusinesses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setError("")

      // Ensure user exists in public.users table first
      const userExists = await ensureUserExists()
      if (!userExists) {
        return
      }

      const { data, error } = await supabase
        .from("businesses")
        .insert([{ ...formData, user_id: user.id }])
        .select()
        .single()

      if (error) {
        console.error("Insert error:", error)
        throw new Error(`Failed to create business: ${error.message}`)
      }

      setBusinesses([data, ...businesses])
      setShowForm(false)
      setFormData({
        name: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        phone: "",
        email: "",
        gstin: "",
        pan: "",
        terms_conditions:
          "Payment due within 30 days\nGoods once sold will not be taken back\nInterest @ 18% p.a. will be charged on overdue amounts\nSubject to jurisdiction only",
      })
    } catch (error: any) {
      console.error("Error creating business:", error)
      setError(error.message || "Failed to create business")
    }
  }

  // Show database setup screen if tables don't exist
  if (needsSetup) {
    return <DatabaseSetup />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Business</h1>
          <p className="text-gray-600">Choose a business to manage or create a new one</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchBusinesses}
                  className="flex items-center space-x-2 bg-transparent"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retry</span>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!showForm && (
          <div className="mb-6">
            <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add New Business</span>
            </Button>
          </div>
        )}

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Business</CardTitle>
              <CardDescription>Enter your business details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pan">PAN</Label>
                  <Input
                    id="pan"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    required
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="terms_conditions">Terms & Conditions</Label>
                  <Textarea
                    id="terms_conditions"
                    rows={4}
                    value={formData.terms_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Business</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business) => (
            <Card key={business.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{business.name}</CardTitle>
                    <CardDescription>
                      {business.city}, {business.state}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>{business.address}</p>
                  <p>Phone: {business.phone}</p>
                  <p>Email: {business.email}</p>
                  {business.gstin && <p>GSTIN: {business.gstin}</p>}
                </div>
                <Button className="w-full mt-4" onClick={() => onBusinessSelect(business)}>
                  Select Business
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {businesses.length === 0 && !showForm && !error && (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses found</h3>
            <p className="text-gray-600 mb-4">Create your first business to get started</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Business
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
