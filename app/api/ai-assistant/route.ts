import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, businessId } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Simple fallback response without OpenAI
    const fallbackResponse = {
      message: `🤖 AI Assistant is currently unavailable. 
      
However, you can:
• Create sales invoices from the Sales Entry page
• Manage customers and suppliers in the Party section
• Add products and services in the Items section
• View reports in the Reports section
• Upload bulk data using CSV templates

How can I help you navigate the system?`,
      action: "general",
      confidence: 0.8,
      suggestions: [
        "Visit Sales Entry to create invoices",
        "Go to Party section to manage customers",
        "Check Items to manage products",
        "Use Reports for business insights"
      ]
    }

    return NextResponse.json(fallbackResponse)

  } catch (error: any) {
    console.error('AI Assistant Error:', error)
    
    return NextResponse.json({
      message: `🤖 Service temporarily unavailable. Please use the navigation menu to access different features.`,
      action: "error",
      confidence: 0,
      suggestions: ["Use the main navigation menu", "Try refreshing the page"]
    }, { status: 500 })
  }
}