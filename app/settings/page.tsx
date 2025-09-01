"use client"

import { useState, useEffect } from "react"
import { supabase, getSupabaseClient } from "@/lib/supabase"
import { useBusiness } from "@/app/context/BusinessContext"
import { Business } from "@/lib/types"
import { Save, Building, User, Bell, Shield, Palette, Database, FileText, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"

interface UserSettings {
  notifications: boolean
  emailAlerts: boolean
  darkMode: boolean
  autoSave: boolean
  language: string
}

const INVOICE_TEMPLATES = [
  {
    id: "classic",
    name: "Classic Professional",
    description: "Traditional business invoice with clean layout",
    preview: "Simple header, itemized table, clean footer",
    features: ["Company logo top-left", "Billing details right", "Clean table design", "Terms at bottom"],
    type: "invoice"
  },
  {
    id: "modern",
    name: "Modern Minimalist",
    description: "Clean, modern design with gradient accents",
    preview: "Gradient header, modern typography, sleek design",
    features: ["Gradient header", "Modern fonts", "Minimal borders", "Highlighted totals"],
    type: "invoice"
  },
  {
    id: "corporate",
    name: "Corporate Blue",
    description: "Professional corporate template with blue theme",
    preview: "Blue corporate theme, structured layout",
    features: ["Blue color scheme", "Professional layout", "Structured sections", "Corporate branding"],
    type: "invoice"
  },
  {
    id: "elegant",
    name: "Elegant Gray",
    description: "Sophisticated template with elegant styling",
    preview: "Elegant typography, refined layout, premium feel",
    features: ["Elegant typography", "Refined borders", "Premium styling", "Sophisticated layout"],
    type: "invoice"
  },
  {
    id: "receipt",
    name: "Simple Receipt",
    description: "Compact receipt format for small transactions",
    preview: "Compact layout, minimal details, receipt style",
    features: ["Compact design", "Essential details only", "Receipt format", "Small form factor"],
    type: "receipt"
  },
  {
    id: "thermal-receipt",
    name: "Thermal Receipt",
    description: "Thermal printer compatible receipt format",
    preview: "80mm thermal paper format, monospace font",
    features: ["80mm width", "Monospace font", "Thermal printer ready", "POS compatible"],
    type: "receipt"
  },
  {
    id: "shipping-label",
    name: "Shipping Label",
    description: "Professional shipping label with tracking",
    preview: "Large fonts, shipping details, barcode ready",
    features: ["Large readable fonts", "Shipping addresses", "Tracking details", "Barcode space"],
    type: "shipping"
  },
  {
    id: "delivery-note",
    name: "Delivery Note",
    description: "Delivery challan with signature space",
    preview: "Delivery focused, signature area, driver details",
    features: ["Delivery details", "Signature section", "Driver info", "Time stamps"],
    type: "delivery"
  },
  {
    id: "quotation",
    name: "Professional Quotation",
    description: "Business quotation with validity period",
    preview: "Quote details, validity, terms, acceptance",
    features: ["Quote validity", "Terms & conditions", "Acceptance section", "Professional layout"],
    type: "quotation"
  }
]

export default function Settings() {
  const { selectedBusiness: business, updateBusinessData } = useBusiness()
  const [userSettings, setUserSettings] = useState<UserSettings>({
    notifications: true,
    emailAlerts: true,
    darkMode: false,
    autoSave: true,
    language: "en"
  })
  const { toast } = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState("classic")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [localBusiness, setLocalBusiness] = useState<Business | null>(null)

  useEffect(() => {
    loadData()
  }, [business])

  const loadData = async () => {
    try {
      // Use business from context
      if (business) {
        setLocalBusiness(business)
        setSelectedTemplate(business.invoice_template || "classic")
      }
      
      // Load user settings from localStorage
      const savedSettings = localStorage.getItem("userSettings")
      if (savedSettings) {
        setUserSettings(JSON.parse(savedSettings))
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBusinessSave = async () => {
    if (!localBusiness) {
      toast({
        title: "Error",
        description: "No business data to save",
        variant: "destructive"
      })
      return
    }
    
    setSaving(true)
    try {
      const updateData = {
        name: localBusiness.name,
        address: localBusiness.address,
        city: localBusiness.city,
        state: localBusiness.state,
        pincode: localBusiness.pincode,
        phone: localBusiness.phone,
        email: localBusiness.email,
        gstin: localBusiness.gstin,
        pan: localBusiness.pan,
        terms_conditions: localBusiness.terms_conditions,
        invoice_template: selectedTemplate
      }

      console.log("Updating business with ID:", localBusiness.id)
      console.log("Update data:", updateData)

      // Use the context's update function which handles global propagation
      await updateBusinessData(localBusiness.id, updateData)
      
      toast({
        title: "Success",
        description: "Business settings saved successfully!",
      })
    } catch (error: any) {
      console.error("Error saving business settings:", error)
      toast({
        title: "Error", 
        description: error?.message || "Failed to save business settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

    const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    if (localBusiness) {
      setLocalBusiness({ ...localBusiness, invoice_template: templateId })
    }
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        <Tabs defaultValue="business" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="business">
              <Building className="h-4 w-4 mr-2" />
              Business
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="user">
              <User className="h-4 w-4 mr-2" />
              User
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="h-4 w-4 mr-2" />
              Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent>
                {business && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Business Name</Label>
                      <Input
                        id="name"
                        value={localBusiness?.name || ""}
                        onChange={(e) => setLocalBusiness(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={localBusiness?.email || ""}
                        onChange={(e) => setLocalBusiness(prev => prev ? { ...prev, email: e.target.value } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={localBusiness?.phone || ""}
                        onChange={(e) => setLocalBusiness(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gstin">GSTIN</Label>
                      <Input
                        id="gstin"
                        value={localBusiness?.gstin || ""}
                        onChange={(e) => setLocalBusiness(prev => prev ? { ...prev, gstin: e.target.value } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pan">PAN</Label>
                      <Input
                        id="pan"
                        value={localBusiness?.pan || ""}
                        onChange={(e) => setLocalBusiness(prev => prev ? { ...prev, pan: e.target.value } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={localBusiness?.pincode || ""}
                        onChange={(e) => setLocalBusiness(prev => prev ? { ...prev, pincode: e.target.value } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={localBusiness?.city || ""}
                        onChange={(e) => setLocalBusiness(prev => prev ? { ...prev, city: e.target.value } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={localBusiness?.state || ""}
                        onChange={(e) => setLocalBusiness(prev => prev ? { ...prev, state: e.target.value } : null)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={localBusiness?.address || ""}
                        onChange={(e) => setLocalBusiness(prev => prev ? { ...prev, address: e.target.value } : null)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="terms">Terms & Conditions</Label>
                      <Textarea
                        id="terms"
                        rows={4}
                        value={localBusiness?.terms_conditions || ""}
                        onChange={(e) => setLocalBusiness(prev => prev ? { ...prev, terms_conditions: e.target.value } : null)}
                      />
                    </div>
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleBusinessSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Business Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Templates</CardTitle>
                <p className="text-sm text-gray-600">Choose from professional invoice templates for your business</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Invoice Templates */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-600" />
                      Invoice Templates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {INVOICE_TEMPLATES.filter(t => t.type === 'invoice').map((template) => (
                        <Card 
                          key={template.id} 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedTemplate === template.id 
                              ? 'ring-2 ring-blue-500 bg-blue-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              {selectedTemplate === template.id && (
                                <Badge variant="default">Selected</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{template.description}</p>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="bg-white p-3 rounded border border-gray-200 min-h-[80px] flex items-center justify-center text-xs text-gray-500 text-center italic mb-3">
                              {template.preview}
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              {template.features.slice(0, 4).map((feature, index) => (
                                <div key={index} className="flex items-center text-gray-600">
                                  <span className="w-1 h-1 bg-blue-500 rounded-full mr-1"></span>
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Receipt Templates */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Eye className="h-5 w-5 mr-2 text-green-600" />
                      Receipt Templates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {INVOICE_TEMPLATES.filter(t => t.type === 'receipt').map((template) => (
                        <Card 
                          key={template.id} 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedTemplate === template.id 
                              ? 'ring-2 ring-green-500 bg-green-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              {selectedTemplate === template.id && (
                                <Badge variant="secondary">Selected</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{template.description}</p>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="bg-white p-3 rounded border border-gray-200 min-h-[80px] flex items-center justify-center text-xs text-gray-500 text-center italic mb-3">
                              {template.preview}
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              {template.features.slice(0, 4).map((feature, index) => (
                                <div key={index} className="flex items-center text-gray-600">
                                  <span className="w-1 h-1 bg-green-500 rounded-full mr-1"></span>
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Other Document Templates */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Palette className="h-5 w-5 mr-2 text-purple-600" />
                      Other Document Templates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {INVOICE_TEMPLATES.filter(t => !['invoice', 'receipt'].includes(t.type)).map((template) => (
                        <Card 
                          key={template.id} 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedTemplate === template.id 
                              ? 'ring-2 ring-purple-500 bg-purple-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">{template.name}</CardTitle>
                              {selectedTemplate === template.id && (
                                <Badge variant="outline">Selected</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{template.description}</p>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="bg-white p-2 rounded border border-gray-200 min-h-[60px] flex items-center justify-center text-xs text-gray-500 text-center italic mb-2">
                              {template.preview}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-between items-center pt-6 border-t">
                  <div className="text-sm text-gray-600">
                    Selected template: <span className="font-medium">{INVOICE_TEMPLATES.find(t => t.id === selectedTemplate)?.name}</span>
                  </div>
                  <Button onClick={handleBusinessSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Template Selection"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="darkMode">Dark Mode</Label>
                      <p className="text-sm text-gray-500">Toggle dark mode theme</p>
                    </div>
                    <Switch
                      id="darkMode"
                      checked={userSettings.darkMode}
                      onCheckedChange={(checked) => setUserSettings({ ...userSettings, darkMode: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoSave">Auto Save</Label>
                      <p className="text-sm text-gray-500">Automatically save changes</p>
                    </div>
                    <Switch
                      id="autoSave"
                      checked={userSettings.autoSave}
                      onCheckedChange={(checked) => setUserSettings({ ...userSettings, autoSave: checked })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={userSettings.language}
                      onValueChange={(value) => setUserSettings({ ...userSettings, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="gu">Gujarati</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => {
                    localStorage.setItem("userSettings", JSON.stringify(userSettings))
                    alert("User settings saved successfully!")
                  }}>
                    <Save className="h-4 w-4 mr-2" />
                    Save User Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notifications">Push Notifications</Label>
                      <p className="text-sm text-gray-500">Receive browser notifications</p>
                    </div>
                    <Switch
                      id="notifications"
                      checked={userSettings.notifications}
                      onCheckedChange={(checked) => setUserSettings({ ...userSettings, notifications: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailAlerts">Email Alerts</Label>
                      <p className="text-sm text-gray-500">Receive email notifications</p>
                    </div>
                    <Switch
                      id="emailAlerts"
                      checked={userSettings.emailAlerts}
                      onCheckedChange={(checked) => setUserSettings({ ...userSettings, emailAlerts: checked })}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => {
                    localStorage.setItem("userSettings", JSON.stringify(userSettings))
                    alert("Notification settings saved successfully!")
                  }}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Notification Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900">Backup Data</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Export all your business data as a JSON file for backup purposes
                    </p>
                    <Button onClick={async () => {
                      try {
                        if (!localBusiness) return
                        
                        const client = getSupabaseClient()
                        if (!client) {
                          toast({
                            title: "Error",
                            description: "Service temporarily unavailable. Please try again later.",
                            variant: "destructive",
                          })
                          return
                        }
                        
                        // Export all business data with proper error handling
                        const { data: parties } = await client
                          .from("parties")
                          .select("*")
                          .eq("business_id", localBusiness.id)

                        const { data: items } = await client
                          .from("items")
                          .select("*")
                          .eq("business_id", localBusiness.id)

                        const { data: invoices } = await client
                          .from("invoices")
                          .select("*")
                          .eq("business_id", localBusiness.id)

                        const { data: payments } = await client
                          .from("payments")
                          .select("*")
                          .eq("business_id", localBusiness.id)

                        const backupData = {
                          business: localBusiness,
                          parties,
                          items,
                          invoices,
                          payments,
                          exportDate: new Date().toISOString()
                        }

                        // Download as JSON file
                        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `${localBusiness.name}_backup_${new Date().toISOString().split('T')[0]}.json`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      } catch (error) {
                        console.error("Error creating backup:", error)
                        alert("Error creating backup")
                      }
                    }} className="mt-3">
                      <Database className="h-4 w-4 mr-2" />
                      Download Backup
                    </Button>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-900">Data Storage</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your data is securely stored in Supabase cloud database
                    </p>
                    <div className="mt-2 text-sm text-yellow-800">
                      <p>• Automatic daily backups</p>
                      <p>• 99.9% uptime guarantee</p>
                      <p>• End-to-end encryption</p>
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-red-900">Danger Zone</h3>
                    <p className="text-sm text-red-700 mt-1">
                      These actions cannot be undone
                    </p>
                    <Button variant="destructive" className="mt-3" disabled>
                      <Shield className="h-4 w-4 mr-2" />
                      Delete All Data (Coming Soon)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}