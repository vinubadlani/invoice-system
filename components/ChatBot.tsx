'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, X, Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSupabaseClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Business } from '@/lib/types'

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
}

interface ChatBotProps {
  selectedBusiness: Business | null
  onAction?: (action: string, data: any) => void
}

export default function ChatBot({ selectedBusiness, onAction }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: '👋 Hi! I can help you create purchases, sales, add parties, and manage your business data. Try saying something like:\n\n• "Add purchase from ABC Suppliers for 5 laptops at ₹50000 each"\n• "Create sale to John Doe for 2 widgets at ₹1500"\n• "Add party named Tech Solutions with GST 27ABCDE1234F1Z5"\n• "Add item laptop with HSN 8471 at ₹50000"',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

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
  }

  const parseCommand = async (input: string) => {
    const client = getSupabaseClient()
    if (!client) {
      throw new Error('Database not available')
    }

    const lowerInput = input.toLowerCase()
    
    // Parse purchase commands
    if (lowerInput.includes('purchase') || lowerInput.includes('buy')) {
      return await handlePurchaseCommand(input, client)
    }
    
    // Parse sales commands
    if (lowerInput.includes('sale') || lowerInput.includes('sell') || lowerInput.includes('invoice')) {
      return await handleSaleCommand(input, client)
    }
    
    // Parse party commands
    if (lowerInput.includes('add party') || lowerInput.includes('create party') || lowerInput.includes('new party')) {
      return await handlePartyCommand(input, client)
    }
    
    // Parse item commands
    if (lowerInput.includes('add item') || lowerInput.includes('create item') || lowerInput.includes('new item')) {
      return await handleItemCommand(input, client)
    }
    
    // Default help response
    return {
      content: "I can help you with:\n\n📦 **Purchases**: 'Add purchase from [supplier] for [quantity] [item] at ₹[price]'\n\n💰 **Sales**: 'Create sale to [customer] for [quantity] [item] at ₹[price]'\n\n👥 **Parties**: 'Add party [name] with GST [gstin]'\n\n📋 **Items**: 'Add item [name] with HSN [code] at ₹[price]'\n\nTry being more specific with quantities, prices, and names!"
    }
  }

  const extractNumbers = (text: string) => {
    const numbers = text.match(/\d+(?:\.\d+)?/g)
    return numbers ? numbers.map(n => parseFloat(n)) : []
  }

  const extractNames = (text: string, keywords: string[]) => {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}\\s+([^\\d\\n,]+?)(?:\\s+(?:for|with|at|\\d)|$)`, 'i')
      const match = text.match(regex)
      if (match) {
        return match[1].trim()
      }
    }
    return null
  }

  const handlePurchaseCommand = async (input: string, client: any) => {
    try {
      // Extract supplier name
      const supplierName = extractNames(input, ['from', 'supplier']) || 'Unknown Supplier'
      
      // Extract item name
      const itemName = extractNames(input, ['for', 'item', 'product']) || 'Unknown Item'
      
      // Extract numbers (quantity and price)
      const numbers = extractNumbers(input)
      const quantity = numbers[0] || 1
      const price = numbers[1] || 0
      
      // Calculate totals
      const subtotal = quantity * price
      const gstPercent = 18 // Default GST
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
        items: [{
          item_name: itemName,
          quantity,
          rate: price,
          gst_percent: gstPercent,
          gst_amount: gstAmount,
          total_amount: subtotal + gstAmount
        }],
        type: 'purchase'
      }

      return {
        content: `🛒 **Purchase Order Created!**\n\n**Supplier:** ${supplierName}\n**Item:** ${itemName}\n**Quantity:** ${quantity}\n**Rate:** ₹${price.toLocaleString()}\n**Subtotal:** ₹${subtotal.toLocaleString()}\n**GST (${gstPercent}%):** ₹${gstAmount.toLocaleString()}\n**Total:** ₹${total.toLocaleString()}`,
        actions: [
          {
            label: 'Save Purchase',
            action: async () => {
              try {
                const { error } = await client.from('invoices').insert([purchaseData])
                if (error) throw error
                
                addMessage({
                  type: 'bot',
                  content: '✅ Purchase saved successfully!',
                })
                
                toast({
                  title: 'Success',
                  description: 'Purchase created successfully'
                })
                
                onAction?.('purchase_created', purchaseData)
              } catch (error: any) {
                addMessage({
                  type: 'bot',
                  content: `❌ Error saving purchase: ${error.message}`,
                })
              }
            }
          },
          {
            label: 'Edit Details',
            variant: 'outline' as const,
            action: () => {
              addMessage({
                type: 'bot',
                content: 'You can modify the purchase by saying: "Change quantity to X" or "Change price to ₹Y"'
              })
            }
          }
        ],
        data: purchaseData
      }
    } catch (error: any) {
      return {
        content: `❌ Error processing purchase: ${error.message}`
      }
    }
  }

  const handleSaleCommand = async (input: string, client: any) => {
    try {
      // Extract customer name
      const customerName = extractNames(input, ['to', 'customer', 'client']) || 'Walk-in Customer'
      
      // Extract item name
      const itemName = extractNames(input, ['for', 'item', 'product']) || 'Unknown Item'
      
      // Extract numbers
      const numbers = extractNumbers(input)
      const quantity = numbers[0] || 1
      const price = numbers[1] || 0
      
      // Calculate totals
      const subtotal = quantity * price
      const gstPercent = 18
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
        items: [{
          item_name: itemName,
          quantity,
          rate: price,
          gst_percent: gstPercent,
          gst_amount: gstAmount,
          total_amount: subtotal + gstAmount
        }],
        type: 'sales'
      }

      return {
        content: `💰 **Sales Invoice Created!**\n\n**Customer:** ${customerName}\n**Item:** ${itemName}\n**Quantity:** ${quantity}\n**Rate:** ₹${price.toLocaleString()}\n**Subtotal:** ₹${subtotal.toLocaleString()}\n**GST (${gstPercent}%):** ₹${gstAmount.toLocaleString()}\n**Total:** ₹${total.toLocaleString()}`,
        actions: [
          {
            label: 'Save Invoice',
            action: async () => {
              try {
                const { error } = await client.from('invoices').insert([saleData])
                if (error) throw error
                
                addMessage({
                  type: 'bot',
                  content: '✅ Sales invoice saved successfully!',
                })
                
                toast({
                  title: 'Success',
                  description: 'Sales invoice created successfully'
                })
                
                onAction?.('sale_created', saleData)
              } catch (error: any) {
                addMessage({
                  type: 'bot',
                  content: `❌ Error saving invoice: ${error.message}`,
                })
              }
            }
          }
        ],
        data: saleData
      }
    } catch (error: any) {
      return {
        content: `❌ Error processing sale: ${error.message}`
      }
    }
  }

  const handlePartyCommand = async (input: string, client: any) => {
    try {
      // Extract party name
      const partyName = extractNames(input, ['party', 'add', 'create', 'new']) || 'Unknown Party'
      
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
        content: `👥 **New Party Ready!**\n\n**Name:** ${partyName}\n**GSTIN:** ${gstin || 'Not provided'}\n**Type:** Supplier/Customer`,
        actions: [
          {
            label: 'Save Party',
            action: async () => {
              try {
                const { error } = await client.from('parties').insert([partyData])
                if (error) throw error
                
                addMessage({
                  type: 'bot',
                  content: '✅ Party added successfully!',
                })
                
                toast({
                  title: 'Success',
                  description: 'Party created successfully'
                })
                
                onAction?.('party_created', partyData)
              } catch (error: any) {
                addMessage({
                  type: 'bot',
                  content: `❌ Error saving party: ${error.message}`,
                })
              }
            }
          }
        ],
        data: partyData
      }
    } catch (error: any) {
      return {
        content: `❌ Error processing party: ${error.message}`
      }
    }
  }

  const handleItemCommand = async (input: string, client: any) => {
    try {
      // Extract item name
      const itemName = extractNames(input, ['item', 'product', 'add', 'create']) || 'Unknown Item'
      
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
        content: `📋 **New Item Ready!**\n\n**Name:** ${itemName}\n**HSN Code:** ${hsnCode || 'Not provided'}\n**Sales Price:** ₹${price.toLocaleString()}\n**Purchase Price:** ₹${(price * 0.8).toLocaleString()}`,
        actions: [
          {
            label: 'Save Item',
            action: async () => {
              try {
                const { error } = await client.from('items').insert([itemData])
                if (error) throw error
                
                addMessage({
                  type: 'bot',
                  content: '✅ Item added successfully!',
                })
                
                toast({
                  title: 'Success',
                  description: 'Item created successfully'
                })
                
                onAction?.('item_created', itemData)
              } catch (error: any) {
                addMessage({
                  type: 'bot',
                  content: `❌ Error saving item: ${error.message}`,
                })
              }
            }
          }
        ],
        data: itemData
      }
    } catch (error: any) {
      return {
        content: `❌ Error processing item: ${error.message}`
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
        content: '❌ Please select a business first before using the AI assistant.'
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
      addMessage({
        type: 'bot',
        ...response
      })
    } catch (error: any) {
      addMessage({
        type: 'bot',
        content: `❌ Something went wrong: ${error.message}`
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

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-blue-600 text-white rounded-t-lg">
        <CardTitle className="text-lg font-semibold">AI Assistant</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 text-white hover:bg-blue-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg whitespace-pre-line ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.content}
                
                {message.actions && (
                  <div className="mt-3 space-y-2">
                    {message.actions.map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={action.variant || 'default'}
                        onClick={action.action}
                        className="w-full"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Processing...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your command..."
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
