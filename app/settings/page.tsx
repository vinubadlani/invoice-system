"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Save, Building, User, Bell, Shield, Palette, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"

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

interface UserSettings {
  notifications: boolean
  emailAlerts: boolean
  darkMode: boolean
  autoSave: boolean
  language: string
}

export default function Settings() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("")
  const [userSettings, setUserSettings] = useState<UserSettings>({
    notifications: true,
    emailAlerts: true,
    darkMode: false,
    autoSave: true,
    language: "en"
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusiness(business)
      loadBankAccounts(business.id)
    }
    
    // Load user settings from localStorage
    const savedSettings = localStorage.getItem("userSettings")
    if (savedSettings) {
      setUserSettings(JSON.parse(savedSettings))
    }

    // Load selected bank account for invoices
    const savedBankAccount = localStorage.getItem("selectedBankAccountForInvoices")
    if (savedBankAccount) {
      setSelectedBankAccount(savedBankAccount)
    }
    
    setLoading(false)
  }, [])

  const loadBankAccounts = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("bank_name")

      if (error) {
        // Handle table not found error gracefully
        if (error.code === 'PGRST116' || error.message.includes('relation "public.bank_accounts" does not exist')) {
          console.warn("Bank accounts table not found. Skipping bank account loading.")
          setBankAccounts([])
          return
        }
        throw error
      }
      setBankAccounts(data || [])
    } catch (error) {
      console.error("Error loading bank accounts:", error)
      setBankAccounts([])
    }
  }

  const handleBusinessSave = async () => {
    if (!business) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name: business.name,
          address: business.address,
          city: business.city,
          state: business.state,
          pincode: business.pincode,
          phone: business.phone,
          email: business.email,
          gstin: business.gstin,
          pan: business.pan,
          terms_conditions: business.terms_conditions
        })
        .eq("id", business.id)

      if (error) throw error

      // Update localStorage
      localStorage.setItem("selectedBusiness", JSON.stringify(business))
      
      alert("Business settings saved successfully!")
    } catch (error) {
      console.error("Error saving business settings:", error)
      alert("Error saving business settings")
    } finally {
      setSaving(false)
    }
  }

  const handleUserSettingsSave = () => {
    localStorage.setItem("userSettings", JSON.stringify(userSettings))
    alert("User settings saved successfully!")
  }

  const handleBackupData = async () => {
    try {
      if (!business) return
      
      // Export all business data
      const { data: parties } = await supabase
        .from("parties")
        .select("*")
        .eq("business_id", business.id)

      const { data: items } = await supabase
        .from("items")
        .select("*")
        .eq("business_id", business.id)

      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("business_id", business.id)

      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("business_id", business.id)

      const backupData = {
        business,
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
      a.download = `${business.name}_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error creating backup:", error)
      alert("Error creating backup")
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="business">
              <Building className="h-4 w-4 mr-2" />
              Business
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
                        value={business.name}
                        onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={business.email}
                        onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={business.phone}
                        onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gstin">GSTIN</Label>
                      <Input
                        id="gstin"
                        value={business.gstin}
                        onChange={(e) => setBusiness({ ...business, gstin: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pan">PAN</Label>
                      <Input
                        id="pan"
                        value={business.pan}
                        onChange={(e) => setBusiness({ ...business, pan: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={business.pincode}
                        onChange={(e) => setBusiness({ ...business, pincode: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={business.city}
                        onChange={(e) => setBusiness({ ...business, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={business.state}
                        onChange={(e) => setBusiness({ ...business, state: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={business.address}
                        onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="terms">Terms & Conditions</Label>
                      <Textarea
                        id="terms"
                        rows={4}
                        value={business.terms_conditions}
                        onChange={(e) => setBusiness({ ...business, terms_conditions: e.target.value })}
                      />
                    </div>
                    
                    {/* Bank Account Selection for Invoices */}
                    <div className="md:col-span-2">
                      <Label htmlFor="bankAccount">Default Bank Account for Invoices</Label>
                      <Select
                        value={selectedBankAccount}
                        onValueChange={(value) => {
                          setSelectedBankAccount(value)
                          localStorage.setItem("selectedBankAccountForInvoices", value)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank account for invoices" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.bank_name} - {account.account_number} ({account.account_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 mt-1">
                        This bank account will be shown on all invoices
                      </p>
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
                  <Button onClick={handleUserSettingsSave}>
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
                  <Button onClick={handleUserSettingsSave}>
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
                    <Button onClick={handleBackupData} className="mt-3">
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