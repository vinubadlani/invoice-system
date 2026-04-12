import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient, getCurrentUser } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { businessId, template } = body

    if (!businessId || !template) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const client = getSupabaseClient()
    if (!client) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Call RPC to save template
    const { data, error } = await client.rpc("rpc_create_custom_template", {
      p_business_id: businessId,
      p_user_id: user.id,
      p_name: template.name,
      p_description: template.description,
      p_template_json: template,
    })

    if (error) {
      console.error("RPC error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to save template" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data?.[0],
    })
  } catch (error: any) {
    console.error("Error saving template:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get("businessId")

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId parameter" },
        { status: 400 }
      )
    }

    const client = getSupabaseClient()
    if (!client) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Call RPC to get templates
    const { data, error } = await client.rpc("rpc_get_custom_templates", {
      p_business_id: businessId,
    })

    if (error) {
      console.error("RPC error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to fetch templates" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error: any) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
