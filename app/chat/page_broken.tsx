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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }

  // Natural language parsing functions
  const extractNumbers = (text: string): number[] => {
    const matches = text.match(/\d+\.?\d*/g)
    return matches ? matches.map(Number) : []
  }

  const extractNames = (text: string, skipWords: string[]): string | null => {
    const words = text.split(/\s+/)
    const skipSet = new Set(skipWords.concat(['from', 'to', 'for', 'at', 'with', 'named', 'add', 'create', 'new', 'the', 'a', 'an', 'of']))
    
    let name = ''
    let collecting = false
    let foundSkipWord = false
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const nextWord = words[i + 1]
      
      // Start collecting after relevant keywords
      if (skipWords.some(skip => word.toLowerCase().includes(skip.toLowerCase()))) {
        foundSkipWord = true
        continue
      }
      
      // Stop collecting when we hit price indicators or quantity
      if (collecting && (word.match(/^(for|at|with|₹|\d+$|each|per)/i) || 
          (word.toLowerCase() === 'of' && nextWord && nextWord.match(/^\d/)))) {
        break
      }
      
      // Collect names after skip words, avoiding numbers and currency
      if ((foundSkipWord || collecting) && 
          !skipSet.has(word.toLowerCase()) && 
          !word.match(/^\d/) && 
          !word.includes('₹') &&
          !word.match(/^(each|per|piece|pcs)$/i)) {
        collecting = true
        name += (name ? ' ' : '') + word
      }
    }
    
    return name.trim() || null
  }

  const handleModificationCommand = async (input: string): Promise<Omit<Message, 'id' | 'timestamp'>> => {
    if (!lastTransaction) {
      return {
        type: 'bot',
        content: '❌ No recent transaction to modify. Please create a sale or purchase first.',
        suggestions: ['Create a sale', 'Add a purchase', 'Create an item']
      }
    }

    const lowerInput = input.toLowerCase()
    let modified = { ...lastTransaction }
    let changeDescription = ''

    try {
      // Handle GST changes
      if (lowerInput.includes('gst') || lowerInput.includes('tax')) {
        const gstMatch = input.match(/(\d+(?:\.\d+)?)\s*%?/i)
        if (gstMatch) {
          const newGstPercent = parseFloat(gstMatch[1])
          const subtotal = modified.subtotal
          const gstAmount = (subtotal * newGstPercent) / 100
          const total = subtotal + gstAmount
          
          modified.gst_percent = newGstPercent
          modified.total_tax = gstAmount
          modified.net_total = total
          modified.balance_due = total - (modified.payment_received || 0)
          
          changeDescription = `GST updated to ${newGstPercent}%`
        }
      }
      
      // Handle quantity changes
      else if (lowerInput.includes('quantity')) {
        const numbers = extractNumbers(input)
        if (numbers.length > 0) {
          const newQuantity = numbers[0]
          const price = modified.items[0].price
          const subtotal = newQuantity * price
          const gstAmount = (subtotal * (modified.gst_percent || 18)) / 100
          const total = subtotal + gstAmount
          
          modified.items[0].quantity = newQuantity
          modified.items[0].total = subtotal
          modified.subtotal = subtotal
          modified.total_tax = gstAmount
          modified.net_total = total
          modified.balance_due = total - (modified.payment_received || 0)
          
          changeDescription = `Quantity updated to ${newQuantity}`
        }
      }
      
      // Handle price changes
      else if (lowerInput.includes('price')) {
        const numbers = extractNumbers(input)
        if (numbers.length > 0) {
          const newPrice = numbers[0]
          const quantity = modified.items[0].quantity
          const subtotal = quantity * newPrice
          const gstAmount = (subtotal * (modified.gst_percent || 18)) / 100
          const total = subtotal + gstAmount
          
          modified.items[0].price = newPrice
          modified.items[0].total = subtotal
          modified.subtotal = subtotal
          modified.total_tax = gstAmount
          modified.net_total = total
          modified.balance_due = total - (modified.payment_received || 0)
          
          changeDescription = `Price updated to ₹${newPrice.toLocaleString()}`
        }
      }

      setLastTransaction(modified)

      const transactionType = conversationContext === 'purchase' ? 'Purchase' : 'Sale'
      const emoji = conversationContext === 'purchase' ? '📦' : '🛒'
      
      return {
        type: 'bot',
        content: `${emoji} ${transactionType} Updated!\n\n${changeDescription}\n\n**Customer/Supplier:** ${modified.party_name}\n**Item:** ${modified.items[0].item_name}\n**Quantity:** ${modified.items[0].quantity}\n**Price:** ₹${modified.items[0].price.toLocaleString()}\n**Subtotal:** ₹${modified.subtotal.toLocaleString()}\n**GST (${modified.gst_percent || 18}%):** ₹${modified.total_tax.toLocaleString()}\n**Total:** ₹${modified.net_total.toLocaleString()}\n\nWould you like me to save this updated ${transactionType.toLowerCase()}?`,
        actions: [
          {
            label: `Save ${transactionType}`,
            action: async () => {
              try {
                const client = getSupabaseClient()
                if (!client) throw new Error("Service unavailable")
                
                const tableName = conversationContext === 'purchase' ? 'purchase_invoices' : 'sales_invoices'
                const { error } = await client.from(tableName).insert(modified)
                
                if (error) throw error
                
                addMessage({
                  type: 'bot',
                  content: `✅ ${transactionType} saved successfully!`,
                  suggestions: ['Create another entry', 'Add a party', 'Add an item']
                })
                
                toast({
                  title: 'Success',
                  description: `${transactionType} entry created successfully`
                })
                
                setLastTransaction(null)
                setConversationContext('')
              } catch (error: any) {
                addMessage({
                  type: 'bot',
                  content: `❌ Error saving ${transactionType.toLowerCase()}: ${error.message}`,
                  suggestions: ['Try again', 'Check the data', 'Contact support']
                })
              }
            }
          }
        ],
        data: modified,
        suggestions: ['Save it', 'Change something else', 'Start over']
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
      
      // Extract numbers
      const numbers = extractNumbers(input)
      const quantity = numbers[0] || 1
      const price = numbers[1] || numbers[0] || 0
      
      // Default GST
      const gstPercent = 18
      
      // Calculate totals
      const subtotal = quantity * price
      const gstAmount = (subtotal * gstPercent) / 100
      const total = subtotal + gstAmount
      
      const saleData = {
        business_id: selectedBusiness?.id,
        invoice_no: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        party_name: customerName,
        address: 'Address not specified',
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
        content: `🛒 Sales Invoice Ready!\n\n**Customer:** ${customerName}\n**Item:** ${itemName}\n**Quantity:** ${quantity}\n**Price:** ₹${price.toLocaleString()}\n**Subtotal:** ₹${subtotal.toLocaleString()}\n**GST (${gstPercent}%):** ₹${gstAmount.toLocaleString()}\n**Total:** ₹${total.toLocaleString()}\n\nWould you like me to save this sale?\n\n*You can also say: "Change GST to 5%" or "Update quantity to 10"*`,
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
                  suggestions: ['Create another sale', 'Add a purchase', 'Add a customer']
                })
                
                toast({
                  title: 'Success',
                  description: 'Sales invoice created successfully'
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

  if (!selectedBusiness) {
    return (
      <AuthenticatedLayout>
        <div className="text-center py-8 sm:py-12 px-4">
          <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Business Selected</h2>
          <p className="text-sm sm:text-base text-gray-500">Please select a business to use the AI assistant</p>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-6xl mx-auto p-2 sm:p-6">
          {/* Enhanced Header - Mobile Responsive */}
          <div className="mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="relative p-2 sm:p-3 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-xl shadow-lg">
                <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="flex-1">
                <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  HisabKitaab AI Assistant
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                  Smart Data Entry • {selectedBusiness.name}
                </p>
              </div>
              <div className="sm:ml-auto">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow">
                <CardContent className="p-2 sm:p-4 text-center">
                  <div className="text-lg sm:text-2xl mb-1 sm:mb-2">💰</div>
                  <p className="text-xs sm:text-sm font-medium text-blue-800">Smart Sales</p>
                  <p className="text-xs text-blue-600 hidden sm:block">AI-powered invoicing</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:shadow-md transition-shadow">
                <CardContent className="p-2 sm:p-4 text-center">
                  <div className="text-lg sm:text-2xl mb-1 sm:mb-2">📦</div>
                  <p className="text-xs sm:text-sm font-medium text-emerald-800">Auto Purchases</p>
                  <p className="text-xs text-emerald-600 hidden sm:block">Intelligent entry</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
                <CardContent className="p-2 sm:p-4 text-center">
                  <div className="text-lg sm:text-2xl mb-1 sm:mb-2">🧠</div>
                  <p className="text-xs sm:text-sm font-medium text-purple-800">Smart Analysis</p>
                  <p className="text-xs text-purple-600 hidden sm:block">Business insights</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-md transition-shadow">
                <CardContent className="p-2 sm:p-4 text-center">
                  <div className="text-lg sm:text-2xl mb-1 sm:mb-2">📊</div>
                  <p className="text-xs sm:text-sm font-medium text-orange-800">AI Reports</p>
                  <p className="text-xs text-orange-600 hidden sm:block">Instant analytics</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Enhanced Chat Interface - Mobile Responsive */}
          <Card className="h-[70vh] sm:h-[600px] flex flex-col shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-t-lg p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 sm:gap-3">
                <div className="relative">
                  <Brain className="h-5 w-5 sm:h-6 sm:w-6" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <span className="text-sm sm:text-base">Smart AI Assistant</span>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs hidden sm:inline-flex">
                  Natural Language
                </Badge>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages - Mobile Responsive */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-2 sm:space-y-4 bg-gradient-to-b from-white to-slate-50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[85%] p-3 sm:p-4 rounded-2xl shadow-sm ${
                        message.type === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                          : 'bg-white border border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className={`p-1.5 sm:p-2 rounded-full ${
                          message.type === 'user' 
                            ? 'bg-white/20' 
                            : 'bg-gradient-to-br from-blue-500 to-purple-600'
                        }`}>
                          {message.type === 'user' ? (
                            <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                          ) : (
                            <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                            message.type === 'user' ? 'text-white' : 'text-slate-700'
                          }`}>
                            {message.content}
                          </p>
                          

                          
                                                    
                          {/* Action buttons - Mobile Responsive */}
                          {message.actions && (
                            <div className="flex flex-col sm:flex-row gap-2 mt-3">
                              {message.actions.map((action, index) => (
                                <Button
                                  key={index}
                                  size="sm"
                                  variant={action.variant || 'default'}
                                  onClick={action.action}
                                  className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 w-full sm:w-auto"
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                          
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
