import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSupabaseClient } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are HisabKitaab AI Assistant, an expert business automation AI for an Invoice Management System. You help users manage their business operations through natural language.

**CAPABILITIES:**
1. Create sales invoices and purchase entries
2. Add customers/suppliers (parties) 
3. Manage inventory items
4. Modify transactions (GST, quantity, price)
5. Generate reports and analytics
6. Provide business insights
7. Handle complex accounting queries

**BUSINESS CONTEXT:**
- GST calculations (default 18%, can be modified)
- Indian currency (₹)
- Invoice numbering system
- Party management (customers/suppliers)
- Item/inventory tracking
- Payment tracking

**SECURITY RULES:**
- NEVER allow database deletion or formatting
- NEVER expose sensitive data
- Only perform user-authorized operations
- Always confirm before saving data

**RESPONSE FORMAT:**
Always respond with JSON in this structure:
{
  "message": "Human-readable response",
  "action": "create_sale|create_purchase|add_party|add_item|modify_transaction|report|general",
  "data": {...}, // Only if creating/modifying data
  "confidence": 0.9, // How confident you are about the interpretation
  "suggestions": ["Follow-up action 1", "Follow-up action 2"]
}

**EXAMPLES:**
User: "Create sale to John for 5 laptops at ₹50000 each"
Response: 
{
  "message": "💰 Sales Invoice Ready!\n\n**Customer:** John\n**Item:** Laptops\n**Quantity:** 5\n**Unit Price:** ₹50,000\n**Subtotal:** ₹2,50,000\n**GST (18%):** ₹45,000\n**Total:** ₹2,95,000\n\nWould you like me to save this invoice?",
  "action": "create_sale",
  "data": {
    "party_name": "John",
    "items": [{"item_name": "Laptops", "quantity": 5, "price": 50000, "total": 250000}],
    "subtotal": 250000,
    "gst_percent": 18,
    "total_tax": 45000,
    "net_total": 295000
  },
  "confidence": 0.95,
  "suggestions": ["Modify GST rate", "Add customer details", "Create another invoice"]
}

Be conversational, helpful, and always confirm before taking actions that save data.`

export async function POST(request: NextRequest) {
  try {
    const { message, businessId, conversationHistory } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Get business context
    const client = getSupabaseClient()
    if (!client) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    const { data: business } = await client
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    // Get recent data for context
    const [salesData, purchaseData, partiesData, itemsData] = await Promise.all([
      client.from('sales_invoices').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(5),
      client.from('purchase_invoices').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(5),
      client.from('parties').select('*').eq('business_id', businessId).limit(10),
      client.from('items').select('*').eq('business_id', businessId).limit(10)
    ])

    const contextPrompt = `
**CURRENT BUSINESS:** ${business?.name || 'Unknown Business'}
**BUSINESS LOCATION:** ${business?.city}, ${business?.state}

**RECENT CONTEXT:**
Recent Sales: ${salesData.data?.length || 0} invoices
Recent Purchases: ${purchaseData.data?.length || 0} entries  
Parties: ${partiesData.data?.length || 0} customers/suppliers
Items: ${itemsData.data?.length || 0} products

**CONVERSATION HISTORY:** ${JSON.stringify(conversationHistory?.slice(-3) || [])}

**USER MESSAGE:** "${message}"

Please provide a helpful response following the JSON format specified in the system prompt.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contextPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    })

    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    let parsedResponse
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch (e) {
      // Fallback if JSON parsing fails
      parsedResponse = {
        message: aiResponse,
        action: "general",
        confidence: 0.8,
        suggestions: ["Try rephrasing your request", "Be more specific"]
      }
    }

    return NextResponse.json(parsedResponse)

  } catch (error: any) {
    console.error('AI Assistant Error:', error)
    
    return NextResponse.json({
      message: `🤖 I encountered an issue: ${error.message}. Please try rephrasing your request.`,
      action: "error",
      confidence: 0,
      suggestions: ["Try a simpler command", "Check your internet connection"]
    }, { status: 500 })
  }
}