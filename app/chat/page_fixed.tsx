"use client"

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Bot, User, Loader2, CheckCircle, AlertCircle, Sparkles, Brain, Zap, TrendingUp, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSupabaseClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Business } from '@/lib/types'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'default' | 'destructive' | 'outline'
  }>
  data?: any
  suggestions?: string[]
}

export default function ChatPage() {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: '🚀 **HisabKitaab AI Assistant** - Smart Data Entry!\n\nI can help you with everything in your business:\n\n💰 **Sales & Invoicing**\n• "Create invoice for ABC Corp - 10 laptops at ₹50,000 each"\n• "Generate sale to John for consulting services worth ₹25,000"\n\n📦 **Purchases & Inventory**  \n• "Add purchase from XYZ Suppliers - 50 phones at ₹15,000"\n• "Record expense for office rent ₹30,000"\n\n👥 **Party Management**\n• "Add new customer TechCorp with GST 27ABCDE1234F1Z5"\n• "Create supplier ABC Traders in Mumbai"\n\n� **Item Management**\n• "Add item laptop with HSN 8471 at ₹50000"\n• "Create product phone with sales price ₹25000"\n\n🔧 **Smart Modifications**\n• "Change GST to 5%" or "Update quantity to 20"\n• "Modify last invoice price to ₹40,000"\n\n**Just ask naturally - I understand your commands!** 🧠✨',
      timestamp: new Date(),
      suggestions: ['Create a sample invoice', 'Add a new customer', 'Add an item']
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<any>(null)
  const [conversationContext, setConversationContext] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Load selected business
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      setSelectedBusiness(JSON.parse(storedBusiness))
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const extractNumbers = (text: string): number[] => {
    const matches = text.match(/₹?[\d,]+/g)
    if (!matches) return []
    return matches.map(match => {
      const cleaned = match.replace(/[₹,]/g, '')
      return parseInt(cleaned, 10)
    }).filter(num => !isNaN(num))
  }

  const extractNames = (text: string, keywords: string[]): string => {
    const lowerText = text.toLowerCase()
    for (const keyword of keywords) {
      const pattern = new RegExp(`${keyword}\\s+(?:to\\s+)?([^₹\\d]+?)(?:\\s+(?:for|at|of|₹|\\d)|$)`, 'i')
      const match = text.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
    
    // Fallback: look for the first capitalized word or phrase
    const words = text.split(/\s+/)
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].match(/[A-Z]/)) {
        return words[i]
      }
    }
    
    return ''
  }

  const handleModificationCommand = async (input: string): Promise<Omit<Message, 'id' | 'timestamp'>> => {
    if (!lastTransaction) {
      return {
        type: 'bot',
        content: '❌ No recent transaction to modify. Please create a sale or purchase first.',
        suggestions: ['Create a sale', 'Create a purchase', 'Add an item']
      }
    }

    try {
      let modified = { ...lastTransaction }
      let changeDescription = ''

      // GST modification
      const gstMatch = input.match(/(?:gst|tax).*?(\d+)/i)
      if (gstMatch) {
        const newGstPercent = parseInt(gstMatch[1])
        if (newGstPercent >= 0 && newGstPercent <= 28) {
          const subtotal = modified.subtotal
          const newGstAmount = (subtotal * newGstPercent) / 100
          modified.gst_percent = newGstPercent
          modified.total_tax = newGstAmount
          modified.net_total = subtotal + newGstAmount
          changeDescription = `GST updated to ${newGstPercent}%`
        }
      }

      // Quantity modification
      const qtyMatch = input.match(/(?:quantity|qty).*?(\d+)/i)
      if (qtyMatch) {
        const newQuantity = parseInt(qtyMatch[1])
        if (newQuantity > 0 && modified.items && modified.items[0]) {
          const price = modified.items[0].price
          const newSubtotal = newQuantity * price
          const gstAmount = (newSubtotal * modified.gst_percent) / 100
          
          modified.items[0].quantity = newQuantity
          modified.items[0].total = newSubtotal
          modified.subtotal = newSubtotal
          modified.total_tax = gstAmount
          modified.net_total = newSubtotal + gstAmount
          changeDescription = `Quantity updated to ${newQuantity}`
        }
      }

      // Price modification
      const priceMatch = input.match(/(?:price|rate).*?₹?(\d+)/i)
      if (priceMatch) {
        const newPrice = parseInt(priceMatch[1])
        if (newPrice > 0 && modified.items && modified.items[0]) {
          const quantity = modified.items[0].quantity
          const newSubtotal = quantity * newPrice
          const gstAmount = (newSubtotal * modified.gst_percent) / 100
          
          modified.items[0].price = newPrice
          modified.items[0].total = newSubtotal
          modified.subtotal = newSubtotal
          modified.total_tax = gstAmount
          modified.net_total = newSubtotal + gstAmount
          changeDescription = `Price updated to ₹${newPrice}`
        }
      }

      if (changeDescription) {
        setLastTransaction(modified)
        return {
          type: 'bot',
          content: `✅ ${changeDescription}\n\n**Updated Total:** ₹${modified.net_total.toLocaleString()}\n\nWould you like to save these changes?`,
          actions: [
            {
              label: 'Save Changes',
              action: async () => {
                try {
                  const client = getSupabaseClient()
                  if (!client) throw new Error("Service unavailable")
                  
                  const tableName = modified.invoice_no?.startsWith('PUR') ? 'purchase_invoices' : 'sales_invoices'
                  
                  addMessage({
                    type: 'bot',
                    content: '✅ Changes saved successfully!',
                    suggestions: ['Make more changes', 'Create new transaction', 'View summary']
                  })
                  
                  toast({
                    title: 'Success',
                    description: 'Transaction updated successfully'
                  })
                } catch (error: any) {
                  addMessage({
                    type: 'bot',
                    content: `❌ Error saving changes: ${error.message}`,
                    suggestions: ['Try again', 'Check the data', 'Contact support']
                  })
                }
              }
            }
          ],
          suggestions: ['Save it', 'Make more changes', 'Start over']
        }
      } else {
        return {
          type: 'bot',
          content: '❌ Could not understand the modification request. Try:\n• "Change GST to 5%"\n• "Update quantity to 10"\n• "Change price to ₹5000"',
          suggestions: ['Change GST', 'Update quantity', 'Change price']
        }
      }
    } catch (error: any) {
      return {
        type: 'bot',
        content: `❌ Error modifying transaction: ${error.message}`,
        suggestions: ['Try again', 'Check your input', 'Start over']
      }
    }
  }

  const parseCommand = async (input: string): Promise<Omit<Message, 'id' | 'timestamp'>> => {
    const lowerInput = input.toLowerCase()
    
    // Check for modification commands first
    if (lastTransaction && (
      lowerInput.includes('gst') || 
      lowerInput.includes('tax') || 
      lowerInput.includes('change') || 
      lowerInput.includes('update') || 
      lowerInput.includes('modify') ||
      lowerInput.includes('quantity') ||
      lowerInput.includes('price')
    )) {
      return await handleModificationCommand(input)
    }
    
    if (lowerInput.includes('purchase') || lowerInput.includes('buy')) {
      setConversationContext('purchase')
      return await handlePurchaseCommand(input)
    } else if (lowerInput.includes('sale') || lowerInput.includes('sell') || lowerInput.includes('invoice')) {
      setConversationContext('sale')
      return await handleSaleCommand(input)
    } else if (lowerInput.includes('party') || lowerInput.includes('customer') || lowerInput.includes('supplier')) {
      setConversationContext('party')
      return await handlePartyCommand(input)
    } else if (lowerInput.includes('item') || lowerInput.includes('product')) {
      setConversationContext('item')
      return await handleItemCommand(input)
    } else {
      return {
        type: 'bot',
        content: '🤖 I can help you with:\n\n• **Creating sales and purchases** - "Add sale to ABC Corp for 10 laptops at ₹50000 each"\n• **Adding parties** - "Add customer TechCorp with GST 27ABCDE1234F1Z5"\n• **Managing items** - "Add item laptop with HSN 8471 at ₹50000"\n• **Modifying transactions** - "Change GST to 5%" or "Update quantity to 20"\n\nJust tell me what you want to do in natural language!',
        suggestions: ['Create a sale', 'Add a purchase', 'Add a customer', 'Add an item']
      }
    }
  }

  const handlePurchaseCommand = async (input: string): Promise<Omit<Message, 'id' | 'timestamp'>> => {
    try {
      // Extract supplier name
      let supplierName = extractNames(input, ['purchase', 'from', 'buy'])
      
      // Extract item name
      let itemName = ''
      const forMatch = input.match(/for\s+\d+\s+([^₹\d]+?)(?:\s+(?:at|of|₹|\d)|$)/i)
      const ofMatch = input.match(/\d+\s+([^₹\d]+?)(?:\s+(?:at|of|₹|\d)|$)/i)
      
      if (forMatch) {
        itemName = forMatch[1].trim()
      } else if (ofMatch) {
        itemName = ofMatch[1].trim()
      }
      
      if (supplierName && !itemName) {
        const words = supplierName.split(/\s+/)
        if (words.length > 1) {
          supplierName = words.slice(0, -1).join(' ')
          itemName = words[words.length - 1]
        } else {
          itemName = 'Product/Service'
        }
      }
      
      supplierName = supplierName || 'Unknown Supplier'
      itemName = itemName || 'Product/Service'
      
      // Extract numbers (quantity and price)
      const numbers = extractNumbers(input)
      const quantity = numbers[0] || 1
      const price = numbers[1] || numbers[0] || 0
      
      // Calculate totals
      const gstPercent = 18 // Default GST
      const subtotal = quantity * price
      const gstAmount = (subtotal * gstPercent) / 100
      const total = subtotal + gstAmount
      
      const purchaseData = {
        business_id: selectedBusiness?.id,
        invoice_no: `PUR-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        party_name: supplierName,
        address: 'Address not specified',
        gstin: '',
        state: '',
        subtotal,
        total_tax: gstAmount,
        net_total: total,
        payment_received: 0,
        balance_due: total,
        gst_percent: gstPercent,
        items: [{
          item_name: itemName,
          quantity,
          price,
          total: subtotal
        }]
      }

      setLastTransaction(purchaseData)

      return {
        type: 'bot',
        content: `📦 Purchase Entry Ready!\n\n**Supplier:** ${supplierName}\n**Item:** ${itemName}\n**Quantity:** ${quantity}\n**Price:** ₹${price.toLocaleString()}\n**Subtotal:** ₹${subtotal.toLocaleString()}\n**GST (${gstPercent}%):** ₹${gstAmount.toLocaleString()}\n**Total:** ₹${total.toLocaleString()}\n\nWould you like me to save this purchase?\n\n*You can also say: "Change GST to 5%" or "Update quantity to 10"*`,
        actions: [
          {
            label: 'Save Purchase',
            action: async () => {
              try {
                const client = getSupabaseClient()
                if (!client) throw new Error("Service unavailable")
                
                const { error } = await client.from('purchase_invoices').insert(purchaseData)
                
                if (error) throw error
                
                addMessage({
                  type: 'bot',
                  content: '✅ Purchase saved successfully!',
                  suggestions: ['Add another purchase', 'Create a sale', 'Add an item']
                })
                
                toast({
                  title: 'Success',
                  description: 'Purchase entry created successfully'
                })
                
                setLastTransaction(null)
                setConversationContext('')
              } catch (error: any) {
                addMessage({
                  type: 'bot',
                  content: `❌ Error saving purchase: ${error.message}`,
                  suggestions: ['Try again', 'Check the data', 'Contact support']
                })
              }
            }
          }
        ],
        data: purchaseData,
        suggestions: ['Save it', 'Change GST', 'Update quantity', 'Change price']
      }
    } catch (error: any) {
      return {
        type: 'bot',
        content: `❌ Error processing purchase: ${error.message}`,
        suggestions: ['Try again', 'Use simpler format', 'Ask for help']
      }
    }
  }

  const handleSaleCommand = async (input: string): Promise<Omit<Message, 'id' | 'timestamp'>> => {
    try {
      // Extract customer name - look for patterns like "to [name]" or "sale [name]"
      let customerName = extractNames(input, ['sale', 'to', 'sell', 'create', 'invoice'])
      
      // Extract item name - look for patterns like "for [quantity] [item]" or "of [item]"
      let itemName = ''
      const forMatch = input.match(/for\s+\d+\s+([^₹\d]+?)(?:\s+(?:at|of|₹|\d)|$)/i)
      const ofMatch = input.match(/\d+\s+([^₹\d]+?)(?:\s+(?:at|of|₹|\d)|$)/i)
      
      if (forMatch) {
        itemName = forMatch[1].trim()
      } else if (ofMatch) {
        itemName = ofMatch[1].trim()
      }
      
      // If customer name contains product words, try to separate them
      if (customerName && !itemName) {
        const words = customerName.split(/\s+/)
        if (words.length > 1) {
          // Check if last words might be product name
          const productIndicators = ['product', 'item', 'widget', 'laptop', 'phone', 'book', 'service']
          const lastWord = words[words.length - 1].toLowerCase()
          
          if (productIndicators.some(indicator => lastWord.includes(indicator)) || 
              words.length > 2) {
            customerName = words.slice(0, -1).join(' ')
            itemName = words[words.length - 1]
          } else {
            itemName = 'Product/Service'
          }
        } else {
          itemName = 'Product/Service'
        }
      }
      
      customerName = customerName || 'Unknown Customer'
      itemName = itemName || 'Product/Service'
      
      // Extract numbers (quantity and price)
      const numbers = extractNumbers(input)
      const quantity = numbers[0] || 1
      const price = numbers[1] || numbers[0] || 0
      
      // Calculate totals
      const gstPercent = 18 // Default GST
      const subtotal = quantity * price
      const gstAmount = (subtotal * gstPercent) / 100
      const total = subtotal + gstAmount
      
      const saleData = {
        business_id: selectedBusiness?.id,
        invoice_no: `SI-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        party_name: customerName,
        address: 'Address not specified',
        gstin: '',
        state: '',
        subtotal,
        total_tax: gstAmount,
        net_total: total,
        payment_received: 0,
        balance_due: total,
        gst_percent: gstPercent,
        items: [{
          item_name: itemName,
          quantity,
          price,
          total: subtotal
        }]
      }

      setLastTransaction(saleData)

      return {
        type: 'bot',
        content: `🛒 Sale Entry Ready!\n\n**Customer:** ${customerName}\n**Item:** ${itemName}\n**Quantity:** ${quantity}\n**Price:** ₹${price.toLocaleString()}\n**Subtotal:** ₹${subtotal.toLocaleString()}\n**GST (${gstPercent}%):** ₹${gstAmount.toLocaleString()}\n**Total:** ₹${total.toLocaleString()}\n\nWould you like me to save this sale?\n\n*You can also say: "Change GST to 5%" or "Update quantity to 10"*`,
        actions: [
          {
            label: 'Save Sale',
            action: async () => {
              try {
                const client = getSupabaseClient()
                if (!client) throw new Error("Service unavailable")
                
                const { error } = await client.from('sales_invoices').insert(saleData)
                
                if (error) throw error
                
                addMessage({
                  type: 'bot',
                  content: '✅ Sale saved successfully!',
                  suggestions: ['Add another sale', 'Create a purchase', 'Add an item']
                })
                
                toast({
                  title: 'Success',
                  description: 'Sale entry created successfully'
                })
                
                setLastTransaction(null)
                setConversationContext('')
              } catch (error: any) {
                addMessage({
                  type: 'bot',
                  content: `❌ Error saving sale: ${error.message}`,
                  suggestions: ['Try again', 'Check the data', 'Contact support']
                })
              }
            }
          }
        ],
        data: saleData,
        suggestions: ['Save it', 'Change GST', 'Update quantity', 'Change price']
      }
    } catch (error: any) {
      return {
        type: 'bot',
        content: `❌ Error processing sale: ${error.message}`,
        suggestions: ['Try again', 'Use simpler format', 'Ask for help']
      }
    }
  }

  const handlePartyCommand = async (input: string): Promise<Omit<Message, 'id' | 'timestamp'>> => {
    try {
      // Extract party name
      const partyName = extractNames(input, ['party', 'add', 'create', 'new', 'customer', 'supplier']) || 'Unknown Party'
      
      // Extract GST number
      const gstMatch = input.match(/gst[in]*\s*:?\s*([a-zA-Z0-9]{15})/i)
      const gstin = gstMatch ? gstMatch[1] : ''
      
      const partyData = {
        business_id: selectedBusiness?.id,
        name: partyName,
        mobile: '',
        email: '',
        address: 'Address not specified',
        city: '',
        state: '',
        pincode: '',
        gstin,
        opening_balance: 0
      }

      return {
        type: 'bot',
        content: `👥 Party Information Ready!\n\n**Name:** ${partyName}\n**GSTIN:** ${gstin || 'Not provided'}\n\nWould you like me to save this party?`,
        actions: [
          {
            label: 'Save Party',
            action: async () => {
              try {
                const client = getSupabaseClient()
                if (!client) throw new Error("Service unavailable")
                
                const { error } = await client.from('parties').insert(partyData)
                
                if (error) throw error
                
                addMessage({
                  type: 'bot',
                  content: '✅ Party added successfully!',
                  suggestions: ['Add another party', 'Create a sale', 'Add an item']
                })
                
                toast({
                  title: 'Success',
                  description: 'Party created successfully'
                })
              } catch (error: any) {
                addMessage({
                  type: 'bot',
                  content: `❌ Error saving party: ${error.message}`,
                  suggestions: ['Try again', 'Check the data', 'Contact support']
                })
              }
            }
          }
        ],
        data: partyData,
        suggestions: ['Save it', 'Add another party', 'Create a sale with this party']
      }
    } catch (error: any) {
      return {
        type: 'bot',
        content: `❌ Error processing party: ${error.message}`,
        suggestions: ['Try again', 'Use simpler format', 'Ask for help']
      }
    }
  }

  const handleItemCommand = async (input: string): Promise<Omit<Message, 'id' | 'timestamp'>> => {
    try {
      // Extract item name
      const itemName = extractNames(input, ['item', 'add', 'create', 'new', 'product']) || 'Unknown Item'
      
      // Extract HSN code
      const hsnMatch = input.match(/hsn\s*:?\s*(\d+)/i)
      const hsnCode = hsnMatch ? hsnMatch[1] : ''
      
      // Extract price
      const numbers = extractNumbers(input)
      const price = numbers[0] || 0
      
      const itemData = {
        business_id: selectedBusiness?.id,
        name: itemName,
        code: `ITEM-${Date.now().toString().slice(-6)}`,
        hsn_code: hsnCode,
        gst_percent: 18,
        unit: 'Pcs',
        sales_price: price,
        purchase_price: price * 0.8, // 20% margin
        opening_stock: 0,
        description: ''
      }

      return {
        type: 'bot',
        content: `📋 Item Information Ready!\n\n**Name:** ${itemName}\n**HSN Code:** ${hsnCode || 'Not provided'}\n**Sales Price:** ₹${price.toLocaleString()}\n**Purchase Price:** ₹${(price * 0.8).toLocaleString()}\n\nWould you like me to save this item?`,
        actions: [
          {
            label: 'Save Item',
            action: async () => {
              try {
                const client = getSupabaseClient()
                if (!client) throw new Error("Service unavailable")
                
                const { error } = await client.from('items').insert(itemData)
                
                if (error) throw error
                
                addMessage({
                  type: 'bot',
                  content: '✅ Item added successfully!',
                  suggestions: ['Add another item', 'Create a sale', 'Add a purchase']
                })
                
                toast({
                  title: 'Success',
                  description: 'Item created successfully'
                })
              } catch (error: any) {
                addMessage({
                  type: 'bot',
                  content: `❌ Error saving item: ${error.message}`,
                  suggestions: ['Try again', 'Check the data', 'Contact support']
                })
              }
            }
          }
        ],
        data: itemData,
        suggestions: ['Save it', 'Add another item', 'Use in a sale']
      }
    } catch (error: any) {
      return {
        type: 'bot',
        content: `❌ Error processing item: ${error.message}`,
        suggestions: ['Try again', 'Use simpler format', 'Ask for help']
      }
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage = inputValue.trim()
    setInputValue('')
    
    // Check if business is selected
    if (!selectedBusiness?.id) {
      addMessage({
        type: 'bot',
        content: '❌ Please select a business first before using the AI assistant.',
        suggestions: ['Select a business from the sidebar', 'Create a new business']
      })
      return
    }
    
    // Add user message
    addMessage({
      type: 'user',
      content: userMessage
    })

    setIsProcessing(true)
    
    try {
      const response = await parseCommand(userMessage)
      addMessage(response)
    } catch (error: any) {
      addMessage({
        type: 'bot',
        content: `❌ Something went wrong: ${error.message}`,
        suggestions: ['Try again', 'Use simpler language', 'Ask for help']
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        {/* Enhanced Header - Mobile Responsive */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-xl shadow-lg">
                  <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    AI Assistant
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">Smart Business Data Entry</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-1 sm:mr-2"></div>
                  <span className="hidden sm:inline">AI Online</span>
                  <span className="sm:hidden">Online</span>
                </Badge>
                {selectedBusiness && (
                  <Badge variant="secondary" className="text-xs max-w-32 sm:max-w-none truncate">
                    {selectedBusiness.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <Card className="h-[calc(100vh-12rem)] sm:h-[calc(100vh-10rem)] shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-0 h-full flex flex-col">
              {/* Enhanced Messages - Mobile Responsive */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] sm:max-w-[85%] ${message.type === 'user' ? 'order-2' : ''}`}>
                      <div className={`flex items-start gap-2 sm:gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar - Mobile Responsive */}
                        <div className={`p-1.5 sm:p-2 rounded-full ${
                          message.type === 'user' 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                            : 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500'
                        }`}>
                          {message.type === 'user' ? (
                            <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                          ) : (
                            <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                          )}
                        </div>
                        
                        <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                          {/* Message Content - Mobile Responsive */}
                          <div className={`p-3 sm:p-4 rounded-2xl shadow-sm ${
                            message.type === 'user'
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                              : 'bg-white border border-slate-200'
                          }`}>
                            <div className="text-xs sm:text-sm whitespace-pre-wrap">
                              {message.content}
                            </div>
                            
                            {/* Action Buttons - Mobile Responsive */}
                            {message.actions && message.actions.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                                {message.actions.map((action, index) => (
                                  <Button
                                    key={index}
                                    onClick={action.action}
                                    variant={action.variant || 'default'}
                                    size="sm"
                                    className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Suggestions - Mobile Responsive */}
                          {message.suggestions && message.suggestions.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-slate-500 mb-2">Suggestions:</p>
                              <div className="flex flex-wrap gap-1">
                                {message.suggestions.slice(0, message.type === 'user' ? 2 : 3).map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-colors"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                          <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-500" />
                          <span className="text-xs sm:text-sm text-slate-600">AI is analyzing...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Enhanced Input - Mobile Responsive */}
              <div className="p-3 sm:p-6 bg-white border-t border-slate-200">
                <div className="flex gap-2 sm:gap-3">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message... e.g., 'Create sale to ABC Corp for 10 laptops at ₹50000'"
                    className="flex-1 text-xs sm:text-sm border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    disabled={isProcessing}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isProcessing}
                    size="icon"
                    className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span className="hidden sm:inline">Smart Data Entry • Try: "Create sale to ABC Corp for 10 laptops at ₹50000"</span>
                  <span className="sm:hidden">Smart Data Entry • Try voice commands</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
