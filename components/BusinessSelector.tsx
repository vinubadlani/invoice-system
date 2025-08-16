"use client"

import { useState, useEffect } from "react"
import { supabase, getSupabaseClient } from "@/lib/supabase"
import { useOptimizedData } from "@/lib/cache-store"
import { Building2, Plus, Check, ChevronsUpDown, Loader2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Business } from "@/lib/types"

interface BusinessSelectorProps {
  onBusinessChange?: (business: Business) => void
  onBusinessSelect?: (business: Business) => void
  className?: string
}

export default function BusinessSelector({ onBusinessChange, onBusinessSelect, className }: BusinessSelectorProps) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const { preloadCriticalData, clearCache } = useOptimizedData()
  const { toast } = useToast()

  const [newBusinessForm, setNewBusinessForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    gstin: "",
    pan: ""
  })

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const fetchBusinesses = async () => {
    try {
      setLoading(true)
      
      const client = getSupabaseClient()
      if (!client) {
        console.error("Supabase client not available")
        setLoading(false)
        return
      }
      
      // Check authentication first
      const { data: { user }, error: authError } = await client.auth.getUser()
      
      if (authError || !user) {
        console.error('Authentication error:', authError)
        // Redirect to login page
        window.location.href = '/auth/login'
        return
      }

      // Add timeout to prevent hanging
      const fetchPromise = client
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch timeout')), 8000)
      )

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any
      
      if (error) throw error
      
      setBusinesses(data || [])
      
      // Auto-select business logic - optimized
      const storedBusinessId = localStorage.getItem("selectedBusinessId")
      if (storedBusinessId && data && data.length > 0) {
        const business = data.find((b: Business) => b.id === storedBusinessId)
        if (business) {
          await selectBusiness(business, false) // Don't preload on initial load
          return
        } else {
          // Clean up invalid stored business ID
          localStorage.removeItem("selectedBusinessId")
          localStorage.removeItem("selectedBusiness")
        }
      }
      
      // Select first business if available and no stored business
      if (data && data.length > 0) {
        await selectBusiness(data[0], false)
      } else {
        // No businesses found - show creation prompt
        console.log("No businesses found for user")
      }
    } catch (error: any) {
      console.error("Error fetching businesses:", error)
      
      // More specific error handling
      let errorMessage = "Failed to load businesses"
      if (error.message.includes('timeout')) {
        errorMessage = "Loading businesses is taking longer than expected. Please check your connection."
      } else if (error.message.includes('not authenticated') || error.message.includes('Auth session missing')) {
        errorMessage = "Your session has expired. Redirecting to login..."
        toast({
          title: "Session Expired",
          description: "Please log in again to continue",
          variant: "destructive"
        })
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/auth/login'
        }, 2000)
        return
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = "Unable to connect to the server. Please check your internet connection."
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const selectBusiness = async (business: Business, shouldPreload = true) => {
    setSelectedBusiness(business)
    
    // Store both full business object and just ID for faster lookup
    localStorage.setItem("selectedBusiness", JSON.stringify(business))
    localStorage.setItem("selectedBusinessId", business.id)
    
    // Only preload if explicitly requested (not on initial load)
    if (shouldPreload) {
      // Preload critical data in background for faster page loads
      preloadCriticalData(business.id).catch(error => {
        console.warn("Failed to preload data:", error)
      })
    }
    
    onBusinessChange?.(business)
    onBusinessSelect?.(business)
    setOpen(false)
    
    toast({
      title: "Business Selected",
      description: `Switched to ${business.name}`,
    })
  }

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setCreating(true)
      
      const client = getSupabaseClient()
      if (!client) {
        throw new Error("Service temporarily unavailable")
      }
      
      const { data: { user } } = await client.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const businessData = {
        ...newBusinessForm,
        user_id: user.id
      }

      const { data, error } = await client
        .from("businesses")
        .insert([businessData])
        .select()
        .single()

      if (error) throw error

      // Add to businesses list
      setBusinesses(prev => [data as unknown as Business, ...prev])

      // Select the new business
      await selectBusiness(data as unknown as Business)      // Reset form
      setNewBusinessForm({
        name: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        phone: "",
        email: "",
        gstin: "",
        pan: ""
      })
      
      setCreateDialogOpen(false)
      
      toast({
        title: "Success",
        description: "Business created successfully!"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create business",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setNewBusinessForm({
      name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      gstin: "",
      pan: ""
    })
  }

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-600">Loading businesses...</span>
      </div>
    )
  }

  // Show create business prompt if no businesses exist
  if (!loading && businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-blue-800 dark:text-blue-400">Welcome to HisabKitaab!</CardTitle>
            <CardDescription className="dark:text-gray-300">
              Let's create your first business to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              You haven't created any businesses yet. Create your first business to start managing your invoices and transactions.
            </p>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Business
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Business</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateBusiness} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Business Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter business name"
                        value={newBusinessForm.name}
                        onChange={(e) => setNewBusinessForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        placeholder="Enter phone number"
                        value={newBusinessForm.phone}
                        onChange={(e) => setNewBusinessForm(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email (optional)"
                        value={newBusinessForm.email}
                        onChange={(e) => setNewBusinessForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        placeholder="Enter city"
                        value={newBusinessForm.city}
                        onChange={(e) => setNewBusinessForm(prev => ({ ...prev, city: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        placeholder="Enter state"
                        value={newBusinessForm.state}
                        onChange={(e) => setNewBusinessForm(prev => ({ ...prev, state: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        placeholder="Enter pincode"
                        value={newBusinessForm.pincode}
                        onChange={(e) => setNewBusinessForm(prev => ({ ...prev, pincode: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter complete address"
                      value={newBusinessForm.address}
                      onChange={(e) => setNewBusinessForm(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gstin">GSTIN</Label>
                      <Input
                        id="gstin"
                        placeholder="Enter GSTIN (optional)"
                        value={newBusinessForm.gstin}
                        onChange={(e) => setNewBusinessForm(prev => ({ ...prev, gstin: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pan">PAN</Label>
                      <Input
                        id="pan"
                        placeholder="Enter PAN (optional)"
                        value={newBusinessForm.pan}
                        onChange={(e) => setNewBusinessForm(prev => ({ ...prev, pan: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        resetForm()
                        setCreateDialogOpen(false)
                      }}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Business
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-64 justify-between"
          >
            {selectedBusiness ? (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{selectedBusiness.name}</span>
              </div>
            ) : (
              "Select business..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <Command>
            <CommandInput placeholder="Search businesses..." />
            <CommandList>
              <CommandEmpty>No business found.</CommandEmpty>
              <CommandGroup>
                {businesses.map((business) => (
                  <CommandItem
                    key={business.id}
                    value={business.name}
                    onSelect={() => selectBusiness(business)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Building2 className="h-4 w-4" />
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{business.name}</span>
                        <span className="text-xs text-gray-500">
                          {business.city}, {business.state}
                        </span>
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedBusiness?.id === business.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Business
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Create New Business
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateBusiness} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  required
                  placeholder="Enter business name"
                  value={newBusinessForm.name}
                  onChange={(e) => setNewBusinessForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  required
                  placeholder="Enter business address"
                  value={newBusinessForm.address}
                  onChange={(e) => setNewBusinessForm(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  placeholder="Enter city"
                  value={newBusinessForm.city}
                  onChange={(e) => setNewBusinessForm(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  required
                  placeholder="Enter state"
                  value={newBusinessForm.state}
                  onChange={(e) => setNewBusinessForm(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  required
                  placeholder="Enter pincode"
                  value={newBusinessForm.pincode}
                  onChange={(e) => setNewBusinessForm(prev => ({ ...prev, pincode: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  required
                  placeholder="Enter phone number"
                  value={newBusinessForm.phone}
                  onChange={(e) => setNewBusinessForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={newBusinessForm.email}
                  onChange={(e) => setNewBusinessForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  placeholder="Enter GSTIN (optional)"
                  value={newBusinessForm.gstin}
                  onChange={(e) => setNewBusinessForm(prev => ({ ...prev, gstin: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  placeholder="Enter PAN (optional)"
                  value={newBusinessForm.pan}
                  onChange={(e) => setNewBusinessForm(prev => ({ ...prev, pan: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm()
                  setCreateDialogOpen(false)
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Business
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {selectedBusiness && (
        <Badge variant="outline" className="text-xs">
          <Settings className="h-3 w-3 mr-1" />
          Active
        </Badge>
      )}
    </div>
  )
}
