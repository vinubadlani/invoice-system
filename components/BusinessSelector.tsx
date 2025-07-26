"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useOptimizedData } from "@/lib/cache-store"
import { Building2, Plus, Check, ChevronsUpDown, Loader2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setBusinesses(data || [])
      
      // Auto-select business from localStorage or first business
      const storedBusiness = localStorage.getItem("selectedBusiness")
      if (storedBusiness) {
        try {
          const parsed = JSON.parse(storedBusiness)
          const business = data?.find(b => b.id === parsed.id)
          if (business) {
            await selectBusiness(business, false) // Don't preload yet
            return
          }
        } catch (e) {
          localStorage.removeItem("selectedBusiness")
        }
      }
      
      // Select first business if available
      if (data && data.length > 0) {
        await selectBusiness(data[0], false)
      }
    } catch (error) {
      console.error("Error fetching businesses:", error)
      toast({
        title: "Error",
        description: "Failed to load businesses",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const selectBusiness = async (business: Business, shouldPreload = true) => {
    setSelectedBusiness(business)
    localStorage.setItem("selectedBusiness", JSON.stringify(business))
    
    if (shouldPreload) {
      // Preload critical data in background for faster page loads
      preloadCriticalData(business.id).catch(console.error)
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
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const businessData = {
        ...newBusinessForm,
        user_id: user.id
      }

      const { data, error } = await supabase
        .from("businesses")
        .insert([businessData])
        .select()
        .single()

      if (error) throw error

      // Add to businesses list
      setBusinesses(prev => [data, ...prev])
      
      // Select the new business
      await selectBusiness(data)
      
      // Reset form
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
